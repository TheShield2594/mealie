export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/sv.js");
  const { default: svSE } = await import("../messages/sv-SE.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/sv-SE.json",
  );
  return {
    ...svSE,
    "unit-names": unitNames,
    $vuetify,
  };
});
