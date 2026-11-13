<template>
  <!-- Row card: thumbnail, title, one line of meta, then the favourite and menu
       (DESIGN_AUDIT.md §8.4). Used for list views, search results, the planner and the timeline -->
  <div
    class="mealie-row-card-wrap"
    :style="vertical ? undefined : { minHeight: `${height}px` }"
  >
    <v-card
      variant="flat"
      :class="[
        isFlat ? 'flat' : 'mealie-row-card',
        { 'mealie-row-card--vertical': vertical, 'disable-highlight': disableHighlight },
      ]"
      :style="{ cursor, '--row-thumb': `${thumbSize}px` }"
      :to="$attrs.selected ? undefined : recipeRoute"
      @click="$emit('selected')"
    >
      <div class="mealie-row-card__thumb">
        <slot name="avatar">
          <RecipeCardImage
            tiny
            :name="showRecipeContent ? name : null"
            :icon-size="28"
            height="100%"
            :min-height="0"
            :slug="slug"
            :recipe-id="recipeId"
            :image-version="image"
          />
        </slot>
      </div>
      <div class="mealie-row-card__body">
        <div class="mealie-row-card__title">
          {{ name }}
        </div>
        <div v-if="metaText" class="mealie-row-card__meta">
          {{ metaText }}
        </div>
        <!-- a note-only entry (no recipe) shows its text instead -->
        <div v-else-if="!showRecipeContent && description" class="mealie-row-card__meta mealie-row-card__meta--note">
          {{ description }}
        </div>
      </div>
      <div class="mealie-row-card__actions">
        <!-- quiet text buttons, as v-card-actions used to provide -->
        <v-defaults-provider :defaults="{ VBtn: { variant: 'text' } }">
          <slot name="actions">
            <RecipeFavoriteBadge
              v-if="isOwnGroup && showRecipeContent && !hideFavorite"
              class="mealie-row-card__favorite"
              :recipe-id="recipeId"
              show-always
            />
            <!-- If we're not logged-in, no items display, so we hide this menu -->
            <slot name="context-menu">
              <RecipeContextMenu
                v-if="isOwnGroup && showRecipeContent"
                class="mealie-row-card__menu"
                :slug="slug"
                :menu-icon="$globals.icons.dotsHorizontal"
                :name="name"
                :recipe-id="recipeId"
                :recipe-scale="scale"
                :use-items="{
                  delete: false,
                  edit: false,
                  download: true,
                  mealplanner: true,
                  shoppingList: true,
                  print: false,
                  printPreferences: false,
                  share: true,
                }"
                :leading-items="contextMenuLeadingItems"
                :append-items="contextMenuAppendItems"
                @deleted="$emit('delete', slug)"
                @mealplan-remove="$emit('mealplanRemove')"
                @mealplan-edit="$emit('mealplanEdit')"
              />
            </slot>
          </slot>
        </v-defaults-provider>
      </div>
      <slot />
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { useLoggedInState } from "~/composables/use-logged-in-state";
import { useRecipeCardMeta, type RecipeCardMeta } from "~/composables/recipes/use-recipe-card-meta";
import RecipeCardImage from "./RecipeCardImage.vue";
import RecipeContextMenu from "./RecipeContextMenu/RecipeContextMenu.vue";
import RecipeFavoriteBadge from "./RecipeFavoriteBadge.vue";
import type { ContextMenuItem } from "./RecipeContextMenu/RecipeContextMenu.vue";

interface Props {
  name: string;
  slug: string;
  description: string;
  rating?: number;
  image?: string;
  tags?: Array<any>;
  recipeId: string;
  vertical?: boolean;
  isFlat?: boolean;
  height?: number;
  disableHighlight?: boolean;
  contextMenuAppendItems?: ContextMenuItem[];
  contextMenuLeadingItems?: ContextMenuItem[];
  scale?: number;
  /** The recipe's times and categories, for the "35 min · Dinner" line under the title */
  meta?: RecipeCardMeta | null;
  /** Leave the favourite out, e.g. on meal plan entries where the row is about the plan */
  hideFavorite?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  rating: 0,
  image: undefined,
  tags: () => [],
  vertical: false,
  isFlat: false,
  height: 88,
  disableHighlight: false,
  scale: 1,
  meta: null,
  hideFavorite: false,
});

defineEmits<{
  mealplanRemove: [];
  mealplanEdit: [];
  selected: [];
  delete: [slug: string];
}>();

const auth = useMealieAuth();
const { isOwnGroup } = useLoggedInState();

const route = useRoute();
const groupSlug = computed(() => route.params.groupSlug || auth.user.value?.groupSlug || "");
const showRecipeContent = computed(() => props.recipeId && props.slug);
const recipeRoute = computed<string>(() => {
  if (!showRecipeContent.value) {
    return "";
  }

  const recipePath = `/g/${groupSlug.value}/r/${props.slug}`;
  // open the recipe at the same scale it's shown with here (e.g. the scale of a meal plan entry)
  return props.scale === 1 ? recipePath : `${recipePath}?scale=${props.scale}`;
});
const cursor = computed(() => showRecipeContent.value ? "pointer" : "auto");

// the square thumbnail fills the row's height, less its padding
const thumbSize = computed(() => Math.max(48, props.height - 16));

const { recipeCardMeta } = useRecipeCardMeta();
const metaText = computed(() => recipeCardMeta(props.meta));
</script>

<style scoped>
.mealie-row-card,
.flat {
  display: flex !important;
  align-items: center;
  gap: 14px;
  height: 100%;
  min-height: inherit;
  padding: 8px;
  border-radius: var(--mealie-radius-md) !important;
}

.mealie-row-card {
  background: var(--mealie-surface) !important;
  box-shadow: inset 0 0 0 1px var(--mealie-hairline) !important;
  transition:
    box-shadow var(--mealie-duration-hover) var(--mealie-ease),
    transform var(--mealie-duration-press) var(--mealie-ease);
}

@media (hover: hover) {
  .mealie-row-card:hover {
    box-shadow: inset 0 0 0 1px var(--mealie-hairline-strong) !important;
  }
}

.flat {
  box-shadow: none !important;
  background-color: transparent !important;
  padding-inline: 0;
}

.mealie-row-card-wrap {
  display: flex;
}

.mealie-row-card-wrap > .v-card {
  flex: 1;
  min-width: 0;
}

.mealie-row-card__thumb {
  flex: none;
  width: var(--row-thumb);
  height: var(--row-thumb);
  border-radius: var(--mealie-radius-sm);
  overflow: hidden;
  background: var(--mealie-placeholder);
}

.mealie-row-card__body {
  flex: 1;
  min-width: 0;
}

.mealie-row-card__title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  font-size: var(--mealie-text-body);
  font-weight: var(--mealie-weight-strong);
  line-height: 1.3;
  letter-spacing: -0.005em;
  color: var(--mealie-ink);
  overflow-wrap: anywhere;
}

.mealie-row-card__meta {
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--mealie-text-meta);
  color: var(--mealie-ink-3);
}

.mealie-row-card__meta--note {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  white-space: normal;
}

.mealie-row-card__actions {
  display: flex;
  flex: none;
  align-items: center;
  align-self: center;
}

.mealie-row-card__actions :deep(.v-btn) {
  width: 36px;
  height: 36px;
  color: var(--mealie-ink-3);
}

.mealie-row-card__actions :deep(.v-btn .v-icon) {
  font-size: 20px;
}

.mealie-row-card__actions :deep(.mealie-row-card__menu .v-btn .v-icon) {
  color: inherit !important;
}

/* vertical: the photo on top, as the timeline shows on phones */
.mealie-row-card--vertical {
  flex-direction: column;
  align-items: stretch;
}

.mealie-row-card--vertical .mealie-row-card__thumb {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
}

.mealie-row-card--vertical .mealie-row-card__actions {
  align-self: flex-end;
}

.disable-highlight :deep(.v-card__overlay) {
  opacity: 0 !important;
}
</style>
