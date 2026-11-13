<template>
  <div
    v-if="wakeIsSupported"
    class="d-print-none d-flex px-2 justify-end wakelock-switch"
  >
    <!-- a small preference at the foot of the page, not a centred control competing with it -->
    <v-switch
      v-model="wakeLock"
      color="primary"
      density="compact"
      hide-details
      :label="$t('recipe.screen-awake')"
    />
  </div>
</template>

<script setup lang="ts">
import { useWakeLock } from "@vueuse/core";
import { useUserExperiencePreferences } from "~/composables/use-users/preferences";

const { isSupported: wakeIsSupported, isActive, request, release } = useWakeLock();
const userExperiencePreferences = useUserExperiencePreferences();

function handleLock() {
  if (userExperiencePreferences.value.lockScreen) {
    lockScreen();
  }
  else {
    unlockScreen();
  }
}

const wakeLock = computed({
  get: () => userExperiencePreferences.value.lockScreen,
  set: () => {
    userExperiencePreferences.value.lockScreen = !userExperiencePreferences.value.lockScreen;
    handleLock();
  },
});
async function lockScreen() {
  if (wakeIsSupported) {
    console.debug("Wake Lock Requested");
    // the browser may refuse: always on plain HTTP, and when the page is hidden or the battery is
    // low. That's not an error worth surfacing; the screen simply follows its normal timeout
    try {
      await request("screen");
    }
    catch (error) {
      console.debug("Wake Lock refused", error);
    }
  }
}
async function unlockScreen() {
  if (wakeIsSupported || isActive.value) {
    console.debug("Wake Lock Released");
    try {
      await release();
    }
    catch (error) {
      console.debug("Wake Lock release failed", error);
    }
  }
}
onMounted(() => handleLock());
onUnmounted(() => unlockScreen());
</script>

<style scoped>
.wakelock-switch {
  margin-top: var(--mealie-space-4);
}

.wakelock-switch :deep(.v-label) {
  font-size: var(--mealie-text-meta);
  color: var(--mealie-ink-3);
  opacity: 1;
}
</style>
