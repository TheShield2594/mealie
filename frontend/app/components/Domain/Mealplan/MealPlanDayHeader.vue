<template>
  <div class="plan-day-header">
    <div class="plan-day-header__text">
      <span class="plan-day-header__weekday" :class="{ 'plan-day-header__weekday--today': isCurrent }">
        {{ weekday }}
      </span>
      <span class="plan-day-header__date">{{ date }}</span>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { endOfDay, isSameDay, isWithinInterval, startOfDay } from "date-fns";

interface Props {
  day: Date;
  /** Set for a week, whose meals aren't planned for a specific day */
  endDate?: Date | null;
};
const props = defineProps<Props>();

const i18n = useI18n();
const isCurrent = computed(() => {
  const today = new Date();
  return props.endDate
    ? isWithinInterval(today, { start: startOfDay(props.day), end: endOfDay(props.endDate) })
    : isSameDay(props.day, today);
});
const dateFormat = computed(() => new Intl.DateTimeFormat(i18n.locale.value, { month: "long", day: "numeric" }));
// a week shows its first and last day, e.g. "March 3 – 9"
const date = computed(() =>
  props.endDate ? dateFormat.value.formatRange(props.day, props.endDate) : dateFormat.value.format(props.day),
);
const weekday = computed(() =>
  props.endDate
    ? i18n.t("meal-plan.whole-week")
    : new Intl.DateTimeFormat(i18n.locale.value, { weekday: "long" }).format(props.day),
);
</script>

<style scoped>
.plan-day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
}

.plan-day-header__text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.plan-day-header__weekday {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--mealie-text-tertiary);
}

.plan-day-header__weekday--today {
  color: var(--mealie-accent-ink);
}

.plan-day-header__date {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--mealie-ink);
}
</style>
