// Keeps <html lang> and <html dir> in step with the user's language, so screen readers pick the
// right voice and pronunciation rules (WCAG 3.1.1). @nuxtjs/i18n only sets these through
// useLocaleHead in a layout, which this SPA's layouts don't call.
export default defineNuxtPlugin((nuxtApp) => {
  const { locale, localeProperties } = nuxtApp.$i18n;

  useHead({
    htmlAttrs: {
      lang: () => locale.value,
      dir: () => localeProperties.value.dir || "ltr",
    },
  });
});
