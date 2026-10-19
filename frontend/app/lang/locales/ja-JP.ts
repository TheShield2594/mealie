export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/ja.js");
  const { default: jaJP } = await import("../messages/ja-JP.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/ja-JP.json",
  );
  return {
    ...jaJP,
    "unit-names": unitNames,
    $vuetify,
  };
});
