<template>
  <!-- The one empty / not-found state (DESIGN_AUDIT.md §8.4): a quiet icon, a one-line title, one
       sentence, and at most one action. Never a toast on a blank page, never an error colour -->
  <div
    class="base-empty-state"
    :class="{ 'base-empty-state--compact': compact }"
    role="status"
  >
    <div v-if="icon" class="base-empty-state__icon" aria-hidden="true">
      <v-icon :size="compact ? 22 : 26">
        {{ icon }}
      </v-icon>
    </div>
    <component :is="headingTag" class="base-empty-state__title">
      {{ title }}
    </component>
    <p v-if="description" class="base-empty-state__description">
      {{ description }}
    </p>
    <div v-if="$slots.actions" class="base-empty-state__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  description?: string | null;
  icon?: string | null;
  /** Tighter spacing for use inside a card or list */
  compact?: boolean;
  /** "h1" when the state is the whole page (e.g. not found), so the page still has a heading */
  headingTag?: "h1" | "h2" | "h3";
}

withDefaults(defineProps<Props>(), {
  description: null,
  icon: null,
  compact: false,
  headingTag: "h2",
});
</script>

<style scoped>
.base-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 420px;
  margin: 0 auto;
  padding: var(--mealie-space-8) var(--mealie-space-4);
  text-align: center;
  color: var(--mealie-ink);
}

.base-empty-state--compact {
  padding: var(--mealie-space-6) var(--mealie-space-4);
}

.base-empty-state__icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin-bottom: var(--mealie-space-4);
  border-radius: 50%;
  background: var(--mealie-fill-subtle);
  color: var(--mealie-ink-3);
}

.base-empty-state--compact .base-empty-state__icon {
  width: 44px;
  height: 44px;
  margin-bottom: var(--mealie-space-3);
}

.base-empty-state__icon :deep(.v-icon) {
  color: inherit;
}

.base-empty-state__title {
  margin: 0;
  font-size: var(--mealie-text-body-lg);
  font-weight: var(--mealie-weight-strong);
  line-height: 1.35;
  letter-spacing: -0.005em;
}

.base-empty-state__description {
  margin: 6px 0 0;
  font-size: var(--mealie-text-body);
  line-height: 1.5;
  color: var(--mealie-ink-3);
  text-wrap: pretty;
}

.base-empty-state__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--mealie-space-2);
  margin-top: var(--mealie-space-5);
}
</style>
