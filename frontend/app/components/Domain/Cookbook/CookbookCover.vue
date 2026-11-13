<template>
  <!-- A cookbook on the shelf: a cover made from its first recipes' photos, then its name.
       One photo fills the cover, two or three sit side by side, four make a 2x2 grid; a cookbook
       with nothing in it (or no photos) shows its colour and initial instead -->
  <RouterLink :to="to" class="cookbook-cover">
    <div class="cookbook-cover__art" :class="`cookbook-cover__art--${photos.length}`">
      <template v-if="photos.length">
        <img
          v-for="recipe in photos"
          :key="recipe.id"
          :src="recipeSmallImage(recipe.id!, recipe.image)"
          alt=""
          loading="lazy"
          class="cookbook-cover__photo"
        >
      </template>
      <div v-else-if="loaded" class="cookbook-cover__empty">
        <span class="cookbook-cover__swatch" :style="{ background: color }" />
        <span class="cookbook-cover__initial">{{ initial }}</span>
      </div>
    </div>
    <div class="cookbook-cover__name">
      {{ cookbook.name }}
    </div>
    <div v-if="cookbook.description" class="cookbook-cover__description">
      {{ cookbook.description }}
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { useStaticRoutes, useUserApi } from "~/composables/api";
import type { ReadCookBook } from "~/lib/api/types/cookbook";
import type { RecipeSummary } from "~/lib/api/types/recipe";

interface Props {
  cookbook: ReadCookBook;
  to: string;
  color: string;
}
const props = defineProps<Props>();

const { recipeSmallImage } = useStaticRoutes();
const recipes = ref<RecipeSummary[]>([]);
const loaded = ref(false);

// up to four, and only those with photos; three would leave a hole in a 2x2 grid, so use two
const photos = computed(() => {
  const withPhotos = recipes.value.filter(recipe => recipe.id && recipe.image);
  return withPhotos.length === 3 ? withPhotos.slice(0, 2) : withPhotos.slice(0, 4);
});

const initial = computed(() => props.cookbook.name?.trim().match(/\p{L}|\p{N}/u)?.[0]?.toLocaleUpperCase() ?? "");

onMounted(async () => {
  const { data } = await useUserApi().recipes.getAll(1, 8, {
    cookbook: props.cookbook.slug,
    orderBy: "created_at",
    orderDirection: "desc",
  });
  recipes.value = data?.items ?? [];
  loaded.value = true;
});
</script>

<style scoped>
.cookbook-cover {
  display: block;
  min-width: 0;
  color: var(--mealie-ink);
  text-decoration: none;
}

.cookbook-cover__art {
  display: grid;
  gap: 2px;
  aspect-ratio: 4 / 3;
  border-radius: var(--mealie-radius-md);
  overflow: hidden;
  background: var(--mealie-placeholder);
  transition: transform var(--mealie-duration-enter) var(--mealie-ease);
}

.cookbook-cover__art--2 {
  grid-template-columns: 1fr 1fr;
}

.cookbook-cover__art--4 {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
}

.cookbook-cover__photo {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
  object-fit: cover;
}

@media (hover: hover) {
  .cookbook-cover:hover .cookbook-cover__art {
    transform: translateY(-2px);
  }
}

.cookbook-cover:active .cookbook-cover__art {
  transform: scale(0.99);
}

.cookbook-cover__empty {
  position: relative;
  display: grid;
  place-items: center;
  color: var(--mealie-placeholder-ink);
}

.cookbook-cover__swatch {
  position: absolute;
  top: 12px;
  left: 12px;
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.cookbook-cover__initial {
  font-family: var(--mealie-font-display);
  font-size: 44px;
  font-weight: 500;
  line-height: 1;
}

.cookbook-cover__name {
  margin-top: 12px;
  font-size: var(--mealie-text-body);
  font-weight: var(--mealie-weight-strong);
  line-height: 1.35;
}

.cookbook-cover__description {
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--mealie-text-meta);
  color: var(--mealie-ink-3);
}

.cookbook-cover:focus-visible {
  outline-offset: 4px;
  border-radius: var(--mealie-radius-md);
}
</style>
