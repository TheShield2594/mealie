export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/en.js");
  const { default: enGB } = await import("../messages/en-GB.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/en-GB.json",
  );
  return {
    ...enGB,
    "unit-names": unitNames,
    $vuetify,
  };
});
