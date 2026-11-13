<template>
  <!-- Not found, or another error: the shared empty-state pattern on the canvas, with the code
       as a small eyebrow and one way home. The 404 handling below (old /recipe/ links, missing
       group slugs) runs first and only lands here when there's nowhere better to go -->
  <v-app
    v-if="ready"
    dark
  >
    <main class="error-page">
      <div class="error-page__code">
        {{ error?.statusCode || "" }}
      </div>
      <BaseEmptyState
        heading-tag="h1"
        :icon="$globals.icons.silverwareForkKnife"
        :title="isNotFound ? $t('empty-state.page-not-found-title') : $t('empty-state.error-title')"
        :description="isNotFound ? $t('empty-state.page-not-found-description') : $t('empty-state.error-description')"
      >
        <template #actions>
          <slot name="actions">
            <button
              v-for="(button, index) in buttons"
              :key="index"
              type="button"
              class="mealie-pill mealie-pill--primary"
              @click="clearError({ redirect: button.to })"
            >
              {{ button.text }}
            </button>
          </slot>
        </template>
      </BaseEmptyState>
    </main>
  </v-app>
</template>

<script setup lang="ts">
import { useGlobalI18n } from "~/composables/use-global-i18n";

const props = defineProps({
  error: {
    type: Object,
    default: null,
  },
});

const i18n = useGlobalI18n();
const auth = useMealieAuth();
const { $globals } = useNuxtApp();
const ready = ref(false);

const route = useRoute();
const router = useRouter();

async function insertGroupSlugIntoRoute() {
  const groupSlug = ref(auth.user.value?.groupSlug);
  if (!groupSlug.value) {
    return;
  }

  let replaceRoute = false;
  let routeVal = route.fullPath || "/";
  if (routeVal[0] !== "/") {
    routeVal = `/${routeVal}`;
  }

  // replace "recipe" in URL with "r"
  if (routeVal.includes("/recipe/")) {
    replaceRoute = true;
    routeVal = routeVal.replace("/recipe/", "/r/");
  }

  // insert groupSlug into URL
  const routeComponents = routeVal.split("/");
  if (routeComponents.length < 2 || routeComponents[1].toLowerCase() !== "g") {
    replaceRoute = true;
    routeVal = `/g/${groupSlug.value}${routeVal}`;
  }

  // Only leave the error page for a path that exists: an unknown path under
  // /g/<groupSlug> matches only the group page and would show an empty page
  if (replaceRoute && router.resolve(routeVal).name) {
    await clearError({ redirect: routeVal });
  }
}

async function handle404() {
  const normalizedRoute = route.fullPath.replace(/\/$/, "");
  const newRoute = normalizedRoute.replace(/^\/group\/(mealplan|members|notifiers|webhooks)(\/.*)?$/, "/household/$1$2");

  if (newRoute !== normalizedRoute) {
    await clearError({ redirect: newRoute });
  }
  else {
    await insertGroupSlugIntoRoute();
  }

  ready.value = true;
}

if (props.error.statusCode === 404) {
  handle404();
}
else {
  ready.value = true;
}

useSeoMeta({
  title:
        props.error.statusCode === 404
          ? (i18n.t("page.404-not-found") as string)
          : (i18n.t("page.an-error-occurred") as string),
});

const isNotFound = computed(() => props.error?.statusCode === 404);

const buttons = [
  { icon: $globals.icons.home, to: "/", text: i18n.t("empty-state.back-to-recipes") },
];
</script>

<style scoped>
.error-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px 16px 15vh;
  background: var(--mealie-canvas);
}

.error-page__code {
  font-family: var(--mealie-font-display);
  font-size: 15px;
  font-weight: 560;
  letter-spacing: 0.12em;
  color: var(--mealie-ink-4);
}
</style>
