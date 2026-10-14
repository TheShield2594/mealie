import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, test } from "vitest";

const appDir = join(__dirname, "../../..");

// Paper has no text size setting, and the logo keeps its size on purpose
const allowed = new Set(["components/Domain/Recipe/RecipePrintContainer.vue", "components/Layout/LayoutParts/AppHeader.vue:15px"]);

function styleFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === "node_modules" || name === "__tests__" ? [] : styleFiles(path);
    }
    return /\.(vue|scss|css)$/.test(name) ? [path] : [];
  });
}

describe("type scale", () => {
  test("font sizes come from the type scale, so text follows the reader's text size", () => {
    const pixelSizes = styleFiles(appDir).flatMap((path) => {
      const file = relative(appDir, path);
      if (allowed.has(file)) {
        return [];
      }
      return [...readFileSync(path, "utf8").matchAll(/font-size:\s*(\d+(?:\.\d+)?px)/g)]
        .map(match => `${file}:${match[1]}`)
        .filter(entry => !allowed.has(entry));
    });

    expect(pixelSizes).toEqual([]);
  });
});
