export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/ar.js");
  const { default: arSA } = await import("../messages/ar-SA.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/ar-SA.json",
  );
  return {
    ...arSA,
    "unit-names": unitNames,
    $vuetify,
  };
});
