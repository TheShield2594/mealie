export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/ca.js");
  const { default: caES } = await import("../messages/ca-ES.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/ca-ES.json",
  );
  return {
    ...caES,
    "unit-names": unitNames,
    $vuetify,
  };
});
