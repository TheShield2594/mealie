import { useLocalStorage, useOnline } from "@vueuse/core";
import { useUserApi } from "~/composables/api";
import type { ShoppingListItemOut, ShoppingListOut } from "~/lib/api/types/household";
import type { RequestResponse } from "~/lib/api/types/non-generated";

const localStorageKey = "shopping-list-queue";

type ItemQueueType = "create" | "update" | "delete";

export interface ShoppingListQueue {
  create: ShoppingListItemOut[];
  update: ShoppingListItemOut[];
  delete: ShoppingListItemOut[];
}

interface Storage {
  [key: string]: ShoppingListQueue;
}

export function useShoppingListItemActions(shoppingListId: string) {
  const isOnline = useOnline();
  const api = useUserApi();
  const storage = useLocalStorage(localStorageKey, {} as Storage, { deep: true });
  const queue = reactive(getQueue());
  const queueEmpty = computed(() => !queue.create.length && !queue.update.length && !queue.delete.length);

  storage.value[shoppingListId] = { ...queue };
  watch(
    () => queue,
    (value) => {
      storage.value[shoppingListId] = { ...value };
    },
    {
      deep: true,
      immediate: true,
    },
  );

  function isValidQueueObject(obj: any): obj is ShoppingListQueue {
    if (typeof obj !== "object" || obj === null) {
      return false;
    }

    const hasRequiredProps = "create" in obj && "update" in obj && "delete" in obj;
    if (!hasRequiredProps) {
      return false;
    }

    return Array.isArray(obj.create) && Array.isArray(obj.update) && Array.isArray(obj.delete);
  }

  function createEmptyQueue(): ShoppingListQueue {
    const newQueue = { create: [], update: [], delete: [] };
    return newQueue;
  }

  function getQueue(): ShoppingListQueue {
    try {
      const fetchedQueue = storage.value[shoppingListId];
      if (!isValidQueueObject(fetchedQueue)) {
        console.log("Invalid queue object in local storage; resetting queue.");
        return createEmptyQueue();
      }
      else {
        return fetchedQueue;
      }
    }
    catch (error) {
      console.log("Error validating queue object in local storage; resetting queue.", error);
      return createEmptyQueue();
    }
  }

  function removeFromQueue(itemQueue: ShoppingListItemOut[], item: ShoppingListItemOut): boolean {
    const index = itemQueue.findIndex(i => i.id === item.id);
    if (index === -1) {
      return false;
    }

    itemQueue.splice(index, 1);
    return true;
  }

  function mergeListItemsByLatest(
    list1: ShoppingListItemOut[],
    list2: ShoppingListItemOut[],
  ) {
    const mergedList = [...list1];
    list2.forEach((list2Item) => {
      const conflictingItem = mergedList.find(item => item.id === list2Item.id);
      if (conflictingItem
        && list2Item.updatedAt && conflictingItem.updatedAt
        && list2Item.updatedAt > conflictingItem.updatedAt) {
        mergedList.splice(mergedList.indexOf(conflictingItem), 1, list2Item);
      }
      else if (!conflictingItem) {
        mergedList.push(list2Item);
      }
    });
    return mergedList;
  }

  async function getList() {
    const response = await api.shopping.lists.getOne(shoppingListId);
    if (response.data) {
      // Merge pending local changes (both online and offline)
      const createAndUpdateQueues = mergeListItemsByLatest(queue.update, queue.create);
      const deleteQueueIds = new Set(queue.delete.map(item => item.id));

      const filteredLocalChanges = createAndUpdateQueues.filter(item => !deleteQueueIds.has(item.id));
      let mergedItems = mergeListItemsByLatest(response.data.listItems ?? [], filteredLocalChanges);
      mergedItems = mergedItems.filter(item => !deleteQueueIds.has(item.id));

      response.data.listItems = mergedItems;
    }
    return response.data;
  }

  function createItem(item: ShoppingListItemOut) {
    removeFromQueue(queue.create, item);
    removeFromQueue(queue.update, item);
    removeFromQueue(queue.delete, item);

    queue.create.push(item);
  }

  function updateItem(item: ShoppingListItemOut) {
    const removedFromCreate = removeFromQueue(queue.create, item);
    removeFromQueue(queue.update, item);
    removeFromQueue(queue.delete, item);

    if (removedFromCreate) {
      // This item hasn't been created yet, so keep it in create queue with updated data
      queue.create.push(item);
    }
    else {
      queue.update.push(item);
    }
  }

  function deleteItem(item: ShoppingListItemOut) {
    const removedFromCreate = removeFromQueue(queue.create, item);
    if (removedFromCreate) {
      // This item hasn't been created yet, so we don't need to delete it
      return;
    }

    removeFromQueue(queue.update, item);
    removeFromQueue(queue.delete, item);
    queue.delete.push(item);
  }

  function getQueueItems(itemQueueType: ItemQueueType) {
    return queue[itemQueueType];
  }

  function clearQueueItems(itemQueueType: ItemQueueType | "all", itemIds: string[] | null = null) {
    if (itemQueueType === "create" || itemQueueType === "all") {
      queue.create = itemIds ? queue.create.filter(item => !itemIds.includes(item.id)) : [];
    }
    if (itemQueueType === "update" || itemQueueType === "all") {
      queue.update = itemIds ? queue.update.filter(item => !itemIds.includes(item.id)) : [];
    }
    if (itemQueueType === "delete" || itemQueueType === "all") {
      queue.delete = itemIds ? queue.delete.filter(item => !itemIds.includes(item.id)) : [];
    }
  }

  function isNewerThan(item: ShoppingListItemOut, other: ShoppingListItemOut): boolean {
    const itemTime = item.updatedAt ? Date.parse(item.updatedAt) : NaN;
    const otherTime = other.updatedAt ? Date.parse(other.updatedAt) : NaN;
    return !isNaN(itemTime) && !isNaN(otherTime) && itemTime > otherTime;
  }

  /**
   * Drops queued changes that the server has moved past, item by item: deletes and updates
   * for items someone else already removed, and updates older than the server's copy.
   * Everything else is kept, however long the queue has been waiting.
   */
  function reconcileQueue(list: ShoppingListOut) {
    const serverItems = new Map((list.listItems ?? []).map(item => [item.id, item]));

    queue.delete = toRaw(queue.delete).filter(item => serverItems.has(item.id));
    queue.update = toRaw(queue.update).filter((item) => {
      const serverItem = serverItems.get(item.id);
      return !!serverItem && !isNewerThan(serverItem, item);
    });
  }

  /**
   * Processes the queue items and returns whether the processing was successful.
   */
  async function processQueueItems(
    action: (items: ShoppingListItemOut[]) => Promise<RequestResponse<any>>,
    itemQueueType: ItemQueueType,
  ): Promise<boolean> {
    let queueItems: ShoppingListItemOut[];
    try {
      queueItems = getQueueItems(itemQueueType);
      if (!queueItems.length) {
        return true;
      }
    }
    catch (error) {
      console.log(`Error fetching queue items of type ${itemQueueType}:`, error);
      clearQueueItems(itemQueueType);
      return false;
    }

    try {
      const itemsToProcess = [...queueItems];
      const itemIdsToProcess = itemsToProcess.map(item => item.id);

      await action(itemsToProcess)
        .then(() => {
          if (isOnline.value) {
            clearQueueItems(itemQueueType, itemIdsToProcess);
          }
        });
    }
    catch (error) {
      console.log(`Error processing queue items of type ${itemQueueType}:`, error);
      clearQueueItems(itemQueueType);
      return false;
    }

    return true;
  }

  async function process() {
    if (queueEmpty.value) {
      return;
    }

    // reconcile against the server's own items, not getList's copy with the queue merged in
    const { data } = await api.shopping.lists.getOne(shoppingListId);
    if (!data) {
      return;
    }
    reconcileQueue(data);

    // We send each bulk request one at a time, since the backend may merge items
    await processQueueItems(items => api.shopping.items.deleteMany(items), "delete");
    await processQueueItems(items => api.shopping.items.updateMany(items), "update");
    await processQueueItems(items => api.shopping.items.createMany(items), "create");
  }

  return {
    getList,
    createItem,
    updateItem,
    deleteItem,
    process,

    __testing__: {
      queue,
      clearQueueItems,
      createEmptyQueue,
    },
  };
}
