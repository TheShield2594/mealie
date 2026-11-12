<template>
  <div>
    <RecipePage
      v-if="recipe"
      v-model="recipe"
    />
    <!-- a recipe that doesn't exist (deleted, renamed, mistyped link) gets a page of its own
         rather than a blank screen and an error toast -->
    <BaseEmptyState
      v-else-if="notFound"
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
import type { Recipe } from "~/lib/api/types/recipe";

const auth = useMealieAuth();
const { isOwnGroup } = useLoggedInState();
const route = useRoute();
const title = ref(route.meta?.title as string || "");
useSeoMeta({ title });

const router = useRouter();
const slug = route.params.slug as string;

const groupSlug = computed(() => route.params.groupSlug as string || auth.user.value?.groupSlug || "");

const recipe = ref<Recipe | null>(null);
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
</style>
