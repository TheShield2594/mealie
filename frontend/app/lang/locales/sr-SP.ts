export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/en.js");
  const { default: srSP } = await import("../messages/sr-SP.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/sr-SP.json",
  );
  return {
    ...srSP,
    "unit-names": unitNames,
    $vuetify,
  };
});
