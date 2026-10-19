export default defineI18nLocale(async () => {
  const { default: $vuetify } = await import("vuetify/lib/locale/he.js");
  const { default: heIL } = await import("../messages/he-IL.json");
  const { default: unitNames } = await import(
    "../../../../mealie/repos/seed/resources/units/locales/he-IL.json",
  );
  return {
    ...heIL,
    "unit-names": unitNames,
    $vuetify,
  };
});
