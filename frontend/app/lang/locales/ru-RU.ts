export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/ru.js");
  const { default: ruRU } = await import("../messages/ru-RU.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/ru-RU.json",
  );
  return {
    ...ruRU,
    "unit-names": unitNames,
    $vuetify,
  };
});
