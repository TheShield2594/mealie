import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ShoppingListItemOut, ShoppingListOut } from "~/lib/api/types/household";
import { makeWrapper } from "~/tests/utils";
import { useShoppingListPantry } from "../use-shopping-list-pantry";
import { MOCK_ITEM, MOCK_SHOPPING_LIST } from "./mocks";

const addFromShoppingList = vi.fn();
vi.mock("~/composables/api", () => ({
  useUserApi: () => ({ pantry: { addFromShoppingList } }),
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn(), error: vi.fn() }));
vi.mock("~/composables/use-toast", () => ({ alert: toast }));

const milk: ShoppingListItemOut = { ...MOCK_ITEM, id: "milk", checked: true };
const candles: ShoppingListItemOut = { ...MOCK_ITEM, id: "candles", checked: true };
const bread: ShoppingListItemOut = { ...MOCK_ITEM, id: "bread", checked: false };

function setup(listItems: ShoppingListItemOut[]) {
  const shoppingList = ref<ShoppingListOut | null>({ ...MOCK_SHOPPING_LIST, id: "list", listItems });
  const refresh = vi.fn().mockResolvedValue(undefined);
  const deleteListItems = vi.fn();
  const composable = makeWrapper(() => useShoppingListPantry(shoppingList, refresh, deleteListItems));
  return { ...composable, refresh, deleteListItems };
}

describe("useShoppingListPantry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("sends queued changes, then moves the checked items and takes them off the list", async () => {
    addFromShoppingList.mockResolvedValue({ data: { pantryItems: [], addedItemIds: ["milk"], skippedItemIds: [] } });
    const { moveCheckedToPantry, refresh, deleteListItems } = setup([milk, bread]);

    await moveCheckedToPantry();

    expect(refresh).toHaveBeenCalledTimes(2);
    expect(addFromShoppingList).toHaveBeenCalledWith({ shoppingListId: "list", itemIds: ["milk"] });
    expect(deleteListItems).toHaveBeenCalledWith([milk]);
    expect(toast.success).toHaveBeenCalled();
  });

  test("leaves items without a food on the list and says so", async () => {
    addFromShoppingList.mockResolvedValue({
      data: { pantryItems: [], addedItemIds: ["milk"], skippedItemIds: ["candles"] },
    });
    const { moveCheckedToPantry, deleteListItems } = setup([milk, candles]);

    await moveCheckedToPantry();

    expect(deleteListItems).toHaveBeenCalledWith([milk]);
    expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining("no food"));
  });

  test("keeps the list as it is when the pantry can't be updated", async () => {
    addFromShoppingList.mockResolvedValue({ data: null });
    const { moveCheckedToPantry, deleteListItems } = setup([milk]);

    await moveCheckedToPantry();

    expect(deleteListItems).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  test("does nothing without checked items", async () => {
    const { moveCheckedToPantry } = setup([bread]);

    await moveCheckedToPantry();

    expect(addFromShoppingList).not.toHaveBeenCalled();
  });
});
