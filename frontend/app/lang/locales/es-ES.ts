export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/es.js");
  const { default: esES } = await import("../messages/es-ES.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/es-ES.json",
  );
  return {
    ...esES,
    "unit-names": unitNames,
    $vuetify,
  };
});
