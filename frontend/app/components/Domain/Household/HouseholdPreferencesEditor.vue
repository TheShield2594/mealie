<template>
  <!-- Grouped settings: each preference is a row with its explanation and a switch -->
  <div v-if="preferences">
    <h2 class="base-setting-group__title">
      {{ $t("household.household-preferences") }}
    </h2>
    <div class="base-setting-group">
      <BaseSettingRow
        v-model="local.privateHousehold"
        :title="$t('household.private-household')"
      >
        <template #description>
          {{ $t("household.private-household-description") }}
          <DocLink class="mt-2" link="/documentation/getting-started/faq/#how-do-private-groups-and-recipes-work" />
        </template>
      </BaseSettingRow>
      <BaseSettingRow
        v-model="local.lockRecipeEditsFromOtherHouseholds"
        :title="$t('household.lock-recipe-edits-from-other-households')"
      >
        <template #description>
          {{ $t("household.lock-recipe-edits-from-other-households-description") }}
          <span class="d-block mt-1">{{ $t("household.lock-recipe-edits-from-other-households-admin-note") }}</span>
        </template>
      </BaseSettingRow>
      <BaseSettingRow
        v-model="local.showAnnouncements"
        :title="$t('announcements.show-announcements-from-mealie')"
        :description="$t('announcements.show-announcements-setting-description')"
      />
      <BaseSettingRow :title="$t('settings.first-day-of-week')">
        <template #control>
          <v-select
            v-model="local.firstDayOfWeek"
            :items="allDays"
            item-title="name"
            item-value="value"
            :aria-label="$t('settings.first-day-of-week')"
            density="compact"
            hide-details
            class="household-preferences__day"
          />
        </template>
      </BaseSettingRow>
    </div>

    <h2 class="base-setting-group__title">
      {{ $t("household.household-recipe-preferences") }}
    </h2>
    <p class="base-setting-group__intro">
      {{ $t("household.default-recipe-preferences-description") }}
    </p>
    <div class="base-setting-group">
      <BaseSettingRow
        v-for="p in recipePreferences"
        :key="p.key"
        v-model="local[p.key]"
        :title="p.label"
        :description="p.description"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ReadHouseholdPreferences } from "~/lib/api/types/household";

const preferences = defineModel<ReadHouseholdPreferences>({ required: true });
const local = reactive({ ...preferences.value });
watch(local, (newVal) => { preferences.value = { ...newVal }; });
watch(preferences, (newVal) => { if (newVal) Object.assign(local, newVal); });

const i18n = useI18n();

// only the on/off preferences, so each can bind straight to a switch
type BooleanPreferenceKey = {
  [K in keyof ReadHouseholdPreferences]-?: ReadHouseholdPreferences[K] extends boolean | undefined ? K : never
}[keyof ReadHouseholdPreferences];

type Preference = {
  key: BooleanPreferenceKey;
  label: string;
  description: string;
};

const recipePreferences: Preference[] = [
  {
    key: "recipePublic",
    label: i18n.t("group.allow-users-outside-of-your-group-to-see-your-recipes"),
    description: i18n.t("group.allow-users-outside-of-your-group-to-see-your-recipes-description"),
  },
  {
    key: "recipeShowNutrition",
    label: i18n.t("group.show-nutrition-information"),
    description: i18n.t("group.show-nutrition-information-description"),
  },
  {
    key: "recipeShowAssets",
    label: i18n.t("group.show-recipe-assets"),
    description: i18n.t("group.show-recipe-assets-description"),
  },
  {
    key: "recipeLandscapeView",
    label: i18n.t("group.default-to-landscape-view"),
    description: i18n.t("group.default-to-landscape-view-description"),
  },
  {
    key: "recipeDisableComments",
    label: i18n.t("group.disable-users-from-commenting-on-recipes"),
    description: i18n.t("group.disable-users-from-commenting-on-recipes-description"),
  },
];

const allDays = [
  {
    name: i18n.t("general.sunday"),
    value: 0,
  },
  {
    name: i18n.t("general.monday"),
    value: 1,
  },
  {
    name: i18n.t("general.tuesday"),
    value: 2,
  },
  {
    name: i18n.t("general.wednesday"),
    value: 3,
  },
  {
    name: i18n.t("general.thursday"),
    value: 4,
  },
  {
    name: i18n.t("general.friday"),
    value: 5,
  },
  {
    name: i18n.t("general.saturday"),
    value: 6,
  },
];
</script>

<style lang="css">
/* kept for the page that used it alongside this editor */
.preference-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 600px;
}

.household-preferences__day {
  width: 170px;
}
</style>
