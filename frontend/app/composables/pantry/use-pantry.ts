import { useLocalStorage } from "@vueuse/core";
import { differenceInCalendarDays, parseISO } from "date-fns";
import type { PantryItemOut, PantryUsageItemOut, PantryUsageStatus } from "~/lib/api/types/household";
import type { IngredientUnit } from "~/lib/api/types/recipe";

/** Items expiring within this many days are flagged as soon */
export const EXPIRES_SOON_DAYS = 3;

/** Locations offered before the household has made up any of its own */
export const DEFAULT_PANTRY_LOCATIONS = ["fridge", "freezer", "pantry-shelf", "spice-rack"] as const;

export type ExpiryState = "expired" | "soon" | "ok";

export function formatPantryQuantity(quantity: number): string {
  return String(Math.round(quantity * 100) / 100);
}

/** The unit's name to show next to a quantity, singular or plural to match it */
export function pantryUnitName(quantity: number, unit?: IngredientUnit | null): string {
  if (!unit) {
    return "";
  }

  const plural = quantity !== 1;
  if (unit.useAbbreviation) {
    const abbreviation = plural ? unit.pluralAbbreviation || unit.abbreviation : unit.abbreviation;
    if (abbreviation) {
      return abbreviation;
    }
  }
  return (plural ? unit.pluralName || unit.name : unit.name) || "";
}

/** "2 cups", "1 kg", or an empty string when the amount isn't tracked */
export function formatPantryAmount(quantity: number | null | undefined, unit?: IngredientUnit | null): string {
  if (quantity === null || quantity === undefined) {
    return "";
  }

  return [formatPantryQuantity(quantity), pantryUnitName(quantity, unit)].filter(Boolean).join(" ");
}

export function expiryState(expiresOn: string | null | undefined, today: Date = new Date()): ExpiryState | null {
  if (!expiresOn) {
    return null;
  }

  const days = differenceInCalendarDays(parseISO(expiresOn), today);
  if (days < 0) {
    return "expired";
  }
  return days <= EXPIRES_SOON_DAYS ? "soon" : "ok";
}

export function isLow(item: Pick<PantryItemOut, "quantity" | "minimumQuantity">): boolean {
  return item.quantity !== null && item.quantity !== undefined
    && item.minimumQuantity !== null && item.minimumQuantity !== undefined
    && item.quantity < item.minimumQuantity;
}

export interface PantryGroup {
  /** The location as stored, or null for items without one */
  location: string | null;
  items: PantryItemOut[];
}

/**
 * Groups items by location, alphabetically with the unlocated ones last.
 * Within a group, items expiring soonest come first, then the rest by food name.
 */
export function groupPantryItems(items: PantryItemOut[]): PantryGroup[] {
  const groups = new Map<string | null, PantryItemOut[]>();
  for (const item of items) {
    const location = item.location?.trim() || null;
    groups.set(location, [...(groups.get(location) || []), item]);
  }

  const byExpiryThenName = (a: PantryItemOut, b: PantryItemOut) => {
    if (a.expiresOn && b.expiresOn && a.expiresOn !== b.expiresOn) {
      return a.expiresOn < b.expiresOn ? -1 : 1;
    }
    if (!!a.expiresOn !== !!b.expiresOn) {
      return a.expiresOn ? -1 : 1;
    }
    return (a.food.name || "").localeCompare(b.food.name || "");
  };

  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === null) return 1;
      if (b === null) return -1;
      return a.localeCompare(b);
    })
    .map(([location, groupItems]) => ({ location, items: [...groupItems].sort(byExpiryThenName) }));
}

export function matchesPantrySearch(item: PantryItemOut, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) {
    return true;
  }

  return [item.food.name, item.food.pluralName, item.location, item.note]
    .some(value => value?.toLowerCase().includes(term));
}

/** The shopping list last used to restock the pantry, remembered per browser */
export function usePantryRestockList() {
  return useLocalStorage<string | null>("pantry-restock-list", null);
}

export interface PantryUsageRow {
  pantryItem: PantryItemOut;
  /** How much to take, in the pantry item's unit; null when there's nothing to subtract */
  quantity: number | null;
  /** Whether the change is applied; for untracked items it means "used it up" */
  selected: boolean;
  status: PantryUsageStatus;
}

const STATUS_RANK: Record<PantryUsageStatus, number> = {
  ok: 0,
  untracked: 1,
  insufficient: 2,
  unit_mismatch: 3,
  missing: 4,
};

/**
 * One row per pantry item the recipe draws on, adding up ingredients that share an item.
 * Untracked and unconvertible items start unticked, since there's no amount to take off.
 */
export function buildPantryUsageRows(usage: PantryUsageItemOut[]): { rows: PantryUsageRow[]; missing: PantryUsageItemOut[] } {
  const rows = new Map<string, PantryUsageRow>();
  const missing: PantryUsageItemOut[] = [];

  for (const use of usage) {
    if (!use.pantryItem) {
      missing.push(use);
      continue;
    }

    const existing = rows.get(use.pantryItem.id);
    if (!existing) {
      rows.set(use.pantryItem.id, {
        pantryItem: use.pantryItem,
        quantity: use.quantity ?? null,
        selected: use.status === "ok" || use.status === "insufficient",
        status: use.status,
      });
      continue;
    }

    if (use.quantity !== null && use.quantity !== undefined) {
      existing.quantity = (existing.quantity ?? 0) + use.quantity;
    }
    if (STATUS_RANK[use.status] > STATUS_RANK[existing.status]) {
      existing.status = use.status;
    }
  }

  return { rows: [...rows.values()], missing };
}
