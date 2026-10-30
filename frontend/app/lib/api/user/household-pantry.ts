import { BaseCRUDAPI } from "../base/base-clients";
import type {
  PantryAddFromShoppingListIn,
  PantryAddFromShoppingListOut,
  PantryItemCreate,
  PantryItemOut,
  PantryRefillOut,
  PantryUsageOut,
  PantryUseIn,
  PantryUseOut,
} from "~/lib/api/types/household";

const prefix = "/api";

const routes = {
  pantry: `${prefix}/households/pantry`,
  pantryId: (id: string | number) => `${prefix}/households/pantry/${id}`,
  fromShoppingList: `${prefix}/households/pantry/from-shopping-list`,
  refill: `${prefix}/households/pantry/refill`,
  usage: (recipeSlug: string) => `${prefix}/households/pantry/usage/${recipeSlug}`,
  use: `${prefix}/households/pantry/use`,
};

export class PantryAPI extends BaseCRUDAPI<PantryItemCreate, PantryItemOut, PantryItemCreate> {
  baseRoute = routes.pantry;
  itemRoute = routes.pantryId;

  async addFromShoppingList(data: PantryAddFromShoppingListIn) {
    return await this.requests.post<PantryAddFromShoppingListOut>(routes.fromShoppingList, data);
  }

  async refill(shoppingListId: string) {
    return await this.requests.post<PantryRefillOut>(routes.refill, { shoppingListId });
  }

  async getUsage(recipeSlug: string, scale = 1) {
    return await this.requests.get<PantryUsageOut>(`${routes.usage(recipeSlug)}?scale=${scale}`);
  }

  async use(data: PantryUseIn) {
    return await this.requests.post<PantryUseOut>(routes.use, data);
  }
}
