export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/zh-Hans.js");
  const { default: zhCN } = await import("../messages/zh-CN.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/zh-CN.json",
  );
  return {
    ...zhCN,
    "unit-names": unitNames,
    $vuetify,
  };
});
