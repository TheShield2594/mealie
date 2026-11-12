import { describe, expect, test } from "vitest";
import { recipeCardMetaText } from "../use-recipe-card-meta";
import { recipeShortTime } from "../use-recipe-time";

const shortTime = (meta: Parameters<typeof recipeShortTime>[0]) => recipeShortTime(meta, "en-US");

describe("recipeCardMetaText", () => {
  test("joins the time and the first category", () => {
    const meta = { totalTimeSeconds: 2100, recipeCategory: [{ name: "Dinner" }, { name: "Quick" }] };
    expect(recipeCardMetaText(meta, shortTime)).toBe(`${recipeShortTime(meta, "en-US")} · Dinner`);
  });

  test("shows whichever part it has", () => {
    expect(recipeCardMetaText({ recipeCategory: [{ name: "Dessert" }] }, shortTime)).toBe("Dessert");
    expect(recipeCardMetaText({ totalTime: "overnight" }, shortTime)).toBe("overnight");
  });

  test("is empty without a recipe or anything to show", () => {
    expect(recipeCardMetaText(null, shortTime)).toBe("");
    expect(recipeCardMetaText({}, shortTime)).toBe("");
  });
});
