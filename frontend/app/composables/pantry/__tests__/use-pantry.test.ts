import { describe, expect, test } from "vitest";
import type { PantryItemOut, PantryUsageItemOut } from "~/lib/api/types/household";
import type { IngredientUnit } from "~/lib/api/types/recipe";
import { buildPantryUsageRows, expiryState, formatPantryAmount, groupPantryItems, isLow, matchesPantrySearch } from "../use-pantry";

function item(overrides: Partial<PantryItemOut> & { name?: string } = {}): PantryItemOut {
  const { name = "flour", ...rest } = overrides;
  return {
    id: Math.random().toString(),
    groupId: "g",
    householdId: "h",
    foodId: name,
    food: { id: name, name },
    ...rest,
  };
}

const cup: IngredientUnit = { id: "cup", name: "cup", pluralName: "cups", abbreviation: "c" };

describe("formatPantryAmount", () => {
  test("leaves untracked amounts empty", () => {
    expect(formatPantryAmount(null, cup)).toBe("");
    expect(formatPantryAmount(undefined)).toBe("");
  });
  test("uses the singular or plural unit name", () => {
    expect(formatPantryAmount(1, cup)).toBe("1 cup");
    expect(formatPantryAmount(2.5, cup)).toBe("2.5 cups");
    expect(formatPantryAmount(0, cup)).toBe("0 cups");
  });
  test("uses the abbreviation when the unit asks for it", () => {
    expect(formatPantryAmount(2, { ...cup, useAbbreviation: true })).toBe("2 c");
  });
  test("rounds and drops a missing unit", () => {
    expect(formatPantryAmount(1 / 3)).toBe("0.33");
  });
});

describe("expiryState", () => {
  const today = new Date(2026, 9, 30);
  test.each([
    [null, null],
    ["2026-10-29", "expired"],
    ["2026-10-30", "soon"],
    ["2026-11-02", "soon"],
    ["2026-11-03", "ok"],
  ])("%s is %s", (expiresOn, expected) => {
    expect(expiryState(expiresOn, today)).toBe(expected);
  });
});

describe("isLow", () => {
  test("only tracked items with a minimum can be low", () => {
    expect(isLow({ quantity: 1, minimumQuantity: 2 })).toBe(true);
    expect(isLow({ quantity: 2, minimumQuantity: 2 })).toBe(false);
    expect(isLow({ quantity: null, minimumQuantity: 2 })).toBe(false);
    expect(isLow({ quantity: 0, minimumQuantity: null })).toBe(false);
  });
});

describe("groupPantryItems", () => {
  test("groups by location with unlocated items last", () => {
    const groups = groupPantryItems([
      item({ name: "rice" }),
      item({ name: "milk", location: "Fridge" }),
      item({ name: "peas", location: "Freezer" }),
      item({ name: "eggs", location: " Fridge " }),
    ]);

    expect(groups.map(g => g.location)).toEqual(["Freezer", "Fridge", null]);
    expect(groups[1]!.items.map(i => i.food.name)).toEqual(["eggs", "milk"]);
  });
  test("puts what expires first at the top", () => {
    const [group] = groupPantryItems([
      item({ name: "apples" }),
      item({ name: "yogurt", expiresOn: "2026-11-05" }),
      item({ name: "milk", expiresOn: "2026-11-01" }),
    ]);

    expect(group!.items.map(i => i.food.name)).toEqual(["milk", "yogurt", "apples"]);
  });
});

describe("matchesPantrySearch", () => {
  test("matches food, location and note", () => {
    const milk = item({ name: "Milk", location: "Fridge", note: "oat" });
    expect(matchesPantrySearch(milk, "")).toBe(true);
    expect(matchesPantrySearch(milk, "mil")).toBe(true);
    expect(matchesPantrySearch(milk, "fridge")).toBe(true);
    expect(matchesPantrySearch(milk, "OAT")).toBe(true);
    expect(matchesPantrySearch(milk, "rice")).toBe(false);
  });
});

describe("buildPantryUsageRows", () => {
  const milk = item({ name: "milk", id: "milk-item" });
  const salt = item({ name: "salt", id: "salt-item" });
  const butter = item({ name: "butter", id: "butter-item" });
  const use = (overrides: Partial<PantryUsageItemOut>): PantryUsageItemOut => ({
    food: { id: "f", name: "f" },
    status: "ok",
    ...overrides,
  });

  test("adds up ingredients that draw on the same item", () => {
    const { rows } = buildPantryUsageRows([
      use({ pantryItem: milk, quantity: 2 }),
      use({ pantryItem: milk, quantity: 1, status: "insufficient" }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ quantity: 3, status: "insufficient", selected: true });
  });
  test("leaves untracked and unconvertible items unticked", () => {
    const { rows } = buildPantryUsageRows([
      use({ pantryItem: salt, status: "untracked" }),
      use({ pantryItem: butter, status: "unit_mismatch" }),
    ]);

    expect(rows.map(r => [r.pantryItem.id, r.selected, r.quantity])).toEqual([
      ["salt-item", false, null],
      ["butter-item", false, null],
    ]);
  });
  test("lists what isn't in the pantry separately", () => {
    const saffron = use({ food: { id: "saffron", name: "saffron" }, status: "missing" });
    const { rows, missing } = buildPantryUsageRows([saffron]);

    expect(rows).toEqual([]);
    expect(missing).toEqual([saffron]);
  });
});
