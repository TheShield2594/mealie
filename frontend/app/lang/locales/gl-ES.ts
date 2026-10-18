export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/es.js");
  const { default: glES } = await import("../messages/gl-ES.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/gl-ES.json",
  );
  return {
    ...glES,
    "unit-names": unitNames,
    $vuetify,
  };
});
