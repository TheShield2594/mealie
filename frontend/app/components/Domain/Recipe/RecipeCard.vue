<template>
  <!-- Grid card: the photo leads, then the title and one line of meta (DESIGN_AUDIT.md §8.4).
       Rating, tags and the description live on the recipe page; the favourite sits on the photo -->
  <div class="mealie-recipe-card-wrap">
    <v-card
      class="mealie-recipe-card"
      variant="flat"
      :style="{ cursor }"
      :to="recipeRoute"
      @click.self="$emit('click')"
    >
      <div class="mealie-recipe-card__media">
        <RecipeCardImage
          small
          :name="name"
          height="100%"
          :min-height="0"
          :slug="slug"
          :recipe-id="recipeId"
          :image-version="image"
        />
        <v-defaults-provider :defaults="{ VBtn: { variant: 'flat' } }">
          <RecipeFavoriteBadge
            v-if="isOwnGroup && showRecipeContent"
            class="mealie-recipe-card__favorite"
            :recipe-id="recipeId"
            show-always
          />
        </v-defaults-provider>
      </div>

      <div class="mealie-recipe-card__body">
        <h3 class="mealie-recipe-card__title">
          {{ name }}
        </h3>
        <div class="mealie-recipe-card__meta-row">
          <span v-if="metaText" class="mealie-recipe-card__meta">{{ metaText }}</span>
          <v-spacer />
          <!-- quiet text buttons, as v-card-actions used to provide -->
          <v-defaults-provider :defaults="{ VBtn: { variant: 'text' } }">
            <slot name="actions">
              <!-- If we're not logged-in, no items display, so we hide this menu -->
              <RecipeContextMenu
                v-if="isOwnGroup && showRecipeContent"
                class="mealie-recipe-card__menu"
                :slug="slug"
                :menu-icon="$globals.icons.dotsHorizontal"
                :name="name"
                :recipe-id="recipeId"
                :use-items="{
                  delete: false,
                  edit: false,
                  download: true,
                  downloadPdf: true,
                  mealplanner: true,
                  shoppingList: true,
                  print: false,
                  printPreferences: false,
                  share: true,
                }"
                @deleted="$emit('delete', slug)"
              />
            </slot>
          </v-defaults-provider>
        </div>
      </div>
      <slot />
    </v-card>
  </div>
</template>

<script setup lang="ts">
import RecipeFavoriteBadge from "./RecipeFavoriteBadge.vue";
import RecipeContextMenu from "./RecipeContextMenu/RecipeContextMenu.vue";
import RecipeCardImage from "./RecipeCardImage.vue";
import { useLoggedInState } from "~/composables/use-logged-in-state";
import { useRecipeCardMeta, type RecipeCardMeta } from "~/composables/recipes/use-recipe-card-meta";

interface Props {
  name: string;
  slug: string;
  description?: string | null;
  rating?: number;
  ratingColor?: string;
  image?: string;
  tags?: Array<any>;
  recipeId: string;
  /** The recipe's times and categories, for the "35 min · Dinner" line under the title */
  meta?: RecipeCardMeta | null;
  // Kept so existing callers still type-check; the redesigned card no longer shows these
  imageHeight?: number;
}
const props = withDefaults(defineProps<Props>(), {
  description: null,
  rating: 0,
  ratingColor: "secondary",
  image: undefined,
  tags: () => [],
  meta: null,
  imageHeight: 200,
});

defineEmits<{
  click: [];
  delete: [slug: string];
}>();

const auth = useMealieAuth();
const { isOwnGroup } = useLoggedInState();

const route = useRoute();
const groupSlug = computed(() => route.params.groupSlug || auth.user.value?.groupSlug || "");
const showRecipeContent = computed(() => props.recipeId && props.slug);
const recipeRoute = computed<string>(() => {
  return showRecipeContent.value ? `/g/${groupSlug.value}/r/${props.slug}` : "";
});
const cursor = computed(() => showRecipeContent.value ? "pointer" : "auto");

const { recipeCardMeta } = useRecipeCardMeta();
const metaText = computed(() => recipeCardMeta(props.meta));
</script>

<style scoped>
.mealie-recipe-card {
  background: transparent !important;
  border-radius: var(--mealie-radius-md) !important;
  box-shadow: none !important;
  overflow: visible;
}

/* the photo: 4:3 everywhere, so grids line up whatever the upload's shape */
.mealie-recipe-card__media {
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: var(--mealie-radius-md);
  overflow: hidden;
  background: var(--mealie-placeholder);
  isolation: isolate;
}

.mealie-recipe-card__media :deep(.v-img__img) {
  transition: transform var(--mealie-duration-enter) var(--mealie-ease);
}

@media (hover: hover) {
  .mealie-recipe-card:hover .mealie-recipe-card__media :deep(.v-img__img) {
    transform: scale(1.03);
  }
}

.mealie-recipe-card__media :deep(.mealie-recipe-card__favorite) {
  position: absolute !important;
  top: 8px;
  right: 8px;
  z-index: 2;
  width: 34px !important;
  height: 34px !important;
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(6px);
}

.mealie-recipe-card__media :deep(.mealie-recipe-card__favorite .v-icon) {
  font-size: 18px;
}

.mealie-recipe-card__body {
  padding: 12px 2px 0;
}

.mealie-recipe-card__title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  margin: 0;
  font-size: var(--mealie-text-body);
  font-weight: var(--mealie-weight-strong);
  line-height: 1.35;
  letter-spacing: -0.005em;
  color: var(--mealie-ink);
  overflow-wrap: anywhere;
}

.mealie-recipe-card__meta-row {
  display: flex;
  align-items: center;
  min-height: 32px;
  margin-top: 2px;
}

.mealie-recipe-card__meta {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--mealie-text-meta);
  color: var(--mealie-ink-3);
}

.mealie-recipe-card__meta-row :deep(.mealie-recipe-card__menu) {
  margin-right: -6px;
}

.mealie-recipe-card__meta-row :deep(.mealie-recipe-card__menu .v-btn) {
  width: 32px;
  height: 32px;
  color: var(--mealie-ink-3);
}

.mealie-recipe-card__meta-row :deep(.mealie-recipe-card__menu .v-btn .v-icon) {
  color: inherit !important;
}

/* the card's own link focus ring hugs the photo */
.mealie-recipe-card:focus-visible {
  outline-offset: 4px;
}
</style>
