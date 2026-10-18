export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/de.js");
  const { default: deDE } = await import("../messages/de-DE.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/de-DE.json",
  );
  return {
    ...deDE,
    "unit-names": unitNames,
    $vuetify,
  };
});
