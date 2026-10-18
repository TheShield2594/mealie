// Vuetify's (internal) key for the component defaults it passes down through provide/inject
const VUETIFY_DEFAULTS = Symbol.for("vuetify:defaults");

/**
 * Re-provides the Vuetify defaults this component inherits, but only hands its children
 * a new object when the defaults' contents actually change.
 *
 * Some Vuetify components (e.g. v-expansion-panel) give their children a brand new defaults
 * object every time they render, which re-renders every Vuetify component inside them even
 * when nothing they show has changed. Calling this in the setup of a component that is
 * repeated many times inside one (like a shopping list row) stops that cascade at the row.
 */
export function useStableVuetifyDefaults() {
  const inherited = inject<Ref<Record<string, unknown>> | null>(VUETIFY_DEFAULTS, null);
  if (!inherited) {
    return;
  }

  let previousJson = "";
  provide(
    VUETIFY_DEFAULTS,
    computed<Record<string, unknown>>((previous) => {
      const json = JSON.stringify(inherited.value);
      if (previous && json === previousJson) {
        return previous;
      }

      previousJson = json;
      return inherited.value;
    }),
  );
}
