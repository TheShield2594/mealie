export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/ro.js");
  const { default: roRO } = await import("../messages/ro-RO.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/ro-RO.json",
  );
  return {
    ...roRO,
    "unit-names": unitNames,
    $vuetify,
  };
});
