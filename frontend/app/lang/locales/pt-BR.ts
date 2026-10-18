export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/pt.js");
  const { default: ptBR } = await import("../messages/pt-BR.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/pt-BR.json",
  );
  return {
    ...ptBR,
    "unit-names": unitNames,
    $vuetify,
  };
});
