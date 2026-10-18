export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/fi.js");
  const { default: fiFI } = await import("../messages/fi-FI.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/fi-FI.json",
  );
  return {
    ...fiFI,
    "unit-names": unitNames,
    $vuetify,
  };
});
