export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/fr.js");
  const { default: frBE } = await import("../messages/fr-BE.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/fr-BE.json",
  );
  return {
    ...frBE,
    "unit-names": unitNames,
    $vuetify,
  };
});
