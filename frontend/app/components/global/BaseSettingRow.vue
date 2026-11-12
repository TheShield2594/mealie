<template>
  <!-- One setting in a grouped list: what it is and what it does on the left, the switch on the
       right, the whole row clickable. Rows sit in a .base-setting-group, divided by hairlines -->
  <div class="base-setting-row">
    <label class="base-setting-row__text" :for="inputId">
      <span class="base-setting-row__title">{{ title }}</span>
      <span v-if="description || $slots.description" class="base-setting-row__description">
        <slot name="description">{{ description }}</slot>
      </span>
    </label>
    <div class="base-setting-row__control">
      <slot name="control">
        <v-switch
          :id="inputId"
          v-model="model"
          color="primary"
          density="compact"
          inset
          hide-details
        />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();

const model = defineModel<boolean | null | undefined>();
const inputId = useId();
</script>

<style scoped>
.base-setting-row {
  display: flex;
  align-items: center;
  gap: var(--mealie-space-5);
  min-height: 64px;
  padding: var(--mealie-space-3) var(--mealie-space-5);
}

.base-setting-row + .base-setting-row {
  border-top: 1px solid var(--mealie-hairline);
}

.base-setting-row__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  cursor: pointer;
}

.base-setting-row__title {
  font-size: var(--mealie-text-body);
  font-weight: var(--mealie-weight-strong);
  color: var(--mealie-ink);
}

.base-setting-row__description {
  font-size: var(--mealie-text-meta);
  line-height: 1.45;
  color: var(--mealie-ink-3);
}

.base-setting-row__control {
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .base-setting-row {
    padding: var(--mealie-space-3) var(--mealie-space-4);
    gap: var(--mealie-space-4);
  }
}
</style>
