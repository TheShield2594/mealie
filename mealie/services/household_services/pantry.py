from collections import defaultdict
from collections.abc import Iterable
from datetime import date

from pydantic import UUID4
from sqlalchemy import delete, insert, or_, select

from mealie.core.exceptions import NoEntryFound
from mealie.db.models.household.pantry import HouseholdPantryItem
from mealie.db.models.recipe.ingredient import households_to_ingredient_foods
from mealie.repos.repository_factory import AllRepositories
from mealie.schema.household.group_shopping_list import ShoppingListItemCreate, ShoppingListItemsCollectionOut
from mealie.schema.household.pantry import (
    PantryAddFromShoppingListIn,
    PantryAddFromShoppingListOut,
    PantryItemCreate,
    PantryItemOut,
    PantryItemSave,
    PantryUsageItemOut,
    PantryUsageOut,
    PantryUsageStatus,
    PantryUseIn,
    PantryUseOut,
)
from mealie.schema.recipe.recipe import Recipe
from mealie.schema.recipe.recipe_ingredient import IngredientUnit
from mealie.schema.response.pagination import PaginationQuery
from mealie.services._base_service import BaseService
from mealie.services.household_services.shopping_lists import ShoppingListService
from mealie.services.parser_services.parser_utils import UnitConverter

# quantities closer to zero than this count as zero, so float error doesn't leave crumbs behind
EPSILON = 1e-6


def convert_quantity(quantity: float, from_unit: IngredientUnit | None, to_unit: IngredientUnit | None) -> float | None:
    """
    Convert a quantity between two units, using their standardized unit data.
    Returns None when the units can't be converted, e.g. grams into cups.
    """

    if (from_unit.id if from_unit else None) == (to_unit.id if to_unit else None):
        return quantity
    if not (from_unit and to_unit):
        return None
    if not (from_unit.standard_quantity and from_unit.standard_unit):
        return None
    if not (to_unit.standard_quantity and to_unit.standard_unit):
        return None

    uc = UnitConverter()
    if not uc.can_convert(from_unit.standard_unit, to_unit.standard_unit):
        return None

    converted, _ = uc.convert(quantity * from_unit.standard_quantity, from_unit.standard_unit, to_unit.standard_unit)
    return converted / to_unit.standard_quantity


def _use_order(item: PantryItemOut) -> tuple[bool, date, float]:
    """Use what expires first, then what was bought first"""
    created = item.created_at.timestamp() if item.created_at else 0
    return (item.expires_on is None, item.expires_on or date.max, created)


class PantryService(BaseService):
    def __init__(self, repos: AllRepositories, group_id: UUID4, household_id: UUID4):
        self.repos = repos
        self.group_id = group_id
        self.household_id = household_id
        self.pantry = repos.household_pantry_items
        super().__init__()

    # ==================================================================================================================
    # Helpers

    def _all_items(self, food_ids: Iterable[UUID4] | None = None) -> list[PantryItemOut]:
        items = self.pantry.page_all(PaginationQuery(per_page=-1)).items
        if food_ids is not None:
            wanted = set(food_ids)
            items = [item for item in items if item.food_id in wanted]
        return sorted(items, key=_use_order)

    def _validate_references(self, data: PantryItemCreate) -> None:
        if not self.repos.ingredient_foods.get_one(data.food_id):
            raise NoEntryFound("Food not found")
        if data.unit_id and not self.repos.ingredient_units.get_one(data.unit_id):
            raise NoEntryFound("Unit not found")

    def sync_on_hand(self, food_ids: Iterable[UUID4]) -> None:
        """
        Marks a food as on hand for the household while the pantry has some of it, and clears the
        mark once it runs out. The recipe finder and shopping lists read the on hand mark.
        """

        session = self.repos.session
        link = households_to_ingredient_foods.c
        for food_id in set(food_ids):
            in_stock = session.execute(
                select(HouseholdPantryItem.id)
                .where(
                    HouseholdPantryItem.household_id == self.household_id,
                    HouseholdPantryItem.food_id == food_id,
                    or_(HouseholdPantryItem.quantity.is_(None), HouseholdPantryItem.quantity > EPSILON),
                )
                .limit(1)
            ).first()
            marked = session.execute(
                select(link.food_id).where(link.household_id == self.household_id, link.food_id == food_id).limit(1)
            ).first()

            if in_stock and not marked:
                session.execute(
                    insert(households_to_ingredient_foods).values(household_id=self.household_id, food_id=food_id)
                )
            elif marked and not in_stock:
                session.execute(
                    delete(households_to_ingredient_foods).where(
                        link.household_id == self.household_id, link.food_id == food_id
                    )
                )

        session.commit()

    def _reload(self, item_id: UUID4) -> PantryItemOut:
        # the food's on hand households may have changed since the item was loaded
        self.repos.session.expire_all()
        item = self.pantry.get_one(item_id)
        if not item:
            raise NoEntryFound("Pantry item not found")
        return item

    # ==================================================================================================================
    # CRUD

    def create_one(self, data: PantryItemCreate) -> PantryItemOut:
        self._validate_references(data)
        item = self.pantry.create(data.cast(PantryItemSave, group_id=self.group_id, household_id=self.household_id))
        self.sync_on_hand([item.food_id])
        return self._reload(item.id)

    def update_one(self, item_id: UUID4, data: PantryItemCreate) -> PantryItemOut:
        existing = self.pantry.get_one(item_id)
        if not existing:
            raise NoEntryFound("Pantry item not found")

        self._validate_references(data)
        item = self.pantry.update(
            item_id, data.cast(PantryItemSave, group_id=self.group_id, household_id=self.household_id)
        )
        self.sync_on_hand([existing.food_id, item.food_id])
        return self._reload(item.id)

    def delete_one(self, item_id: UUID4) -> PantryItemOut:
        item = self.pantry.delete(item_id)
        self.sync_on_hand([item.food_id])
        return item

    # ==================================================================================================================
    # Shopping

    def add_from_shopping_list(self, data: PantryAddFromShoppingListIn) -> PantryAddFromShoppingListOut:
        """
        Adds checked shopping list items to the pantry. An item is added to a pantry item for the same
        food when their units convert, otherwise it becomes a new pantry item.
        """

        shopping_list = self.repos.group_shopping_lists.get_one(data.shopping_list_id)
        if not shopping_list:
            raise NoEntryFound("Shopping list not found")

        wanted = set(data.item_ids) if data.item_ids is not None else None
        list_items = [
            item for item in shopping_list.list_items if item.checked and (wanted is None or item.id in wanted)
        ]

        added: list[UUID4] = []
        skipped: list[UUID4] = []
        touched: set[UUID4] = set()
        for list_item in list_items:
            if not list_item.food_id:
                skipped.append(list_item.id)
                continue

            quantity = list_item.quantity or None
            target: PantryItemOut | None = None
            converted: float | None = None
            for pantry_item in self._all_items([list_item.food_id]):
                if pantry_item.quantity is None:
                    # an untracked item already says "we have some"; buying more doesn't change that
                    target = pantry_item
                    break
                if quantity is None:
                    continue
                converted = convert_quantity(quantity, list_item.unit, pantry_item.unit)
                if converted is not None:
                    target = pantry_item
                    break

            if target is None:
                target = self.pantry.create(
                    PantryItemSave(
                        group_id=self.group_id,
                        household_id=self.household_id,
                        food_id=list_item.food_id,
                        unit_id=list_item.unit_id,
                        quantity=quantity,
                    )
                )
            elif target.quantity is not None and converted is not None:
                target.quantity += converted
                self.pantry.update(target.id, target.cast(PantryItemSave))

            added.append(list_item.id)
            touched.add(list_item.food_id)

        self.sync_on_hand(touched)
        self.repos.session.expire_all()
        return PantryAddFromShoppingListOut(
            pantry_items=self._all_items(touched), added_item_ids=added, skipped_item_ids=skipped
        )

    def refill(
        self, shopping_list_id: UUID4, items: list[PantryItemOut] | None = None
    ) -> tuple[list[UUID4], ShoppingListItemsCollectionOut]:
        """
        Puts pantry items below their minimum on a shopping list, enough to get back to the minimum.
        Foods already waiting unchecked on the list are left alone, so refilling twice doesn't double up.
        """

        shopping_list = self.repos.group_shopping_lists.get_one(shopping_list_id)
        if not shopping_list:
            raise NoEntryFound("Shopping list not found")

        on_list = {item.food_id for item in shopping_list.list_items if not item.checked and item.food_id}
        create_items: list[ShoppingListItemCreate] = []
        refilled: list[UUID4] = []
        for item in items if items is not None else self._all_items():
            if not item.is_low or item.food_id in on_list:
                continue

            assert item.minimum_quantity is not None and item.quantity is not None
            create_items.append(
                ShoppingListItemCreate(
                    shopping_list_id=shopping_list_id,
                    food_id=item.food_id,
                    unit_id=item.unit_id,
                    quantity=item.minimum_quantity - item.quantity,
                )
            )
            on_list.add(item.food_id)
            refilled.append(item.food_id)

        if not create_items:
            return [], ShoppingListItemsCollectionOut(created_items=[], updated_items=[], deleted_items=[])

        return refilled, ShoppingListService(self.repos).bulk_create_items(create_items)

    # ==================================================================================================================
    # Cooking

    def get_usage(self, recipe: Recipe, scale: float = 1) -> PantryUsageOut:
        """
        Works out what cooking a recipe takes from the pantry, without changing anything.
        Each ingredient draws on the food's pantry items in use order, so it can span several of them.
        """

        pantry_by_food: dict[UUID4, list[PantryItemOut]] = defaultdict(list)
        for pantry_item in self._all_items():
            pantry_by_food[pantry_item.food_id].append(pantry_item)

        # what's left in each pantry item, as earlier ingredients draw on it
        remaining: dict[UUID4, float | None] = {
            item.id: item.quantity for items in pantry_by_food.values() for item in items
        }

        usage: list[PantryUsageItemOut] = []
        for ingredient in recipe.recipe_ingredient:
            food = ingredient.food
            if ingredient.referenced_recipe or not food or not getattr(food, "id", None):
                continue

            unit = ingredient.unit if isinstance(ingredient.unit, IngredientUnit) else None
            required = ingredient.quantity * scale if ingredient.quantity else None
            base = {
                "ingredient_reference_id": ingredient.reference_id,
                "food": food,
                "required_quantity": required,
                "required_unit": unit,
            }

            pantry_items = pantry_by_food.get(food.id, [])
            if not pantry_items:
                usage.append(PantryUsageItemOut(**base, status=PantryUsageStatus.missing))
                continue

            if required is None:
                usage.append(
                    PantryUsageItemOut(**base, pantry_item=pantry_items[0], status=PantryUsageStatus.untracked)
                )
                continue

            needed = required
            drawn: list[PantryUsageItemOut] = []
            first_untracked: PantryItemOut | None = None
            first_convertible: PantryItemOut | None = None
            for pantry_item in pantry_items:
                left = remaining[pantry_item.id]
                if left is None:
                    first_untracked = first_untracked or pantry_item
                    continue

                ratio = convert_quantity(1, unit, pantry_item.unit)
                if ratio is None:
                    continue
                first_convertible = first_convertible or pantry_item

                take = min(needed * ratio, left)
                if take <= EPSILON:
                    continue

                remaining[pantry_item.id] = left - take
                needed -= take / ratio
                drawn.append(
                    PantryUsageItemOut(**base, pantry_item=pantry_item, quantity=take, status=PantryUsageStatus.ok)
                )
                if needed <= EPSILON:
                    break

            if drawn:
                if needed > EPSILON:
                    drawn[-1].status = PantryUsageStatus.insufficient
                usage.extend(drawn)
            elif first_untracked:
                usage.append(
                    PantryUsageItemOut(**base, pantry_item=first_untracked, status=PantryUsageStatus.untracked)
                )
            elif first_convertible:
                usage.append(
                    PantryUsageItemOut(
                        **base, pantry_item=first_convertible, quantity=0, status=PantryUsageStatus.insufficient
                    )
                )
            else:
                usage.append(
                    PantryUsageItemOut(**base, pantry_item=pantry_items[0], status=PantryUsageStatus.unit_mismatch)
                )

        return PantryUsageOut(recipe_id=recipe.id, scale=scale, items=usage)

    def use(self, data: PantryUseIn) -> tuple[PantryUseOut, ShoppingListItemsCollectionOut | None]:
        """
        Takes the given amounts out of the pantry. Items that run out are removed, unless they have a
        minimum, in which case they stay at zero so they can be restocked.
        """

        used: dict[UUID4, float] = defaultdict(float)
        used_up: set[UUID4] = set()
        for use_item in data.items:
            used[use_item.pantry_item_id] += use_item.quantity
            if use_item.used_up:
                used_up.add(use_item.pantry_item_id)

        kept: list[UUID4] = []
        removed: list[UUID4] = []
        touched: set[UUID4] = set()
        for item_id, quantity in used.items():
            item = self.pantry.get_one(item_id)
            if not item:
                continue

            if item_id in used_up:
                new_quantity = 0.0
            elif item.quantity is None:
                # nothing to subtract from an untracked item
                continue
            else:
                new_quantity = max(item.quantity - quantity, 0.0)
                if new_quantity <= EPSILON:
                    new_quantity = 0.0

            touched.add(item.food_id)
            if new_quantity == 0 and item.minimum_quantity is None:
                self.pantry.delete(item.id)
                removed.append(item.id)
                continue

            item.quantity = new_quantity
            self.pantry.update(item.id, item.cast(PantryItemSave))
            kept.append(item.id)

        self.sync_on_hand(touched)
        self.repos.session.expire_all()
        kept_items = [item for item in (self.pantry.get_one(item_id) for item_id in kept) if item]

        refilled: list[UUID4] = []
        collection: ShoppingListItemsCollectionOut | None = None
        if data.refill_shopping_list_id:
            refilled, collection = self.refill(data.refill_shopping_list_id, kept_items)

        return (
            PantryUseOut(pantry_items=kept_items, removed_item_ids=removed, refilled_food_ids=refilled),
            collection,
        )
