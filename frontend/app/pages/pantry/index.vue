<template>
  <div class="mealie-page mealie-page--narrow">
    <!-- Add / edit -->
    <BaseDialog
      v-model="editDialog"
      bottom-sheet
      :title="editTarget.id ? $t('pantry.edit-item') : $t('pantry.add-item')"
      :icon="$globals.icons.fridge"
      :loading="saving"
      can-submit
      :submit-text="editTarget.id ? $t('general.save') : undefined"
      :submit-icon="editTarget.id ? $globals.icons.save : null"
      :submit-disabled="!editTarget.foodId"
      :can-delete="!!editTarget.id"
      @submit="saveItem"
      @delete="openDelete(editTarget)"
    >
      <v-card-text class="d-flex flex-column ga-3">
        <InputLabelType
          v-model="editTarget.food"
          v-model:item-id="editTarget.foodId"
          :items="foods"
          :label="$t('pantry.food')"
          :icon="$globals.icons.foods"
          :autofocus="!editTarget.id"
          create
          @create="createAssignFood"
        />
        <div class="d-flex ga-3">
          <v-number-input
            v-model="editTarget.quantity"
            :label="$t('form.quantity-label-abbreviated')"
            :min="0"
            :precision="null"
            clearable
            inset
            hide-details
            style="flex: 5"
          />
          <InputLabelType
            v-model="editTarget.unit"
            v-model:item-id="editTarget.unitId"
            :items="units"
            :label="$t('recipe.unit')"
            :icon="$globals.icons.units"
            style="flex: 7"
            create
            @create="createAssignUnit"
          />
        </div>
        <div class="text-caption text-medium-emphasis mt-n2">
          {{ $t("pantry.quantity-hint") }}
        </div>
        <v-combobox
          v-model="editTarget.location"
          :items="locationChoices"
          :label="$t('pantry.location')"
          clearable
          hide-details
        />
        <div class="d-flex ga-3">
          <v-text-field
            v-model="editTarget.expiresOn"
            type="date"
            :label="$t('pantry.expires-on')"
            clearable
            hide-details
            style="flex: 1"
          />
          <v-number-input
            v-model="editTarget.minimumQuantity"
            :label="$t('pantry.minimum-quantity')"
            :min="0"
            :precision="null"
            clearable
            inset
            hide-details
            style="flex: 1"
          />
        </div>
        <div class="text-caption text-medium-emphasis mt-n2">
          {{ $t("pantry.minimum-quantity-hint") }}
        </div>
        <v-text-field
          v-model="editTarget.note"
          :label="$t('shopping-list.note')"
          clearable
          hide-details
        />
      </v-card-text>
    </BaseDialog>

    <!-- Delete -->
    <BaseDialog
      v-model="deleteDialog"
      bottom-sheet
      :title="$t('general.confirm')"
      :icon="$globals.icons.alertCircle"
      color="error"
      can-confirm
      @confirm="deleteItem"
    >
      <v-card-text>{{ $t("pantry.delete-item", { food: deleteTarget?.food?.name || "" }) }}</v-card-text>
    </BaseDialog>

    <!-- Restock -->
    <BaseDialog
      v-model="restockDialog"
      bottom-sheet
      :title="$t('pantry.restock')"
      :icon="$globals.icons.formatListBulleted"
      :loading="restocking"
      can-submit
      :submit-text="$t('recipe.add-to-list')"
      :submit-disabled="!restockList"
      @submit="restock"
    >
      <v-card-text>
        <p class="mb-4">
          {{ $t("pantry.restock-description") }}
        </p>
        <v-select
          v-model="restockList"
          :items="shoppingLists"
          item-title="name"
          item-value="id"
          :label="$t('pantry.restock-list')"
          hide-details
        />
      </v-card-text>
    </BaseDialog>

    <header class="mealie-page__header">
      <div class="mealie-page__titles">
        <div class="mealie-eyebrow">
          {{ $t("pantry.item-count", items.length) }}
        </div>
        <h1 class="mealie-page__title">
          {{ $t("pantry.pantry") }}
        </h1>
      </div>
      <div class="mealie-page__actions">
        <button
          v-if="lowCount"
          type="button"
          class="mealie-pill"
          @click="openRestock"
        >
          <v-icon size="16">
            {{ $globals.icons.formatListBulleted }}
          </v-icon>
          {{ $t("pantry.restock") }}
        </button>
        <button
          type="button"
          class="mealie-pill mealie-pill--primary"
          @click="openCreate"
        >
          <v-icon size="16">
            {{ $globals.icons.createAlt }}
          </v-icon>
          {{ $t("pantry.add-item") }}
        </button>
      </div>
    </header>

    <div class="mealie-page__body">
      <v-text-field
        v-if="items.length"
        v-model="search"
        :prepend-inner-icon="$globals.icons.search"
        :placeholder="$t('pantry.search')"
        variant="solo-filled"
        flat
        rounded="pill"
        density="comfortable"
        clearable
        hide-details
        class="mb-4"
      />

      <div v-if="loaded && !items.length" class="pantry-empty mealie-card">
        {{ $t("pantry.empty") }}
      </div>
      <div v-else-if="loaded && !groups.length" class="pantry-empty mealie-card">
        {{ $t("pantry.no-matches") }}
      </div>

      <section v-for="group in groups" :key="group.location || ''" class="pantry-group">
        <h2 class="pantry-group__title">
          {{ group.location ? locationLabel(group.location) : $t("pantry.no-location") }}
        </h2>
        <div class="pantry-list mealie-card">
          <button
            v-for="item in group.items"
            :key="item.id"
            type="button"
            class="pantry-row"
            @click="openEdit(item)"
          >
            <span class="pantry-row__main">
              <span class="pantry-row__name">{{ item.food.name }}</span>
              <span v-if="item.note" class="pantry-row__note">{{ item.note }}</span>
            </span>
            <span v-if="expiryState(item.expiresOn)" class="pantry-badge" :class="`pantry-badge--${expiryState(item.expiresOn)}`">
              {{ expiryState(item.expiresOn) === "expired"
                ? $t("pantry.expired", { date: $d(parseISO(item.expiresOn!)) })
                : $t("pantry.use-by", { date: $d(parseISO(item.expiresOn!)) }) }}
            </span>
            <span v-if="isLow(item)" class="pantry-badge pantry-badge--low">
              {{ item.quantity ? $t("pantry.low") : $t("pantry.out") }}
            </span>
            <span class="pantry-row__amount">
              {{ formatPantryAmount(item.quantity, item.unit) || $t("pantry.some") }}
            </span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { parseISO } from "date-fns";
import { useUserApi } from "~/composables/api";
import { useFoodData, useFoodStore, useUnitData, useUnitStore } from "~/composables/store";
import { alert } from "~/composables/use-toast";
import {
  DEFAULT_PANTRY_LOCATIONS,
  expiryState,
  formatPantryAmount,
  groupPantryItems,
  isLow,
  matchesPantrySearch,
  usePantryRestockList,
} from "~/composables/pantry/use-pantry";
import type { PantryItemOut, ShoppingListSummary } from "~/lib/api/types/household";
import type { IngredientFood, IngredientUnit } from "~/lib/api/types/recipe";

definePageMeta({
  middleware: ["auth"],
});

const i18n = useI18n();
const api = useUserApi();

useSeoMeta({
  title: i18n.t("pantry.pantry"),
});

const { store: foods, actions: foodActions } = useFoodStore();
const { store: units, actions: unitActions } = useUnitStore();
const foodData = useFoodData();
const unitData = useUnitData();

// ===============================================================
// Items

const items = ref<PantryItemOut[]>([]);
const loaded = ref(false);
const search = ref("");

async function refresh() {
  const { data } = await api.pantry.getAll(1, -1);
  items.value = data?.items || [];
  loaded.value = true;
}
onMounted(refresh);

const groups = computed(() => groupPantryItems(items.value.filter(item => matchesPantrySearch(item, search.value || ""))));
const lowCount = computed(() => items.value.filter(isLow).length);

function locationLabel(location: string) {
  const key = DEFAULT_PANTRY_LOCATIONS.find(k => k === location);
  return key ? i18n.t(`pantry.${key}`) : location;
}

// the stored value for a default location is its key, so it reads right in any language
const defaultLocations = computed(() => DEFAULT_PANTRY_LOCATIONS.map(key => ({ title: i18n.t(`pantry.${key}`), value: key })));
const locationChoices = computed(() => {
  const own = [...new Set(items.value.map(item => item.location).filter((l): l is string => !!l))]
    .filter(l => !DEFAULT_PANTRY_LOCATIONS.some(k => k === l))
    .sort()
    .map(l => ({ title: l, value: l }));
  return [...defaultLocations.value, ...own];
});

// ===============================================================
// Add / edit

interface EditTarget {
  id?: string;
  foodId: string;
  food?: IngredientFood;
  unitId?: string | null;
  unit?: IngredientUnit | null;
  quantity: number | null;
  minimumQuantity: number | null;
  location: string | { title: string; value: string } | null;
  expiresOn: string | null;
  note: string | null;
}

function emptyTarget(): EditTarget {
  return { foodId: "", quantity: null, minimumQuantity: null, location: null, expiresOn: null, note: null };
}

const editDialog = ref(false);
const editTarget = ref<EditTarget>(emptyTarget());
const saving = ref(false);

function openCreate() {
  editTarget.value = emptyTarget();
  editDialog.value = true;
}

function openEdit(item: PantryItemOut) {
  editTarget.value = {
    id: item.id,
    foodId: item.foodId,
    food: item.food,
    unitId: item.unitId,
    unit: item.unit,
    quantity: item.quantity ?? null,
    minimumQuantity: item.minimumQuantity ?? null,
    location: item.location ? locationChoices.value.find(c => c.value === item.location) || item.location : null,
    expiresOn: item.expiresOn ?? null,
    note: item.note ?? null,
  };
  editDialog.value = true;
}

async function saveItem() {
  const target = editTarget.value;
  if (!target.foodId) {
    return;
  }

  const location = typeof target.location === "string" ? target.location : target.location?.value;
  const payload = {
    foodId: target.foodId,
    unitId: target.unitId || null,
    quantity: target.quantity ?? null,
    minimumQuantity: target.minimumQuantity ?? null,
    location: location?.trim() || null,
    expiresOn: target.expiresOn || null,
    note: target.note || null,
  };

  saving.value = true;
  const { data } = target.id
    ? await api.pantry.updateOne(target.id, payload)
    : await api.pantry.createOne(payload);
  saving.value = false;

  if (data) {
    await refresh();
  }
}

async function createAssignFood(name: string) {
  foodData.data.name = name;
  const food = await foodActions.createOne(foodData.data);
  foodData.reset();
  if (food) {
    editTarget.value.food = food;
    editTarget.value.foodId = food.id;
  }
}

async function createAssignUnit(name: string) {
  unitData.data.name = name;
  const unit = await unitActions.createOne(unitData.data);
  unitData.reset();
  if (unit) {
    editTarget.value.unit = unit;
    editTarget.value.unitId = unit.id;
  }
}

// ===============================================================
// Delete

const deleteDialog = ref(false);
const deleteTarget = ref<EditTarget | PantryItemOut | null>(null);

function openDelete(target: EditTarget | PantryItemOut) {
  deleteTarget.value = { ...target };
  deleteDialog.value = true;
}

async function deleteItem() {
  if (!deleteTarget.value?.id) {
    return;
  }

  const { data } = await api.pantry.deleteOne(deleteTarget.value.id);
  if (data) {
    await refresh();
  }
}

// ===============================================================
// Restock

const restockDialog = ref(false);
const restocking = ref(false);
const restockList = usePantryRestockList();
const shoppingLists = ref<ShoppingListSummary[]>([]);

async function openRestock() {
  const { data } = await api.shopping.lists.getAll(1, -1, { orderBy: "name", orderDirection: "asc" });
  shoppingLists.value = data?.items || [];
  if (!shoppingLists.value.some(list => list.id === restockList.value)) {
    restockList.value = shoppingLists.value[0]?.id || null;
  }
  restockDialog.value = true;
}

async function restock() {
  const list = shoppingLists.value.find(l => l.id === restockList.value);
  if (!list) {
    return;
  }

  restocking.value = true;
  const { data } = await api.pantry.refill(list.id);
  restocking.value = false;
  if (data) {
    const count = data.refilledFoodIds.length;
    alert.success(i18n.t("pantry.restocked", { count, list: list.name }, count));
  }
}
</script>

<style scoped>
.pantry-group + .pantry-group {
  margin-top: 24px;
}

.pantry-group__title {
  margin: 0 0 8px 4px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--mealie-text-tertiary);
}

.pantry-list {
  display: flex;
  flex-direction: column;
  padding: 6px;
}

.pantry-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 6px 12px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: var(--mealie-ink);
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.pantry-row + .pantry-row {
  box-shadow: 0 -1px 0 var(--mealie-hairline);
}

.pantry-row:hover {
  background: var(--mealie-fill-subtle);
}

.pantry-row:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

.pantry-row__main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.pantry-row__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 16px;
  font-weight: 600;
}

.pantry-row__note {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--mealie-text-tertiary);
}

.pantry-row__amount {
  flex-shrink: 0;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  color: var(--mealie-text-secondary);
}

.pantry-badge {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.pantry-badge--expired {
  background: rgba(var(--v-theme-error), 0.14);
  color: rgb(var(--v-theme-error));
}

.pantry-badge--soon,
.pantry-badge--low {
  background: rgba(var(--v-theme-warning), 0.18);
  color: rgb(var(--v-theme-warning));
}

.pantry-badge--ok {
  background: var(--mealie-fill);
  color: var(--mealie-text-secondary);
}

.pantry-empty {
  padding: 32px;
  text-align: center;
  color: var(--mealie-text-tertiary);
}

@media (max-width: 600px) {
  .pantry-badge--ok {
    display: none;
  }
}
</style>
