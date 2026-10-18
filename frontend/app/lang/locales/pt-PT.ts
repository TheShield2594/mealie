export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/pt.js");
  const { default: ptPT } = await import("../messages/pt-PT.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/pt-PT.json",
  );
  return {
    ...ptPT,
    "unit-names": unitNames,
    $vuetify,
  };
});
