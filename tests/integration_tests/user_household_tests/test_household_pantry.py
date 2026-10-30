from datetime import date, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from mealie.schema.household.group_shopping_list import ShoppingListItemCreate, ShoppingListOut
from mealie.schema.recipe.recipe import Recipe
from mealie.schema.recipe.recipe_ingredient import (
    IngredientFood,
    IngredientUnit,
    RecipeIngredient,
    SaveIngredientFood,
    SaveIngredientUnit,
)
from tests import utils
from tests.utils import api_routes
from tests.utils.factories import random_string
from tests.utils.fixture_schemas import TestUser


def make_food(user: TestUser) -> IngredientFood:
    return user.repos.ingredient_foods.create(SaveIngredientFood(name=random_string(), group_id=user.group_id))


def make_unit(user: TestUser, standard_quantity: float | None = None, standard_unit: str | None = None):
    return user.repos.ingredient_units.create(
        SaveIngredientUnit(
            name=random_string(),
            group_id=user.group_id,
            standard_quantity=standard_quantity,
            standard_unit=standard_unit,
        )
    )


def add_pantry_item(api_client: TestClient, user: TestUser, food: IngredientFood, **kwargs) -> dict:
    data = {"foodId": str(food.id), **kwargs}
    if isinstance(unit := data.pop("unit", None), IngredientUnit):
        data["unitId"] = str(unit.id)
    for key, value in list(data.items()):
        if isinstance(value, date):
            data[key] = value.isoformat()

    response = api_client.post(api_routes.households_pantry, json=data, headers=user.token)
    return utils.assert_deserialize(response, 201)


def is_on_hand(user: TestUser, food: IngredientFood) -> bool:
    user.repos.session.expire_all()
    household = user.repos.households.get_one(user.household_id)
    refreshed = user.repos.ingredient_foods.get_one(food.id)
    assert household and refreshed
    return household.slug in refreshed.households_with_ingredient_food


def get_pantry(api_client: TestClient, user: TestUser, *foods: IngredientFood) -> list[dict]:
    """The household's pantry items, limited to the given foods, since other tests share the household"""
    response = api_client.get(api_routes.households_pantry, params={"perPage": -1}, headers=user.token)
    items = utils.assert_deserialize(response, 200)["items"]
    food_ids = {str(food.id) for food in foods}
    return [item for item in items if item["foodId"] in food_ids]


def get_list_items(api_client: TestClient, user: TestUser, shopping_list: ShoppingListOut, *foods: IngredientFood):
    response = api_client.get(api_routes.households_shopping_lists_item_id(shopping_list.id), headers=user.token)
    items = utils.assert_deserialize(response, 200)["listItems"]
    food_ids = {str(food.id) for food in foods}
    return [item for item in items if item["foodId"] in food_ids]


@pytest.fixture
def cup(unique_user: TestUser) -> IngredientUnit:
    return make_unit(unique_user, 1, "cup")


@pytest.fixture
def pint(unique_user: TestUser) -> IngredientUnit:
    # two cups, so conversions are easy to check
    return make_unit(unique_user, 2, "cup")


# ==================================================================================================================
# CRUD


def test_pantry_crud_keeps_on_hand_in_sync(api_client: TestClient, unique_user: TestUser, cup: IngredientUnit):
    food = make_food(unique_user)
    assert not is_on_hand(unique_user, food)

    item = add_pantry_item(api_client, unique_user, food, quantity=2, unit=cup, location="Fridge")
    assert item["food"]["id"] == str(food.id)
    assert item["unit"]["id"] == str(cup.id)
    assert item["householdId"] == unique_user.household_id
    assert is_on_hand(unique_user, food)

    response = api_client.put(
        api_routes.households_pantry_item_id(item["id"]),
        json={"foodId": str(food.id), "unitId": str(cup.id), "quantity": 0},
        headers=unique_user.token,
    )
    updated = utils.assert_deserialize(response, 200)
    assert updated["quantity"] == 0
    assert updated["location"] is None
    assert not is_on_hand(unique_user, food)

    response = api_client.delete(api_routes.households_pantry_item_id(item["id"]), headers=unique_user.token)
    assert response.status_code == 200
    response = api_client.get(api_routes.households_pantry_item_id(item["id"]), headers=unique_user.token)
    assert response.status_code == 404


def test_pantry_untracked_quantity_counts_as_on_hand(api_client: TestClient, unique_user: TestUser):
    food = make_food(unique_user)
    item = add_pantry_item(api_client, unique_user, food)
    assert item["quantity"] is None
    assert is_on_hand(unique_user, food)


def test_pantry_on_hand_stays_while_another_item_has_some(api_client: TestClient, unique_user: TestUser):
    food = make_food(unique_user)
    first = add_pantry_item(api_client, unique_user, food, quantity=1)
    add_pantry_item(api_client, unique_user, food, quantity=3)

    api_client.delete(api_routes.households_pantry_item_id(first["id"]), headers=unique_user.token)
    assert is_on_hand(unique_user, food)


def test_pantry_rejects_bad_input(api_client: TestClient, unique_user: TestUser):
    food = make_food(unique_user)
    response = api_client.post(
        api_routes.households_pantry, json={"foodId": str(food.id), "quantity": -1}, headers=unique_user.token
    )
    assert response.status_code == 422

    response = api_client.post(api_routes.households_pantry, json={"foodId": str(uuid4())}, headers=unique_user.token)
    assert response.status_code == 404


def test_pantry_is_private_to_the_household(api_client: TestClient, unique_user: TestUser, h2_user: TestUser):
    food = make_food(unique_user)
    item = add_pantry_item(api_client, unique_user, food, quantity=1)

    assert not get_pantry(api_client, h2_user, food)
    response = api_client.get(api_routes.households_pantry_item_id(item["id"]), headers=h2_user.token)
    assert response.status_code == 404
    response = api_client.delete(api_routes.households_pantry_item_id(item["id"]), headers=h2_user.token)
    assert response.status_code == 404
    assert not is_on_hand(h2_user, food)


# ==================================================================================================================
# Foods and units


def test_merging_foods_moves_pantry_items(api_client: TestClient, unique_user: TestUser):
    from_food = make_food(unique_user)
    to_food = make_food(unique_user)
    item = add_pantry_item(api_client, unique_user, from_food, quantity=1)

    response = api_client.put(
        api_routes.foods_merge,
        json={"fromFood": str(from_food.id), "toFood": str(to_food.id)},
        headers=unique_user.token,
    )
    assert response.status_code == 200

    response = api_client.get(api_routes.households_pantry_item_id(item["id"]), headers=unique_user.token)
    assert utils.assert_deserialize(response, 200)["foodId"] == str(to_food.id)


def test_deleting_a_food_removes_its_pantry_items(api_client: TestClient, unique_user: TestUser):
    food = make_food(unique_user)
    item = add_pantry_item(api_client, unique_user, food, quantity=1)

    response = api_client.delete(api_routes.foods_item_id(food.id), headers=unique_user.token)
    assert response.status_code == 200

    response = api_client.get(api_routes.households_pantry_item_id(item["id"]), headers=unique_user.token)
    assert response.status_code == 404


def test_units_and_pantry_items(api_client: TestClient, unique_user: TestUser):
    food = make_food(unique_user)
    from_unit = make_unit(unique_user)
    to_unit = make_unit(unique_user)
    item = add_pantry_item(api_client, unique_user, food, quantity=1, unitId=str(from_unit.id))

    response = api_client.put(
        api_routes.units_merge,
        json={"fromUnit": str(from_unit.id), "toUnit": str(to_unit.id)},
        headers=unique_user.token,
    )
    assert response.status_code == 200
    response = api_client.get(api_routes.households_pantry_item_id(item["id"]), headers=unique_user.token)
    assert utils.assert_deserialize(response, 200)["unitId"] == str(to_unit.id)

    response = api_client.delete(api_routes.units_item_id(to_unit.id), headers=unique_user.token)
    assert response.status_code == 200
    response = api_client.get(api_routes.households_pantry_item_id(item["id"]), headers=unique_user.token)
    as_json = utils.assert_deserialize(response, 200)
    assert as_json["unitId"] is None
    assert as_json["quantity"] == 1


# ==================================================================================================================
# Shopping


def test_add_checked_items_from_shopping_list(
    api_client: TestClient,
    unique_user: TestUser,
    shopping_list: ShoppingListOut,
    cup: IngredientUnit,
    pint: IngredientUnit,
):
    milk = make_food(unique_user)
    eggs = make_food(unique_user)
    bread = make_food(unique_user)
    existing = add_pantry_item(api_client, unique_user, milk, quantity=1, unit=pint)

    items = unique_user.repos.group_shopping_list_item.create_many(
        [
            # 4 cups of milk are 2 pints, added to the existing pint item
            ShoppingListItemCreate(
                shopping_list_id=shopping_list.id, food_id=milk.id, unit_id=cup.id, quantity=4, checked=True
            ),
            ShoppingListItemCreate(shopping_list_id=shopping_list.id, food_id=eggs.id, quantity=12, checked=True),
            ShoppingListItemCreate(shopping_list_id=shopping_list.id, note="birthday candles", checked=True),
            # unchecked, so still to buy
            ShoppingListItemCreate(shopping_list_id=shopping_list.id, food_id=bread.id, quantity=1),
        ]
    )
    milk_item, eggs_item, note_item, _ = items

    response = api_client.post(
        api_routes.households_pantry_from_shopping_list,
        json={"shoppingListId": str(shopping_list.id)},
        headers=unique_user.token,
    )
    as_json = utils.assert_deserialize(response, 200)
    assert set(as_json["addedItemIds"]) == {str(milk_item.id), str(eggs_item.id)}
    assert as_json["skippedItemIds"] == [str(note_item.id)]

    pantry = {item["foodId"]: item for item in get_pantry(api_client, unique_user, milk, eggs, bread)}
    assert pantry[str(milk.id)]["id"] == existing["id"]
    assert pantry[str(milk.id)]["quantity"] == pytest.approx(3)
    assert pantry[str(eggs.id)]["quantity"] == 12
    assert str(bread.id) not in pantry
    assert is_on_hand(unique_user, eggs)


def test_add_from_shopping_list_only_takes_given_items(
    api_client: TestClient, unique_user: TestUser, shopping_list: ShoppingListOut
):
    milk = make_food(unique_user)
    eggs = make_food(unique_user)
    milk_item, _ = unique_user.repos.group_shopping_list_item.create_many(
        [
            ShoppingListItemCreate(shopping_list_id=shopping_list.id, food_id=milk.id, checked=True),
            ShoppingListItemCreate(shopping_list_id=shopping_list.id, food_id=eggs.id, checked=True),
        ]
    )

    response = api_client.post(
        api_routes.households_pantry_from_shopping_list,
        json={"shoppingListId": str(shopping_list.id), "itemIds": [str(milk_item.id)]},
        headers=unique_user.token,
    )
    utils.assert_deserialize(response, 200)
    assert [item["foodId"] for item in get_pantry(api_client, unique_user, milk, eggs)] == [str(milk.id)]


def test_add_from_another_households_list_is_not_found(
    api_client: TestClient, h2_user: TestUser, shopping_list: ShoppingListOut
):
    response = api_client.post(
        api_routes.households_pantry_from_shopping_list,
        json={"shoppingListId": str(shopping_list.id)},
        headers=h2_user.token,
    )
    assert response.status_code == 404


def test_refill_low_items(api_client: TestClient, unique_user: TestUser, shopping_list: ShoppingListOut):
    rice = make_food(unique_user)
    beans = make_food(unique_user)
    oil = make_food(unique_user)
    add_pantry_item(api_client, unique_user, rice, quantity=1, minimumQuantity=3)
    add_pantry_item(api_client, unique_user, beans, quantity=5, minimumQuantity=3)
    add_pantry_item(api_client, unique_user, oil, minimumQuantity=1)

    for _ in range(2):
        response = api_client.post(
            api_routes.households_pantry_refill,
            json={"shoppingListId": str(shopping_list.id)},
            headers=unique_user.token,
        )
        utils.assert_deserialize(response, 200)

    list_items = get_list_items(api_client, unique_user, shopping_list, rice, beans, oil)
    # rice is low, beans aren't, oil isn't tracked; refilling twice doesn't add rice twice
    assert len(list_items) == 1
    assert list_items[0]["foodId"] == str(rice.id)
    assert list_items[0]["quantity"] == 2


# ==================================================================================================================
# Cooking


@pytest.fixture
def make_recipe(unique_user: TestUser):
    def _make(ingredients: list[RecipeIngredient]) -> Recipe:
        return unique_user.repos.recipes.create(
            Recipe(
                user_id=unique_user.user_id,
                group_id=unique_user.group_id,
                name=random_string(),
                recipe_ingredient=ingredients,
            )
        )

    return _make


def get_usage(api_client: TestClient, user: TestUser, recipe: Recipe, scale: float = 1) -> list[dict]:
    response = api_client.get(
        api_routes.households_pantry_usage_recipe_slug(recipe.slug), params={"scale": scale}, headers=user.token
    )
    return utils.assert_deserialize(response, 200)["items"]


def test_usage_draws_on_what_expires_first(
    api_client: TestClient, unique_user: TestUser, make_recipe, cup: IngredientUnit, pint: IngredientUnit
):
    flour = make_food(unique_user)
    later = add_pantry_item(
        api_client, unique_user, flour, quantity=5, unit=cup, expiresOn=date(2030, 1, 1) + timedelta(days=30)
    )
    sooner = add_pantry_item(
        api_client, unique_user, flour, quantity=1, unit=pint, expiresOn=date(2030, 1, 1) + timedelta(days=2)
    )
    recipe = make_recipe([RecipeIngredient(quantity=1.5, unit=cup, food=flour)])

    # 3 cups at double scale: the expiring pint (2 cups) first, then 1 cup from the other
    usage = get_usage(api_client, unique_user, recipe, scale=2)
    assert [(u["pantryItem"]["id"], u["status"]) for u in usage] == [(sooner["id"], "ok"), (later["id"], "ok")]
    assert usage[0]["quantity"] == pytest.approx(1)
    assert usage[1]["quantity"] == pytest.approx(1)
    assert usage[0]["requiredQuantity"] == pytest.approx(3)


def test_usage_statuses(api_client: TestClient, unique_user: TestUser, make_recipe, cup: IngredientUnit):
    grams = make_unit(unique_user, 1, "gram")
    sugar = make_food(unique_user)
    salt = make_food(unique_user)
    butter = make_food(unique_user)
    saffron = make_food(unique_user)
    add_pantry_item(api_client, unique_user, sugar, quantity=1, unit=cup)
    add_pantry_item(api_client, unique_user, salt)
    add_pantry_item(api_client, unique_user, butter, quantity=1, unit=cup)

    recipe = make_recipe(
        [
            RecipeIngredient(quantity=2, unit=cup, food=sugar),
            RecipeIngredient(quantity=1, food=salt),
            RecipeIngredient(quantity=100, unit=grams, food=butter),
            RecipeIngredient(quantity=1, food=saffron),
            RecipeIngredient(quantity=1, note="water"),
        ]
    )

    statuses = {u["food"]["id"]: (u["status"], u["quantity"]) for u in get_usage(api_client, unique_user, recipe)}
    assert statuses == {
        str(sugar.id): ("insufficient", 1),
        str(salt.id): ("untracked", None),
        str(butter.id): ("unit_mismatch", None),
        str(saffron.id): ("missing", None),
    }


def test_usage_shares_an_item_between_ingredients(
    api_client: TestClient, unique_user: TestUser, make_recipe, cup: IngredientUnit
):
    milk = make_food(unique_user)
    add_pantry_item(api_client, unique_user, milk, quantity=3, unit=cup)
    recipe = make_recipe(
        [RecipeIngredient(quantity=2, unit=cup, food=milk), RecipeIngredient(quantity=2, unit=cup, food=milk)]
    )

    usage = get_usage(api_client, unique_user, recipe)
    assert [(u["status"], u["quantity"]) for u in usage] == [("ok", 2), ("insufficient", 1)]


def test_usage_for_unknown_recipe_is_not_found(api_client: TestClient, unique_user: TestUser):
    response = api_client.get(
        api_routes.households_pantry_usage_recipe_slug(random_string()), headers=unique_user.token
    )
    assert response.status_code == 404


def test_use_updates_the_pantry(api_client: TestClient, unique_user: TestUser, shopping_list: ShoppingListOut):
    flour = make_food(unique_user)
    eggs = make_food(unique_user)
    rice = make_food(unique_user)
    salt = make_food(unique_user)
    flour_item = add_pantry_item(api_client, unique_user, flour, quantity=5)
    eggs_item = add_pantry_item(api_client, unique_user, eggs, quantity=2)
    rice_item = add_pantry_item(api_client, unique_user, rice, quantity=2, minimumQuantity=1)
    salt_item = add_pantry_item(api_client, unique_user, salt)

    response = api_client.post(
        api_routes.households_pantry_use,
        json={
            "items": [
                {"pantryItemId": flour_item["id"], "quantity": 2},
                {"pantryItemId": eggs_item["id"], "quantity": 3},
                {"pantryItemId": rice_item["id"], "quantity": 2},
                {"pantryItemId": salt_item["id"], "quantity": 1},
            ],
            "refillShoppingListId": str(shopping_list.id),
        },
        headers=unique_user.token,
    )
    as_json = utils.assert_deserialize(response, 200)

    # eggs ran out and have no minimum, so they're gone; rice stays at zero to be restocked
    assert as_json["removedItemIds"] == [eggs_item["id"]]
    assert as_json["refilledFoodIds"] == [str(rice.id)]
    pantry = {item["foodId"]: item["quantity"] for item in get_pantry(api_client, unique_user, flour, eggs, rice, salt)}
    assert pantry == {str(flour.id): 3, str(rice.id): 0, str(salt.id): None}
    assert not is_on_hand(unique_user, eggs)
    assert not is_on_hand(unique_user, rice)
    assert is_on_hand(unique_user, salt)

    list_items = get_list_items(api_client, unique_user, shopping_list, flour, eggs, rice, salt)
    assert [(item["foodId"], item["quantity"]) for item in list_items] == [(str(rice.id), 1)]


def test_use_can_mark_an_item_used_up(api_client: TestClient, unique_user: TestUser):
    salt = make_food(unique_user)
    salt_item = add_pantry_item(api_client, unique_user, salt)

    response = api_client.post(
        api_routes.households_pantry_use,
        json={"items": [{"pantryItemId": salt_item["id"], "usedUp": True}]},
        headers=unique_user.token,
    )
    assert utils.assert_deserialize(response, 200)["removedItemIds"] == [salt_item["id"]]
    assert not is_on_hand(unique_user, salt)


def test_use_ignores_other_households_items(api_client: TestClient, unique_user: TestUser, h2_user: TestUser):
    flour = make_food(unique_user)
    item = add_pantry_item(api_client, unique_user, flour, quantity=5)

    response = api_client.post(
        api_routes.households_pantry_use,
        json={"items": [{"pantryItemId": item["id"], "quantity": 5}]},
        headers=h2_user.token,
    )
    utils.assert_deserialize(response, 200)
    assert get_pantry(api_client, unique_user, flour)[0]["quantity"] == 5
