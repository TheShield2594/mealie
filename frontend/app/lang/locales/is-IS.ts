export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/en.js");
  const { default: isIS } = await import("../messages/is-IS.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/is-IS.json",
  );
  return {
    ...isIS,
    "unit-names": unitNames,
    $vuetify,
  };
});
