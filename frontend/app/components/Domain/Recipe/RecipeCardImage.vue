<template>
  <v-img
    v-if="showImage"
    class="recipe-card-image"
    :height="height"
    cover
    :min-height="minHeight"
    max-height="fill-height"
    :src="getImage(recipeId)"
    :alt="name || undefined"
    @click="$emit('click')"
    @load="fallBackImage = false"
    @error="fallBackImage = true"
  >
    <slot />
  </v-img>
  <!-- No photo: the warm placeholder with the recipe's initial in the display serif, so a missing
       photo reads as deliberate rather than broken. Without a name, a small quiet icon instead -->
  <div
    v-else
    class="recipe-card-image recipe-card-image--empty"
    :style="{ height: cssSize(height), minHeight: cssSize(minHeight) }"
    @click="$emit('click')"
  >
    <span v-if="initial" class="recipe-card-image__initial" aria-hidden="true">{{ initial }}</span>
    <v-icon
      v-else
      class="recipe-card-image__icon"
      :size="Math.min(Number(iconSize) || 40, 40)"
    >
      {{ $globals.icons.primary }}
    </v-icon>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { useStaticRoutes } from "~/composables/api";

interface Props {
  tiny?: boolean | null;
  small?: boolean | null;
  large?: boolean | null;
  iconSize?: number | string;
  slug?: string | null;
  recipeId: string;
  // Recipe.image is typed unknown in the generated API types, so callers
  // passing it directly cannot narrow to string here.
  imageVersion?: unknown;
  height?: number | string;
  minHeight?: number | string;
  /** The recipe's name: its first letter stands in when there is no photo, and it is the alt text */
  name?: string | null;
}
const props = withDefaults(defineProps<Props>(), {
  tiny: null,
  small: null,
  large: null,
  iconSize: 100,
  slug: null,
  imageVersion: null,
  height: "100%",
  minHeight: 125,
  name: null,
});

defineEmits<{
  click: [];
}>();

const { recipeImage, recipeSmallImage, recipeTinyImage } = useStaticRoutes();

const fallBackImage = ref(false);

const initial = computed(() => {
  const first = props.name?.trim().match(/\p{L}|\p{N}/u)?.[0];
  return first ? first.toLocaleUpperCase() : "";
});

function cssSize(size: number | string | undefined) {
  return typeof size === "number" ? `${size}px` : size;
}

// Recipes without an image have no image version, so there is nothing to fetch.
// Rendering the image anyway would only produce a 404 before falling back.
const showImage = computed(() => !!props.imageVersion && !fallBackImage.value);

const imageSize = computed(() => {
  if (props.tiny) return "tiny";
  if (props.small) return "small";
  if (props.large) return "large";
  return "large";
});

watch(
  [() => props.recipeId, () => props.imageVersion],
  () => {
    fallBackImage.value = false;
  },
);

function getImage(recipeId: string) {
  switch (imageSize.value) {
    case "tiny":
      return recipeTinyImage(recipeId, props.imageVersion);
    case "small":
      return recipeSmallImage(recipeId, props.imageVersion);
    case "large":
      return recipeImage(recipeId, props.imageVersion);
  }
}
</script>

<style scoped>
/* the placeholder colour shows while a photo loads, so the grid never flashes white */
.recipe-card-image {
  background: var(--mealie-placeholder);
}

.recipe-card-image--empty {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  overflow: hidden;
  color: var(--mealie-placeholder-ink);
  container-type: size;
}

.recipe-card-image__initial {
  font-family: var(--mealie-font-display);
  font-size: clamp(22px, 32cqh, 56px);
  font-weight: 500;
  line-height: 1;
  user-select: none;
}

.recipe-card-image__icon {
  color: var(--mealie-placeholder-ink);
  opacity: 0.7;
}

.recipe-card-image--empty > :slotted(div) {
  top: 0;
  position: absolute;
  z-index: 1;
}
</style>
