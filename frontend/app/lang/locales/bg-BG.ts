export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/bg.js");
  const { default: bgBG } = await import("../messages/bg-BG.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/bg-BG.json",
  );
  return {
    ...bgBG,
    "unit-names": unitNames,
    $vuetify,
  };
});
