<template>
  <!-- One placeholder block for skeleton layouts: the shape of what's coming, in the placeholder
       colour, breathing gently. The surrounding layout carries aria-busy and a label; the blocks
       themselves are hidden from assistive tech. Reduce Motion stills the pulse -->
  <span
    class="base-skeleton"
    :class="`base-skeleton--${radius}`"
    :style="{ width: cssSize(width), height: aspectRatio ? undefined : cssSize(height), aspectRatio }"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
interface Props {
  width?: number | string;
  height?: number | string;
  /** e.g. "4 / 3"; when set, height follows from the width */
  aspectRatio?: string;
  radius?: "xs" | "sm" | "md" | "lg" | "pill";
}

withDefaults(defineProps<Props>(), {
  width: "100%",
  height: 14,
  aspectRatio: undefined,
  radius: "xs",
});

function cssSize(size: number | string) {
  return typeof size === "number" ? `${size}px` : size;
}
</script>

<style scoped>
.base-skeleton {
  display: block;
  max-width: 100%;
  background: var(--mealie-placeholder);
  animation: base-skeleton-pulse 1.6s var(--mealie-ease) infinite;
}

.base-skeleton--xs {
  border-radius: var(--mealie-radius-xs);
}

.base-skeleton--sm {
  border-radius: var(--mealie-radius-sm);
}

.base-skeleton--md {
  border-radius: var(--mealie-radius-md);
}

.base-skeleton--lg {
  border-radius: var(--mealie-radius-lg);
}

.base-skeleton--pill {
  border-radius: var(--mealie-radius-pill);
}

@keyframes base-skeleton-pulse {
  50% {
    opacity: 0.55;
  }
}
</style>
