<template>
  <!-- Phones and tablets: the three places people go most, one tap from anywhere, in thumb reach.
       Everything else (pantry, finder, cookbooks, settings, sign out) stays in the drawer behind
       More. A Vuetify layout item, so v-main, the shopping list's docked add field and toasts all
       make room for it (DESIGN_AUDIT.md §10-A) -->
  <v-bottom-navigation
    class="mealie-tabbar d-print-none"
    :elevation="0"
    :height="56"
    grow
    tag="nav"
    :aria-label="$t('tab-bar.navigation')"
  >
    <RouterLink
      v-for="tab in tabs"
      :key="tab.key"
      :to="tab.to"
      class="mealie-tabbar__tab"
      :class="{ 'mealie-tabbar__tab--active': isActive(tab.match) }"
      :aria-current="isActive(tab.match) ? 'page' : undefined"
    >
      <v-icon size="22">
        {{ tab.icon }}
      </v-icon>
      <span class="mealie-tabbar__label">{{ tab.label }}</span>
    </RouterLink>
    <button
      type="button"
      class="mealie-tabbar__tab"
      :aria-expanded="drawerOpen"
      @click="$emit('more')"
    >
      <v-icon size="22">
        {{ $globals.icons.menu }}
      </v-icon>
      <span class="mealie-tabbar__label">{{ $t("tab-bar.more") }}</span>
    </button>
  </v-bottom-navigation>
</template>

<script setup lang="ts">
interface Props {
  groupSlug: string;
  /** whether the drawer that More opens is showing */
  drawerOpen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  drawerOpen: false,
});

defineEmits<{
  more: [];
}>();

const i18n = useI18n();
const { $globals } = useNuxtApp();
const route = useRoute();

const tabs = computed(() => [
  {
    key: "recipes",
    to: `/g/${props.groupSlug}`,
    // the library and everything under a recipe, but not the group's other pages (cookbooks, ...)
    match: (path: string) => path === `/g/${props.groupSlug}` || path.startsWith(`/g/${props.groupSlug}/r/`),
    icon: $globals.icons.viewGrid,
    label: i18n.t("general.recipes"),
  },
  {
    key: "plan",
    to: "/household/mealplan/planner/view",
    match: (path: string) => path.startsWith("/household/mealplan"),
    icon: $globals.icons.calendarBlankOutline,
    label: i18n.t("tab-bar.plan"),
  },
  {
    key: "lists",
    to: "/shopping-lists",
    match: (path: string) => path.startsWith("/shopping-lists"),
    icon: $globals.icons.formatListBulleted,
    label: i18n.t("tab-bar.lists"),
  },
]);

function isActive(match: (path: string) => boolean) {
  return match(route.path.replace(/\/$/, ""));
}
</script>

<style scoped>
.mealie-tabbar {
  /* clear of the home indicator; the bar's background still runs to the bottom edge */
  height: calc(56px + env(safe-area-inset-bottom)) !important;
  padding-bottom: env(safe-area-inset-bottom);
  background: color-mix(in srgb, var(--mealie-canvas) 92%, transparent) !important;
  backdrop-filter: saturate(1.4) blur(14px);
  -webkit-backdrop-filter: saturate(1.4) blur(14px);
  border-top: 1px solid var(--mealie-hairline-strong) !important;
  color: var(--mealie-ink-3);
}

.mealie-tabbar :deep(.v-bottom-navigation__content) {
  height: 56px;
}

.mealie-tabbar__tab {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  height: 100%;
  border: 0;
  background: transparent;
  color: var(--mealie-ink-3);
  font: inherit;
  text-decoration: none;
  cursor: pointer;
  transition: color var(--mealie-duration-hover) var(--mealie-ease);
}

.mealie-tabbar__tab :deep(.v-icon) {
  color: inherit;
}

.mealie-tabbar__tab:active {
  transform: scale(0.96);
}

.mealie-tabbar__tab--active {
  color: var(--mealie-accent-ink);
}

.mealie-tabbar__label {
  font-size: 11px;
  font-weight: var(--mealie-weight-control);
  letter-spacing: 0.01em;
  line-height: 1.2;
}

.mealie-tabbar__tab:focus-visible {
  outline-offset: -4px;
  border-radius: var(--mealie-radius-sm);
}
</style>
