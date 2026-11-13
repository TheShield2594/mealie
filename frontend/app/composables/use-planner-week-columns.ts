import { useMediaQuery } from "@vueuse/core";

/**
 * Whether the planner lays its days out as one row of columns, a week at a glance. Only on
 * wide windows, and only for up to a week of days: below about 1400px a column would be too
 * narrow for a recipe's photo and name.
 */
export function usePlannerWeekColumns(dayCount: () => number) {
  const wide = useMediaQuery("(min-width: 1400px)");
  return computed(() => wide.value && dayCount() > 1 && dayCount() <= 7);
}
