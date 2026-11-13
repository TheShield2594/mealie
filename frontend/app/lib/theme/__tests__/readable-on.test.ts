import { describe, expect, test } from "vitest";
import { contrast, readableInk, readableOn, withReadableOn } from "../readable-on";

describe("readableOn", () => {
  test.each([
    // the light theme's terracotta keeps white labels
    ["#C4502A", "#FFFFFF"],
    // the dark theme's brighter terracotta falls short of 4.5:1 with white, so it gets ink
    ["#E0683C", "#1C1B19"],
    ["#5E9BD1", "#1C1B19"],
    ["#1976D2", "#FFFFFF"],
    ["#000", "#FFFFFF"],
    ["fff", "#1C1B19"],
  ])("picks the readable label colour for %s", (color, expected) => {
    expect(readableOn(color)).toBe(expected);
  });

  test("falls back to white for anything that isn't a hex colour", () => {
    expect(readableOn("rgb(1, 2, 3)")).toBe("#FFFFFF");
  });
});

describe("withReadableOn", () => {
  test("adds a label colour for each named colour and leaves the rest alone", () => {
    const colors = withReadableOn({ warning: "#FF6D00", info: "#1976D2", surface: "#FFFFFF" }, ["warning", "info"]);

    expect(colors).toEqual({
      "warning": "#FF6D00",
      "on-warning": "#1C1B19",
      "info": "#1976D2",
      "on-info": "#FFFFFF",
      "surface": "#FFFFFF",
    });
  });
});

describe("default status colours", () => {
  // alerts and status text draw these colours as text on the page, the sidebar and cards
  test.each([
    ["light", ["#2A7531", "#1565C0", "#A84B0A", "#B3261E"], ["#FAF9F7", "#F3F1ED", "#FFFFFF"]],
    ["dark", ["#4CAF50", "#5E9BD1", "#FF6D00", "#F2706C"], ["#141311", "#191816", "#1D1C1A"]],
  ])("meet 4.5:1 as text in the %s theme", (_, colors, backgrounds) => {
    for (const color of colors) {
      for (const background of backgrounds) {
        expect(contrast(color, background)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe("readableInk", () => {
  const light = ["#FAF9F7", "#F3F1ED", "#FFFFFF"];
  const dark = ["#141311", "#191816", "#1D1C1A"];

  test("darkens the light theme's terracotta just enough for small text", () => {
    const ink = readableInk("#C4502A", light, false);
    expect(ink).not.toBe("#C4502A");
    for (const background of light) {
      expect(contrast(ink, background)).toBeGreaterThanOrEqual(4.6);
    }
    // still recognisably the accent, not near-black
    expect(contrast(ink, "#C4502A")).toBeLessThan(1.5);
  });

  test("leaves an accent that already passes alone", () => {
    expect(readableInk("#E0683C", dark, true)).toBe("#E0683C");
  });

  test("lightens a dark accent in the dark theme", () => {
    const ink = readableInk("#973542", dark, true);
    for (const background of dark) {
      expect(contrast(ink, background)).toBeGreaterThanOrEqual(4.6);
    }
  });

  test("returns anything that isn't a hex colour unchanged", () => {
    expect(readableInk("rebeccapurple", light, false)).toBe("rebeccapurple");
  });
});
