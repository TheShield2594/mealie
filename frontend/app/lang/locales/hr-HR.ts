export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/hr.js");
  const { default: hrHR } = await import("../messages/hr-HR.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/hr-HR.json",
  );
  return {
    ...hrHR,
    "unit-names": unitNames,
    $vuetify,
  };
});
