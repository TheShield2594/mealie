import { useUserApi } from "~/composables/api";
import { alert } from "~/composables/use-toast";
import type { ShoppingListItemOut, ShoppingListOut } from "~/lib/api/types/household";

/**
 * Moves the checked items on a list into the household's pantry, and off the list.
 * Items without a food can't go in the pantry, so they stay on the list, still checked.
 */
export function useShoppingListPantry(
  shoppingList: Ref<ShoppingListOut | null>,
  refresh: () => Promise<void>,
  deleteListItems: (items: ShoppingListItemOut[]) => void,
) {
  const api = useUserApi();
  const i18n = useI18n();
  const movingToPantry = ref(false);

  async function moveCheckedToPantry() {
    if (!shoppingList.value || movingToPantry.value) {
      return;
    }

    movingToPantry.value = true;
    try {
      // the server only moves items it knows are checked, so send any queued changes first
      await refresh();

      const checked = shoppingList.value?.listItems?.filter(item => item.checked) || [];
      if (!shoppingList.value || !checked.length) {
        return;
      }

      const { data } = await api.pantry.addFromShoppingList({
        shoppingListId: shoppingList.value.id,
        itemIds: checked.map(item => item.id),
      });
      if (!data) {
        alert.error(i18n.t("pantry.failed-to-move-to-pantry"));
        return;
      }

      const added = new Set(data.addedItemIds);
      deleteListItems(checked.filter(item => added.has(item.id)));
      await refresh();

      const moved = i18n.t("pantry.moved-to-pantry", data.addedItemIds.length);
      if (data.skippedItemIds.length) {
        alert.warning(`${moved}. ${i18n.t("pantry.items-without-food", data.skippedItemIds.length)}`);
      }
      else {
        alert.success(moved);
      }
    }
    finally {
      movingToPantry.value = false;
    }
  }

  return {
    movingToPantry,
    moveCheckedToPantry,
  };
}
