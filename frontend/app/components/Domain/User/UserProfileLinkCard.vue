<template>
  <!-- A settings row: the whole card is the link, with its title, a line of description and a
       chevron. The stock illustrations and the separate blue "Manage ..." button are gone; the
       button's text names the link for assistive tech. `image` is still accepted, unused -->
  <RouterLink
    :to="link.to"
    class="profile-link mealie-card"
    :aria-label="link.text"
  >
    <span class="profile-link__text">
      <span class="profile-link__title">
        <slot name="title" />
      </span>
      <span class="profile-link__description">
        <slot name="default" />
      </span>
    </span>
    <v-icon size="18" class="profile-link__chevron">
      {{ $globals.icons.chevronRight }}
    </v-icon>
  </RouterLink>
</template>

<script setup lang="ts">
interface LinkProp {
  text: string;
  url?: string;
  to: string;
}

defineProps({
  link: {
    type: Object as () => LinkProp,
    required: true,
  },
  image: {
    type: String,
    required: false,
    default: "",
  },
});
</script>

<style scoped>
.profile-link {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100%;
  min-height: 76px;
  margin-top: 4px;
  padding: 16px 16px 16px 20px;
  border-radius: var(--mealie-radius-md);
  color: var(--mealie-ink);
  text-decoration: none;
  transition:
    box-shadow var(--mealie-duration-hover) var(--mealie-ease),
    transform var(--mealie-duration-press) var(--mealie-ease);
}

@media (hover: hover) {
  .profile-link:hover {
    box-shadow: inset 0 0 0 1px var(--mealie-hairline-strong);
  }
}

.profile-link:active {
  transform: scale(0.99);
}

.profile-link__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.profile-link__title {
  font-size: var(--mealie-text-body);
  font-weight: var(--mealie-weight-strong);
}

.profile-link__description {
  font-size: var(--mealie-text-meta);
  line-height: 1.45;
  color: var(--mealie-ink-3);
}

.profile-link__chevron {
  flex-shrink: 0;
  color: var(--mealie-ink-4);
}
</style>
