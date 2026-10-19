export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/fr.js");
  const { default: frCA } = await import("../messages/fr-CA.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/fr-CA.json",
  );
  return {
    ...frCA,
    "unit-names": unitNames,
    $vuetify,
  };
});
