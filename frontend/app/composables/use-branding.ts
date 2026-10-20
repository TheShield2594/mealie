/**
 * URLs for the icons generated from a custom logo dropped into the server's data folder.
 * Without one, `brandingUrl` returns null and callers fall back to the built-in Mealie icons.
 */
export function useBranding() {
  const { $appInfo } = useNuxtApp();
  const version = $appInfo?.customLogoVersion;

  function brandingUrl(filename: string): string | null {
    // the version changes with the logo, which lets the server cache these forever
    return version ? `/api/app/about/branding/${filename}?v=${version}` : null;
  }

  // a logo in the data folder wins over one set with BRANDING_LOGO_PATH
  const logoUrl = brandingUrl("logo.png") ?? $appInfo?.brandingLogoUrl ?? null;

  return { hasCustomLogo: !!version, brandingUrl, logoUrl };
}
