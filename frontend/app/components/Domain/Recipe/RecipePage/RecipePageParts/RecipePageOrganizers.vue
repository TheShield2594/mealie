<template>
  <div>
    <!-- Reading view: categories and tags as one quiet row of tags, not two cards -->
    <div
      v-if="!isEditForm && (recipe.recipeCategory.length > 0 || recipe.tags.length > 0)"
      class="recipe-filed-under"
    >
      <span class="recipe-filed-under__label">{{ $t("recipe-page.filed-under") }}</span>
      <RecipeChips
        v-if="recipe.recipeCategory.length > 0"
        class="recipe-filed-under__chips"
        :items="recipe.recipeCategory"
        v-bind="$attrs"
      />
      <RecipeChips
        v-if="recipe.tags.length > 0"
        class="recipe-filed-under__chips"
        :items="recipe.tags"
        url-prefix="tags"
        v-bind="$attrs"
      />
    </div>

    <!-- Recipe Categories -->
    <v-card
      v-if="isEditForm"
      :class="{ 'mt-10': !isEditForm }"
    >
      <v-card-title class="py-2">
        {{ $t("recipe.categories") }}
      </v-card-title>
      <v-divider class="mx-2" />
      <v-card-text>
        <RecipeOrganizerSelector
          v-if="isEditForm"
          v-model="recipe.recipeCategory"
          :return-object="true"
          :show-add="true"
          selector-type="categories"
        />
        <RecipeChips
          v-else
          :items="recipe.recipeCategory"
          v-bind="$attrs"
        />
      </v-card-text>
    </v-card>

    <!-- Recipe Tags -->
    <v-card
      v-if="isEditForm"
      class="mt-4"
    >
      <v-card-title class="py-2">
        {{ $t("tag.tags") }}
      </v-card-title>
      <v-divider class="mx-2" />
      <v-card-text>
        <RecipeOrganizerSelector
          v-if="isEditForm"
          v-model="recipe.tags"
          :return-object="true"
          :show-add="true"
          selector-type="tags"
        />
        <RecipeChips
          v-else
          :items="recipe.tags"
          url-prefix="tags"
          v-bind="$attrs"
        />
      </v-card-text>
    </v-card>

    <!-- Recipe Tools Edit -->
    <v-card
      v-if="isEditForm"
      class="mt-4"
    >
      <v-card-title class="py-2">
        {{ $t('tool.required-tools') }}
      </v-card-title>
      <v-divider class="mx-2" />
      <v-card-text>
        <RecipeOrganizerSelector
          v-model="recipe.tools"
          selector-type="tools"
        />
      </v-card-text>
    </v-card>

    <RecipeNutrition
      v-if="recipe.settings.showNutrition"
      v-model="recipe.nutrition"
      class="mt-4"
      :edit="isEditForm"
    />
    <RecipeAssets
      v-if="recipe.settings.showAssets"
      v-model="recipe.assets"
      :edit="isEditForm"
      :slug="recipe.slug"
      :recipe-id="recipe.id"
    />
  </div>
</template>

<script setup lang="ts">
import { usePageState } from "~/composables/recipe-page/shared-state";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import type { Recipe } from "~/lib/api/types/recipe";
import RecipeOrganizerSelector from "@/components/Domain/Recipe/RecipeOrganizerSelector.vue";
import RecipeNutrition from "~/components/Domain/Recipe/RecipeNutrition.vue";
import RecipeChips from "@/components/Domain/Recipe/RecipeChips.vue";
import RecipeAssets from "@/components/Domain/Recipe/RecipeAssets.vue";

const recipe = defineModel<NoUndefinedField<Recipe>>({ required: true });
const { isEditForm } = usePageState(recipe.value.slug);
</script>

<style scoped>
.recipe-filed-under {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
}

.recipe-filed-under__label {
  margin-right: 4px;
  font-size: var(--mealie-text-caption);
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mealie-ink-3);
}

.recipe-filed-under__chips {
  display: contents;
}

.recipe-filed-under__chips :deep(.v-chip) {
  margin: 0 !important;
}
</style>
