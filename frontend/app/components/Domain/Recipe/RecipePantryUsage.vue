<template>
  <div v-if="rows.length || missing.length" class="pantry-usage">
    <div class="pantry-usage__title">
      <v-icon size="18" color="primary">
        {{ $globals.icons.fridge }}
      </v-icon>
      {{ $t("pantry.update-pantry") }}
    </div>
    <p v-if="rows.length" class="pantry-usage__hint">
      {{ $t("pantry.usage-hint") }}
    </p>

    <div v-for="row in rows" :key="row.pantryItem.id" class="pantry-usage__row">
      <v-checkbox
        v-model="row.selected"
        hide-details
        density="compact"
        color="primary"
        class="pantry-usage__check"
        :aria-label="row.pantryItem.food.name"
      />
      <div class="pantry-usage__main">
        <div class="pantry-usage__name">
          {{ row.pantryItem.food.name }}
          <span v-if="row.pantryItem.location" class="pantry-usage__location">
            · {{ locationLabel(row.pantryItem.location) }}
          </span>
        </div>
        <div v-if="rowHint(row)" class="pantry-usage__status">
          {{ rowHint(row) }}
        </div>
      </div>
      <template v-if="row.pantryItem.quantity === null || row.pantryItem.quantity === undefined">
        <span class="pantry-usage__amount">{{ $t("pantry.used-up") }}</span>
      </template>
      <div v-else class="pantry-usage__amount-input">
        <v-number-input
          v-model="row.quantity"
          :min="0"
          :precision="null"
          :disabled="!row.selected"
          control-variant="hidden"
          density="compact"
          hide-details
          :aria-label="$t('form.quantity-label-abbreviated')"
        />
        <span class="pantry-usage__unit">{{ unitName(row) }}</span>
      </div>
    </div>

    <p v-if="missing.length" class="pantry-usage__missing">
      {{ $t("pantry.not-in-pantry", { foods: missingNames }) }}
    </p>

    <v-select
      v-if="canRestock"
      v-model="restockList"
      :items="restockChoices"
      item-title="name"
      item-value="id"
      :label="$t('pantry.restock-to')"
      density="compact"
      hide-details
      class="mt-3"
    />
  </div>
</template>

<script setup lang="ts">
import { useUserApi } from "~/composables/api";
import {
  DEFAULT_PANTRY_LOCATIONS,
  buildPantryUsageRows,
  formatPantryAmount,
  pantryUnitName,
  usePantryRestockList,
} from "~/composables/pantry/use-pantry";
import type { PantryUsageRow } from "~/composables/pantry/use-pantry";
import type { PantryUsageItemOut, ShoppingListSummary } from "~/lib/api/types/household";

const props = withDefaults(defineProps<{ recipeSlug: string; scale?: number }>(), { scale: 1 });

const api = useUserApi();
const i18n = useI18n();

const rows = ref<PantryUsageRow[]>([]);
const missing = ref<PantryUsageItemOut[]>([]);
const requiredByItem = ref(new Map<string, PantryUsageItemOut>());
const shoppingLists = ref<ShoppingListSummary[]>([]);
const restockList = usePantryRestockList();

onMounted(async () => {
  const { data } = await api.pantry.getUsage(props.recipeSlug, props.scale);
  if (!data) {
    return;
  }

  const built = buildPantryUsageRows(data.items);
  rows.value = built.rows;
  missing.value = built.missing;
  requiredByItem.value = new Map(
    data.items.filter(item => item.pantryItem).map(item => [item.pantryItem!.id, item]),
  );

  if (built.rows.some(row => row.pantryItem.minimumQuantity !== null && row.pantryItem.minimumQuantity !== undefined)) {
    const { data: lists } = await api.shopping.lists.getAll(1, -1, { orderBy: "name", orderDirection: "asc" });
    shoppingLists.value = lists?.items || [];
  }
});

const missingNames = computed(() => [...new Set(missing.value.map(item => item.food.name))].join(", "));

const canRestock = computed(() => shoppingLists.value.length > 0
  && rows.value.some(row => row.selected && row.pantryItem.minimumQuantity !== null && row.pantryItem.minimumQuantity !== undefined));

const restockChoices = computed(() => [
  { id: null, name: i18n.t("pantry.dont-restock") },
  ...shoppingLists.value.map(list => ({ id: list.id, name: list.name })),
]);

function locationLabel(location: string) {
  const key = DEFAULT_PANTRY_LOCATIONS.find(k => k === location);
  return key ? i18n.t(`pantry.${key}`) : location;
}

function unitName(row: PantryUsageRow) {
  return pantryUnitName(row.quantity ?? 0, row.pantryItem.unit);
}

function rowHint(row: PantryUsageRow) {
  const required = requiredByItem.value.get(row.pantryItem.id);
  if (row.status === "insufficient") {
    return i18n.t("pantry.only-had", { amount: formatPantryAmount(row.pantryItem.quantity, row.pantryItem.unit) });
  }
  if (row.status === "unit_mismatch" && required?.requiredQuantity) {
    return i18n.t("pantry.cant-convert", { amount: formatPantryAmount(required.requiredQuantity, required.requiredUnit) });
  }
  return "";
}

/**
 * Takes the ticked amounts out of the pantry. Returns false if the pantry couldn't be updated.
 */
async function apply(): Promise<boolean> {
  const items = rows.value
    .filter(row => row.selected)
    .map((row) => {
      const tracked = row.pantryItem.quantity !== null && row.pantryItem.quantity !== undefined;
      return tracked
        ? { pantryItemId: row.pantryItem.id, quantity: row.quantity ?? 0 }
        : { pantryItemId: row.pantryItem.id, usedUp: true };
    });
  if (!items.length) {
    return true;
  }

  const { data } = await api.pantry.use({
    items,
    refillShoppingListId: canRestock.value ? restockList.value : null,
  });
  return !!data;
}

defineExpose({ apply });
</script>

<style scoped>
.pantry-usage {
  margin-top: 20px;
  padding: 14px 16px;
  border-radius: 16px;
  background: var(--mealie-fill-subtle);
}

.pantry-usage__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
}

.pantry-usage__hint,
.pantry-usage__missing {
  margin: 4px 0 8px;
  font-size: 13px;
  color: var(--mealie-text-tertiary);
}

.pantry-usage__missing {
  margin: 8px 0 0;
}

.pantry-usage__row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
}

.pantry-usage__check {
  flex: 0 0 auto;
}

.pantry-usage__main {
  flex: 1;
  min-width: 0;
}

.pantry-usage__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.pantry-usage__location,
.pantry-usage__status {
  font-size: 12px;
  font-weight: 400;
  color: var(--mealie-text-tertiary);
}

.pantry-usage__amount {
  font-size: 13px;
  color: var(--mealie-text-secondary);
}

.pantry-usage__amount-input {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 140px;
  flex-shrink: 0;
}

.pantry-usage__unit {
  min-width: 36px;
  font-size: 13px;
  color: var(--mealie-text-secondary);
}
</style>
