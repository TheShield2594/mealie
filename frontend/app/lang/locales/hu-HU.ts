export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/hu.js");
  const { default: huHU } = await import("../messages/hu-HU.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/hu-HU.json",
  );
  return {
    ...huHU,
    "unit-names": unitNames,
    $vuetify,
  };
});
