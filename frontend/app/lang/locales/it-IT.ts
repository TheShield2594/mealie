export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/it.js");
  const { default: itIT } = await import("../messages/it-IT.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/it-IT.json",
  );
  return {
    ...itIT,
    "unit-names": unitNames,
    $vuetify,
  };
});
