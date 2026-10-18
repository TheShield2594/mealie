export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/no.js");
  const { default: noNO } = await import("../messages/no-NO.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/no-NO.json",
  );
  return {
    ...noNO,
    "unit-names": unitNames,
    $vuetify,
  };
});
