export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/nl.js");
  const { default: nlNL } = await import("../messages/nl-NL.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/nl-NL.json",
  );
  return {
    ...nlNL,
    "unit-names": unitNames,
    $vuetify,
  };
});
