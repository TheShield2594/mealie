export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/tr.js");
  const { default: trTR } = await import("../messages/tr-TR.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/tr-TR.json",
  );
  return {
    ...trTR,
    "unit-names": unitNames,
    $vuetify,
  };
});
