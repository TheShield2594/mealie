<template>
  <div>
    <RecipePage
      v-if="recipe"
      v-model="recipe"
    />
    <!-- a recipe that doesn't exist (deleted, renamed, mistyped link) gets a page of its own
         rather than a blank screen and an error toast -->
    <!-- while it loads: the page's own layout, photo and title first -->
    <div
      v-else-if="!notFound"
      class="recipe-skeleton"
      aria-busy="true"
      :aria-label="$t('empty-state.loading')"
    >
      <div class="recipe-skeleton__hero">
        <BaseSkeleton aspect-ratio="16 / 10" radius="lg" />
        <div>
          <BaseSkeleton width="30%" :height="12" />
          <BaseSkeleton class="mt-4" width="85%" :height="36" />
          <BaseSkeleton class="mt-3" width="60%" :height="36" />
          <BaseSkeleton class="mt-6" width="90%" :height="14" />
          <BaseSkeleton class="mt-2" width="70%" :height="14" />
          <div class="recipe-skeleton__actions">
            <BaseSkeleton :width="140" :height="40" radius="pill" />
            <BaseSkeleton :width="110" :height="40" radius="pill" />
          </div>
        </div>
      </div>
      <div class="recipe-skeleton__body">
        <div>
          <BaseSkeleton width="45%" :height="20" />
          <BaseSkeleton v-for="n in 6" :key="n" class="mt-5" :width="`${90 - (n % 3) * 15}%`" :height="14" />
        </div>
        <div>
          <BaseSkeleton width="30%" :height="20" />
          <template v-for="n in 3" :key="n">
            <BaseSkeleton class="mt-6" width="95%" :height="14" />
            <BaseSkeleton class="mt-2" width="80%" :height="14" />
          </template>
        </div>
      </div>
    </div>
    <BaseEmptyState
      v-else
      class="recipe-not-found"
      heading-tag="h1"
      :icon="$globals.icons.silverwareForkKnife"
      :title="$t('empty-state.recipe-not-found-title')"
      :description="$t('empty-state.recipe-not-found-description')"
    >
      <template #actions>
        <RouterLink class="mealie-pill mealie-pill--primary" :to="`/g/${groupSlug}`">
          {{ $t("empty-state.back-to-recipes") }}
        </RouterLink>
      </template>
    </BaseEmptyState>
  </div>
</template>

<script setup lang="ts">
import { whenever } from "@vueuse/core";
import { useLoggedInState } from "~/composables/use-logged-in-state";
import { useAsyncKey } from "~/composables/use-utils";
import RecipePage from "~/components/Domain/Recipe/RecipePage/RecipePage.vue";
import { usePublicExploreApi } from "~/composables/api/api-client";
import { useRecipe } from "~/composables/recipes";
import type { RecipeOut } from "~/lib/api/types/recipe";

const auth = useMealieAuth();
const { isOwnGroup } = useLoggedInState();
const route = useRoute();
const title = ref(route.meta?.title as string || "");
useSeoMeta({ title });

const router = useRouter();
const slug = route.params.slug as string;

const groupSlug = computed(() => route.params.groupSlug as string || auth.user.value?.groupSlug || "");

const recipe = ref<RecipeOut | null>(null);
const notFound = ref(false);
function loadRecipe() {
  const { recipe: data, loading } = useRecipe(slug);
  watch(data, (value) => {
    recipe.value = value;
  });
  // the fetch has finished and brought nothing back
  watch(loading, (isLoading, wasLoading) => {
    if (wasLoading && !isLoading && !data.value) {
      notFound.value = true;
    }
  });
}

async function loadPublicRecipe() {
  const groupSlug = computed(() => route.params.groupSlug as string || auth.user.value?.groupSlug || "");
  const api = usePublicExploreApi(groupSlug.value);
  const { data } = await useAsyncData(useAsyncKey(), async () => {
    const { data, error } = await api.explore.recipes.getOne(slug);
    if (error) {
      console.error("error loading recipe -> ", error);
      router.push({ path: `/g/${groupSlug.value}`, query: { redirect: route.fullPath } });
    }

    return data;
  });
  recipe.value = data.value;
}

if (isOwnGroup.value) {
  loadRecipe();
}
else {
  onMounted(loadPublicRecipe);
}

whenever(
  () => recipe.value,
  () => {
    if (recipe.value && recipe.value.name) {
      title.value = recipe.value.name;
    }
  },
);
</script>

<style scoped>
.recipe-not-found {
  padding-top: 18vh;
}

/* mirrors RecipePageHero and RecipePage's columns, so nothing jumps when the recipe arrives */
.recipe-skeleton {
  max-width: 1360px;
  margin: 0 auto;
  padding: 32px 48px 72px;
}

.recipe-skeleton__hero {
  display: grid;
  grid-template-columns: minmax(0, 560px) minmax(0, 1fr);
  gap: 44px;
  align-items: center;
}

.recipe-skeleton__actions {
  display: flex;
  gap: 10px;
  margin-top: 28px;
}

.recipe-skeleton__body {
  display: grid;
  grid-template-columns: minmax(0, 340px) minmax(0, 1fr);
  gap: 64px;
  margin-top: 56px;
}

@media (max-width: 960px) {
  .recipe-skeleton {
    padding: 16px 16px 72px;
  }

  .recipe-skeleton__hero,
  .recipe-skeleton__body {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}
</style>
