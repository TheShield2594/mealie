const ON_LIGHT = "#FFFFFF";
const ON_DARK = "#1C1B19";

function relativeLuminance(hex: string): number {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map(c => c + c).join("") : value;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const channel = Number.parseInt(full.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function contrast(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

/**
 * Text colour for a filled button or badge in the given colour: white or near-black, whichever
 * contrasts more by WCAG. Vuetify chooses with APCA, which keeps white on mid-tone oranges such
 * as the dark theme's primary, where it falls short of the 4.5:1 that button labels need.
 */
export function readableOn(color: string): string {
  if (!/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) {
    return ON_LIGHT;
  }
  return contrast(color, ON_LIGHT) >= contrast(color, ON_DARK) ? ON_LIGHT : ON_DARK;
}

/**
 * Adds an `on-<name>` label colour, chosen by readableOn, for each named colour in the palette,
 * so text on any filled button, chip or alert stays legible whatever colours the theme sets
 */
export function withReadableOn<T extends Record<string, string>>(colors: T, names: readonly (keyof T & string)[]): Record<string, string> {
  const result: Record<string, string> = { ...colors };
  for (const name of names) {
    result[`on-${name}`] = readableOn(colors[name]!);
  }
  return result;
}

function toHex(channels: number[]): string {
  return `#${channels.map(c => Math.round(c).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function channels(hex: string): number[] {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map(c => c + c).join("") : value;
  return [0, 2, 4].map(i => Number.parseInt(full.slice(i, i + 2), 16));
}

/**
 * The colour to use when an accent is drawn as text (links, eyebrows, "today"): the accent itself
 * when it already reaches the target contrast on every given background, otherwise the accent
 * mixed towards black (light themes) or white (dark themes) just far enough to get there. Keeps
 * a custom theme's hue while making small accent text pass WCAG AA.
 */
export function readableInk(color: string, backgrounds: string[], dark: boolean, target = 4.6): string {
  const valid = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
  if (!valid.test(color) || !backgrounds.every(b => valid.test(b))) {
    return color;
  }
  const base = channels(color);
  const towards = dark ? 255 : 0;
  for (let step = 0; step <= 20; step++) {
    const mix = step / 20;
    const candidate = toHex(base.map(c => c + (towards - c) * mix));
    if (backgrounds.every(b => contrast(candidate, b) >= target)) {
      return step === 0 ? color : candidate;
    }
  }
  return dark ? "#FFFFFF" : "#000000";
}
