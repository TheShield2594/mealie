from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, Float, ForeignKey, String, orm
from sqlalchemy.orm import Mapped, mapped_column

from .._model_base import BaseMixins, FilterableColumn, SqlAlchemyBase
from .._model_utils.auto_init import auto_init
from .._model_utils.guid import GUID

if TYPE_CHECKING:
    from ..group import Group
    from ..recipe import IngredientFoodModel, IngredientUnitModel
    from .household import Household


class HouseholdPantryItem(SqlAlchemyBase, BaseMixins):
    """
    Food a household has in stock. A food can have several items, e.g. one in the fridge and
    one in the freezer, or two packs with different expiry dates.

    A missing `quantity` means the household has some but doesn't track how much.
    """

    __tablename__ = "household_pantry_items"
    id: FilterableColumn[GUID] = mapped_column(GUID, primary_key=True, default=GUID.generate)

    group_id: FilterableColumn[GUID] = mapped_column(GUID, ForeignKey("groups.id"), nullable=False, index=True)
    group: Mapped[Group] = orm.relationship("Group", back_populates="pantry_items", single_parent=True)
    household_id: FilterableColumn[GUID] = mapped_column(GUID, ForeignKey("households.id"), nullable=False, index=True)
    household: Mapped[Household] = orm.relationship("Household", back_populates="pantry_items")

    food_id: FilterableColumn[GUID] = mapped_column(GUID, ForeignKey("ingredient_foods.id"), nullable=False, index=True)
    food: Mapped[IngredientFoodModel] = orm.relationship("IngredientFoodModel", back_populates="pantry_items")
    unit_id: FilterableColumn[GUID | None] = mapped_column(GUID, ForeignKey("ingredient_units.id"), index=True)
    unit: Mapped[IngredientUnitModel | None] = orm.relationship("IngredientUnitModel", back_populates="pantry_items")

    quantity: FilterableColumn[float | None] = mapped_column(Float)
    # restock when quantity drops below this, in the item's unit
    minimum_quantity: FilterableColumn[float | None] = mapped_column(Float)
    location: FilterableColumn[str | None] = mapped_column(String, index=True)
    expires_on: FilterableColumn[date | None] = mapped_column(Date, index=True)
    note: Mapped[str | None] = mapped_column(String)

    @auto_init()
    def __init__(self, **_) -> None:
        pass
