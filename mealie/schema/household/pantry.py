from __future__ import annotations

from datetime import date, datetime
from enum import StrEnum

from pydantic import UUID4, ConfigDict, field_validator
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy.orm.interfaces import LoaderOption

from mealie.db.models.household import HouseholdPantryItem
from mealie.db.models.recipe import IngredientFoodModel, IngredientFoodSubstitutionModel, IngredientUnitModel
from mealie.schema._mealie import MealieModel
from mealie.schema._mealie.mealie_model import UpdatedAtField
from mealie.schema.recipe.recipe_ingredient import IngredientFood, IngredientUnit
from mealie.schema.response.pagination import PaginationBase

# ==================================================================================================================
# CRUD


class PantryItemCreate(MealieModel):
    food_id: UUID4
    unit_id: UUID4 | None = None
    quantity: float | None = None
    """Leave empty when the household has some but doesn't track how much"""
    minimum_quantity: float | None = None
    """Restock when the quantity drops below this, in the item's unit"""
    location: str | None = None
    expires_on: date | None = None
    note: str | None = None

    @field_validator("quantity", "minimum_quantity")
    @classmethod
    def validate_not_negative(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("must not be negative")
        return v

    @field_validator("location", "note")
    @classmethod
    def blank_to_none(cls, v: str | None) -> str | None:
        if v is None:
            return None
        return v.strip() or None


class PantryItemSave(PantryItemCreate):
    group_id: UUID4
    household_id: UUID4


class PantryItemOut(PantryItemSave):
    id: UUID4
    food: IngredientFood
    unit: IngredientUnit | None = None

    created_at: datetime | None = None
    updated_at: datetime | None = UpdatedAtField(None)

    model_config = ConfigDict(from_attributes=True)

    @property
    def is_low(self) -> bool:
        if self.minimum_quantity is None or self.quantity is None:
            return False
        return self.quantity < self.minimum_quantity

    @classmethod
    def loader_options(cls) -> list[LoaderOption]:
        return [
            selectinload(HouseholdPantryItem.food).selectinload(IngredientFoodModel.aliases),
            selectinload(HouseholdPantryItem.food).selectinload(IngredientFoodModel.households_with_ingredient_food),
            selectinload(HouseholdPantryItem.food).joinedload(IngredientFoodModel.extras),
            selectinload(HouseholdPantryItem.food).joinedload(IngredientFoodModel.label),
            selectinload(HouseholdPantryItem.food)
            .selectinload(IngredientFoodModel.substitutions)
            .joinedload(IngredientFoodSubstitutionModel.substitute_food),
            joinedload(HouseholdPantryItem.unit).selectinload(IngredientUnitModel.aliases),
        ]


class PantryItemPagination(PaginationBase):
    items: list[PantryItemOut]


# ==================================================================================================================
# Actions


class PantryAddFromShoppingListIn(MealieModel):
    shopping_list_id: UUID4
    item_ids: list[UUID4] | None = None
    """The checked items to add; every checked item on the list when left empty"""


class PantryAddFromShoppingListOut(MealieModel):
    pantry_items: list[PantryItemOut]
    added_item_ids: list[UUID4]
    """Shopping list items that made it into the pantry"""
    skipped_item_ids: list[UUID4]
    """Shopping list items that couldn't be added, because they have no food"""


class PantryUsageStatus(StrEnum):
    ok = "ok"
    """The pantry item covers what the recipe needs"""
    insufficient = "insufficient"
    """The pantry has less than the recipe needs; all of it is used"""
    untracked = "untracked"
    """The pantry item has no quantity, so there's nothing to subtract"""
    unit_mismatch = "unit_mismatch"
    """The recipe's unit can't be converted into the pantry item's unit"""
    missing = "missing"
    """The food isn't in the pantry"""


class PantryUsageItemOut(MealieModel):
    ingredient_reference_id: UUID4 | None = None
    food: IngredientFood
    required_quantity: float | None = None
    required_unit: IngredientUnit | None = None
    pantry_item: PantryItemOut | None = None
    quantity: float | None = None
    """How much to take from the pantry item, in its own unit"""
    status: PantryUsageStatus


class PantryUsageOut(MealieModel):
    recipe_id: UUID4
    scale: float
    items: list[PantryUsageItemOut]


class PantryUseItemIn(MealieModel):
    pantry_item_id: UUID4
    quantity: float = 0
    """How much was used, in the pantry item's unit"""
    used_up: bool = False
    """Mark the item as gone, whatever its quantity"""

    @field_validator("quantity")
    @classmethod
    def validate_not_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("must not be negative")
        return v


class PantryUseIn(MealieModel):
    items: list[PantryUseItemIn]
    refill_shopping_list_id: UUID4 | None = None
    """Add the items that drop below their minimum to this shopping list"""


class PantryRefillIn(MealieModel):
    shopping_list_id: UUID4


class PantryUseOut(MealieModel):
    pantry_items: list[PantryItemOut]
    """Pantry items still in stock after the update"""
    removed_item_ids: list[UUID4]
    """Pantry items that were used up and removed"""
    refilled_food_ids: list[UUID4]
    """Foods added to the shopping list because they ran low"""


class PantryRefillOut(MealieModel):
    refilled_food_ids: list[UUID4]
    """Foods added to the shopping list because they ran low"""
