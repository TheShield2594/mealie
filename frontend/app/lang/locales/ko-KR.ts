export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/ko.js");
  const { default: koKR } = await import("../messages/ko-KR.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/ko-KR.json",
  );
  return {
    ...koKR,
    "unit-names": unitNames,
    $vuetify,
  };
});
