from functools import cached_property

from fastapi import APIRouter, Depends, Query
from pydantic import UUID4

from mealie.core.exceptions import NoEntryFound
from mealie.routes._base.base_controllers import BaseCrudController
from mealie.routes._base.controller import controller
from mealie.routes._base.permissions import not_found
from mealie.routes.households.controller_shopping_lists import publish_list_item_events
from mealie.schema.household.pantry import (
    PantryAddFromShoppingListIn,
    PantryAddFromShoppingListOut,
    PantryItemCreate,
    PantryItemOut,
    PantryItemPagination,
    PantryRefillIn,
    PantryRefillOut,
    PantryUsageOut,
    PantryUseIn,
    PantryUseOut,
)
from mealie.schema.response.pagination import PaginationQuery
from mealie.services.household_services.pantry import PantryService
from mealie.services.recipe.recipe_service import RecipeService

router = APIRouter(prefix="/households/pantry", tags=["Households: Pantry"])


@controller(router)
class PantryController(BaseCrudController):
    @cached_property
    def service(self):
        return PantryService(self.repos, self.group_id, self.household_id)

    @cached_property
    def repo(self):
        return self.repos.household_pantry_items

    # ==================================================================================================================
    # CRUD

    @router.get("", response_model=PantryItemPagination)
    def get_all(self, q: PaginationQuery = Depends(PaginationQuery)):
        response = self.repo.page_all(pagination=q, override=PantryItemOut)
        response.set_pagination_guides(router.url_path_for("get_all"), q.model_dump())
        return response

    @router.post("", response_model=PantryItemOut, status_code=201)
    def create_one(self, data: PantryItemCreate):
        try:
            return self.service.create_one(data)
        except NoEntryFound as e:
            raise not_found(str(e)) from e

    @router.get("/{item_id}", response_model=PantryItemOut)
    def get_one(self, item_id: UUID4):
        item = self.repo.get_one(item_id)
        if not item:
            raise not_found("Not found.")
        return item

    @router.put("/{item_id}", response_model=PantryItemOut)
    def update_one(self, item_id: UUID4, data: PantryItemCreate):
        try:
            return self.service.update_one(item_id, data)
        except NoEntryFound as e:
            raise not_found(str(e)) from e

    @router.delete("/{item_id}", response_model=PantryItemOut)
    def delete_one(self, item_id: UUID4):
        if not self.repo.get_one(item_id):
            raise not_found("Not found.")
        return self.service.delete_one(item_id)

    # ==================================================================================================================
    # Shopping

    @router.post("/from-shopping-list", response_model=PantryAddFromShoppingListOut)
    def add_from_shopping_list(self, data: PantryAddFromShoppingListIn):
        try:
            return self.service.add_from_shopping_list(data)
        except NoEntryFound as e:
            raise not_found(str(e)) from e

    @router.post("/refill", response_model=PantryRefillOut)
    def refill(self, data: PantryRefillIn):
        try:
            refilled, items = self.service.refill(data.shopping_list_id)
        except NoEntryFound as e:
            raise not_found(str(e)) from e

        publish_list_item_events(self.publish_event, items)
        return PantryRefillOut(refilled_food_ids=refilled)

    # ==================================================================================================================
    # Cooking

    @router.get("/usage/{recipe_slug}", response_model=PantryUsageOut)
    def get_usage(self, recipe_slug: str, scale: float = Query(1, gt=0)):
        recipe_service = RecipeService(self.repos, self.user, self.household, translator=self.translator)
        try:
            recipe = recipe_service.get_one(recipe_slug)
        except NoEntryFound as e:
            raise not_found("Not found.") from e

        return self.service.get_usage(recipe, scale)

    @router.post("/use", response_model=PantryUseOut)
    def use(self, data: PantryUseIn):
        try:
            result, items = self.service.use(data)
        except NoEntryFound as e:
            raise not_found(str(e)) from e

        if items:
            publish_list_item_events(self.publish_event, items)
        return result
