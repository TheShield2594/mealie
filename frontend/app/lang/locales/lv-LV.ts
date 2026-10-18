export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/lv.js");
  const { default: lvLV } = await import("../messages/lv-LV.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/lv-LV.json",
  );
  return {
    ...lvLV,
    "unit-names": unitNames,
    $vuetify,
  };
});
