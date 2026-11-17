import { beforeEach, describe, expect, test, vi } from "vitest";

const store = new Map<string, string>();
let native = true;

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native },
}));

vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: store.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => void store.set(key, value),
    remove: async ({ key }: { key: string }) => void store.delete(key),
  },
}));

const server = await import("../server");

describe("normalizeServerUrl", () => {
  test.each([
    ["mealie.example.com", "https://mealie.example.com"],
    ["  https://mealie.example.com/  ", "https://mealie.example.com"],
    ["http://192.168.1.20:9925", "http://192.168.1.20:9925"],
    ["example.com/mealie/", "https://example.com/mealie"],
    ["https://example.com/mealie?x=1#top", "https://example.com/mealie"],
  ])("%s -> %s", (input, expected) => {
    expect(server.normalizeServerUrl(input)).toBe(expected);
  });

  test.each(["", "   ", "ftp://example.com", "javascript:alert(1)", "http://"])("rejects %j", (input) => {
    expect(server.normalizeServerUrl(input)).toBeNull();
  });
});

describe("server and token state", () => {
  beforeEach(async () => {
    native = true;
    await server.clearServerOrigin();
  });

  test("serverUrl leaves paths alone until a server is chosen", () => {
    expect(server.serverUrl("/api/app/about")).toBe("/api/app/about");
  });

  test("serverUrl prefixes server-relative paths only", async () => {
    await server.saveServerOrigin("https://example.com/mealie");
    expect(server.serverUrl("/api/app/about")).toBe("https://example.com/mealie/api/app/about");
    expect(server.serverUrl("https://elsewhere.test/x.png")).toBe("https://elsewhere.test/x.png");
    expect(server.serverUrl(null)).toBeNull();
  });

  test("the server and token survive a relaunch, and clearing forgets both", async () => {
    await server.saveServerOrigin("https://example.com");
    server.setNativeToken("abc");
    await server.loadNativeState();
    expect(server.getServerOrigin()).toBe("https://example.com");
    expect(server.getNativeToken()).toBe("abc");

    await server.clearServerOrigin();
    await server.loadNativeState();
    expect(server.getServerOrigin()).toBe("");
    expect(server.getNativeToken()).toBeNull();
  });

  test("isNativeApp follows the Capacitor platform", () => {
    expect(server.isNativeApp()).toBe(true);
    native = false;
    expect(server.isNativeApp()).toBe(false);
  });
});
