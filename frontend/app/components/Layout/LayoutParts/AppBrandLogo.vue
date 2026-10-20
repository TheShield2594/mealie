<template>
  <!-- decorative: it always sits next to the app name -->
  <img
    v-if="logoUrl"
    :src="logoUrl"
    alt=""
    class="app-logo"
    :width="size"
    :height="size"
  >
  <v-icon
    v-else
    :size="size"
    color="primary"
    class="app-logo"
    aria-hidden="true"
  >
    {{ $globals.icons.primary }}
  </v-icon>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 28 });

const { logoUrl } = useBranding();
</script>

<style scoped>
.app-logo {
  flex-shrink: 0;
  object-fit: contain;
}
</style>
