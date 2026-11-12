# Mealie +redesign: Design Audit

Status: **audit and proposal only, no app code changed yet.** Implementation waits for your approval of §8 (system) and §10 (flagged UX changes).

Branch audited: `mealie-next` @ `8bbd7c4` (3.29.0+redesign.1 plus the pantry and offline-queue work).

---

## 0. How this was done

- **Stack run locally:** FastAPI backend (SQLite) on :9000 and the Nuxt dev server on :3000.
- **Seed data:** 17 recipes. 15 have real food photography covering landscape, portrait and square crops. Two have no photo. One has a 150-character title, and the Massaman curry has 32 ingredients in three sections and 15 steps. I also added units and foods, tags and categories, a week of meal plans (one entry is note-only), three shopping lists (one empty), three cookbooks (one empty), favorites, and a second user. The seed script is reproducible but isn't committed.
- **Screenshots:** 34 routes × 390 / 768 / 1440 px × light / dark, so 204 full-page captures. They're not committed (about 60 MB). The three key screens are paired with mockups in `dev/design-review/*.jpg`.
- **Automated checks:** axe-core 4.10 (WCAG 2 A/AA plus best practice), touch-target measurement with `pointer: coarse` emulated, a 12-step Tab walk for focus visibility, and CLS/LCP observers. I ran these at 390 px in both themes on home, recipe, cook mode, planner, shopping, profile and login.
- **Caveats:** These numbers come from the Vite dev server, so LCP is pessimistic and only the CLS numbers carry over to production. The red `NotAllowedError` box in some raw captures is Nuxt's dev-only error overlay (see B-3). It's hidden in the comparison images.

---

## 1. Where the app stands

The fork already has a real first-pass redesign. It's good work, and this audit builds on it rather than replacing it:

- `assets/design-tokens.scss` defines warm neutrals for both themes, `.mealie-page`, `.mealie-pill`, `.mealie-chip`, `.mealie-segmented`, a reduced-motion rule, safe areas and a coarse-pointer hit-area helper.
- The sidebar, home "Tonight / This Week / Recently Added", the recipe hero, the ingredient and instruction lists, cook mode, the auth shell, shopping lists, the pantry and the planner frame are all redesigned.
- Contrast-safe `on-*` colours are computed at runtime (`lib/theme/readable-on.ts`). That's a nice touch.

**The problem is the seam.** About 40% of what a user sees still renders upstream's stock Vuetify components inside the new frame:

- **Stock recipe cards** (`RecipeCard` / `RecipeCardMobile`) show up on Home → All Recipes, cookbooks, favorites, the timeline and every meal-plan entry. They have teal tag chips, burgundy stars and hearts, a giant fork-and-knife glyph as the placeholder, and descriptions crammed into the list rows.
- The **Categories / Tags cards** under the ingredients on the recipe page.
- The **recipe editor**, the **profile and settings pages** (one with a 👋 emoji, stock illustrations and blue links), **admin and data tables**, and the **not-found page** (a blank page with a red snackbar).
- **Six different text-field styles** are in use.

So the app feels premium for the first screenful and then turns back into an admin template. Closing that seam is the single biggest win, and most of it is shared-component work, not per-screen work.

---

## 2. Design system inventory

### 2.1 Color

| Finding | Evidence | Impact |
|---|---|---|
| The token layer only covers neutrals, so accents are improvised per component. | 22 `rgba(var(--v-theme-primary), α)` uses with 9 different alphas (0.1 / 0.14 / 0.18 / 0.2 / 0.25 / 0.28 / 0.3 / 0.45 / 0.55) | M |
| **Secondary `#973542` (burgundy) still drives ratings, hearts and the planner's "Serves 4" chip.** It clashes with the terracotta primary. | `RecipeRating`, `RecipeFavoriteBadge`, planner scale chip | **H** |
| **Accent `#007A99` (teal) still fills every tag and category chip** on stock cards and the recipe page. It's a third brand hue with no role. | `RecipeChips` | **H** |
| Primary as small text on the canvas is 4.41:1, which fails AA. | axe: `.recent__link` "See All" (#C4502A on #FAF9F7) | M |
| The planner chip in dark mode is 3.65:1 (#fff on #C2705A). | axe, 7 nodes | M |
| One-off hex and rgba values in components: cook mode has its own palette (`#121110`, `#1f1e1c`, `#f0915f`, `#ffd2bf`…), and the warm shadow colour `rgba(40,30,20,…)` is repeated in 7 places. | grep | L |
| `template.env` still ships the old `#E58325` primary while the code defaults to `#C4502A`. Anyone who copies the template gets the old orange. | `frontend/template.env` | L |
| `--mealie-text-quaternary` is 2.36:1. That's fine for rules and icons, but it's used for some text too. | tokens | L |

### 2.2 Typography

- **31 distinct `font-size` values** across components (11, 12, 13, 14, 15, 16, 17, 18, 20, 21, 22, 26, 28, 30, 32, 34, 36, 38, 40, 44, 52, 56 px plus 0.85rem, 0.95rem, 1rem, 1.4rem, 1.5rem, small/larger…). Only about 8 of these are doing distinct jobs.
- The system UI stack (SF / Segoe) is used everywhere. It's crisp but carries no personality, and titles, body and UI all read the same, so the "cookbook" feel never arrives.
- Weights drift between 500, 550, 600, 650 and 700 with no rule.
- Stock pages still use Vuetify's `text-h4` / `text-h5` classes, which is a second type scale.
- Heading copy is inconsistent: "Sign in" vs "Login" on the same card, and "Recipe Creation" vs "New Recipe".

### 2.3 Spacing

- The redesigned screens are mostly on a 4/8 grid (12, 16, 24, 28, 36, 48), but 28, 36 and 9 px appear as one-offs.
- Stock pages use Vuetify's `pa-*` / `ma-*` utilities and `v-container` padding, which don't line up with `.mealie-page` (36/48 px). The result is that page left edges jump between redesigned and stock pages. Compare `/shopping-lists` with `/user/profile`.

### 2.4 Radii

**27 distinct radius values:** 2, 3, 4, 5, 6, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 20, 24, 26, 28 and 999, plus `24px 24px 0 0` and the `!important` variants. Cards alone use 16, 18, 20 and 24. Nested cards (the planner entry inside the day panel, the register tiles inside the card) mix radii, so the corners aren't concentric.

### 2.5 Elevation

There are three shadow philosophies running at once:

1. The redesign's inset hairline (`inset 0 0 0 1px var(--mealie-hairline)`).
2. Primary-coloured glows (`0 8px 20px rgba(primary,.25)` on buttons). These read as "template".
3. Vuetify's `elevation-*`, still on stock cards, menus and dialogs.

Dark mode correctly drops shadows, but nothing replaces them: menus and dialogs sit on almost the same value as the page.

### 2.6 Iconography

- MDI SVG icons are used throughout. That's fine, but filled and outline variants are mixed: filled `mdiHeart` and `mdiDelete` sit beside outline `mdiCalendar` and `mdiPencil`.
- There are four icon sizes in one toolbar (16 / 18 / 20 / 24).
- The brand is inconsistent: the auth shell uses an orange "M" squircle, the app uses the fork-and-knife mark, and a giant fork-and-knife also stands in as the no-photo placeholder on stock cards.
- **Emoji are used as UI:** "👋 Welcome" on the profile.

### 2.7 Motion

- The basics are good: 0.15 s hover transitions, a reduced-motion override, and spin/swipe transitions that respect it.
- There are no shared duration or easing tokens. Values include 0.1, 0.15, 0.2 and 0.3 s with `ease` / `ease-out`, and `transform: scale(.98)` press feedback only exists on `.mealie-pill`.
- Page transitions are an opacity fade on the layout only, so route changes inside the default layout hard-cut.
- There are no skeletons: there's one skeleton use in the whole app against ten spinners.

### 2.8 Components with more than one style for the same job

| Job | Variants found |
|---|---|
| Primary button | `.mealie-pill--primary`, `BaseButton`, `v-btn color=primary` (elevated with glow), `v-btn variant=flat`, and the outlined "Last Made" button |
| Destructive action | Red-filled pill "Delete Unused" on data pages, bare trash icon on list rows, red icon in admin tables |
| Text input | `filled`, `outlined`, `underlined`, `solo`, `solo-filled` and `plain`: **6 variants** (13 / 59 / 50 / 4 / 25 / 7 uses) |
| Checkbox | Round (ingredients), square Vuetify (shopping, settings), switch (Keep Screen Awake) |
| Chip / tag | `.mealie-chip` filter, teal `v-chip label`, rounded tinted "Serves", tiny "Beta" badge |
| Card | `.mealie-card` (24 px), `.v-main .v-card` override (20 px), `mealie-row-card`, the stock `RecipeCard` |
| Section title | `BaseCardSectionTitle`, `BasePageTitle`, `.mealie-page__title`, raw `<h2 class="text-h5">` |
| Empty state | The pantry's quiet panel (good), "No recipes found" in a card (finder), nothing at all (search, empty cookbook, empty list), a red snackbar (404) |
| Loading | `AppLoader` spinner, `v-progress-circular`, `v-progress-linear`, a blank white image box |

---

## 3. Screen-by-screen critique

Impact: **H**igh / **M**edium / **L**ow. Effort: **S** (under 2 h), **M** (half a day), **L** (a day or more).

### Home / recipe library (`/g/:group`)

| # | Issue | Impact | Effort |
|---|---|---|---|
| H1 | The "All Recipes" grid is the stock `RecipeCard`. Everything above it is redesigned, so the page visibly changes design language halfway down. | H | M |
| H2 | Two different no-photo placeholders on one page: a striped box in Recently Added and a 120 px orange fork-and-knife in All Recipes. | H | S |
| H3 | Images render as **blank white boxes** until loaded: there's no placeholder colour or aspect box on the stock card. | H | S |
| H4 | At 390 px the filter row wraps to **four lines** (11 chips plus a lone gear icon on its own row), pushing the first recipe below the fold. | H | S |
| H5 | At 768 px "All Recipes" switches to the list-row card with description, tags and stars, which is dense and clashes with the 2-column "Recently Added" above it. | M | S |
| H6 | The tonight hero at 390 px puts the title over the brightest part of the photo, and the bottom-only scrim is too short. | M | S |
| H7 | Mobile header: the logout icon is a primary header action. It belongs in the account menu. | M | S |
| H8 | The time meta falls back to raw recipe text. With imported ISO strings it shows "PT2H15M". *(Seed artifact; real scrapes store seconds. Still worth parsing ISO 8601 in the fallback.)* | L | S |
| H9 | Searching with no results shows a "Results" heading over a blank area: no message and no way out. | H | S |

### Recipe detail (`/g/:group/r/:slug`)

| # | Issue | Impact | Effort |
|---|---|---|---|
| R1 | **Categories and Tags render as two stock `v-card`s with teal chips** below the ingredients: card-in-page, a third hue, and lots of empty space. | H | S |
| R2 | The "Last Made / Never" outlined button wraps to two lines and clips at 390 px. It's the only outlined primary button in the app. | H | S |
| R3 | No photo shows a large empty striped box in the hero slot with no affordance. Better to collapse the slot (title spans) or show a quiet "Add photo" in edit mode. | M | S |
| R4 | The ingredient header controls (unit toggle, servings stepper, copy) are 24–28 px. The stepper is the most-used control while cooking. | H | S |
| R5 | At 1440 px the ingredients column is about 180 px while the method gets about 500 px. Long ingredient lines wrap to 3 lines, and the column scrolls away from the steps. | M | M |
| R6 | The toolbar mixes text pills (Edit, Share) with icon buttons (timeline, heart, ⋯) at the same level, which gives it no hierarchy. | M | S |
| R7 | The ratings are 12 px burgundy stars, hard to read and off-palette. | M | S |
| R8 | Step numbers are 20 px tinted circles, the same visual weight as the timer chips, so the eye can't find "where am I". | L | S |
| R9 | `landmark-no-duplicate-main` (axe): the page nests a second `<main>`. | L | S |

### Cook mode (`?cook=true`)

This is the best screen in the app: dark, large type, a progress rail, timers, and arrow and swipe navigation.

| # | Issue | Impact | Effort |
|---|---|---|---|
| C1 | Auto-detected ingredient chips false-match: "Bring a large **pot** of water" shows "3 potatoes". The upstream `extractIngredientReferences` fallback is too fuzzy. | M | M |
| C2 | The step text is 28 px at 390 px. On a phone propped about 60 cm away, 32–36 px with a 1.25 line-height reads better, and there's room for it. | M | S |
| C3 | Previous / Next at the bottom are 36 px pills. For flour-covered thumbs they should be 56 px and full-width split, and tapping the right or left half of the step area should also advance. | H | S |
| C4 | There's no visible indication that the screen is kept awake (wake lock is requested silently and fails silently on plain HTTP). Show a small "Screen stays on" / "Screen may sleep (needs HTTPS)" hint. | M | S |
| C5 | It's always dark, which is right for the counter, but it ignores the theme preference completely. Consider following the system light setting with a warm paper variant. *(Optional.)* | L | M |

### Recipe create / import / edit

| # | Issue | Impact | Effort |
|---|---|---|---|
| E1 | The editor is entirely stock: duplicated hour/minute steppers **plus** the raw text field for every time, `underlined`, `outlined` and `filled` inputs mixed together, and a stock ingredient row editor. | H | L |
| E2 | The disabled "Create" button in dark mode is nearly invisible (about 1.3:1). Disabled buttons need 40% opacity of the real style, not a ghost. | M | S |
| E3 | The import method picker (6 tiles) is good, but the selected-tile state uses both a ring and a tinted fill and the icon squircle changes colour. Pick one. | L | S |
| E4 | Long helper paragraphs with inline links ("Have raw HTML or JSON data? You can import from raw data directly.") duplicate the tiles above. | L | S |

### Meal planner

| # | Issue | Impact | Effort |
|---|---|---|---|
| P1 | **Every entry is a stock `RecipeCardMobile` inside the day panel** (card in card in card), with description, teal tag, heart, five stars, ⋯ and then "Serves 4 − +". Each entry is about 150 px tall, so about 3 entries fit per screen at 390 px. | **H** | M |
| P2 | **CLS 0.49–0.52.** Entry images have no reserved size and push the days down as they load. That's 5× the "poor" threshold. | **H** | S |
| P3 | The note-only entry ("Leftovers") gets the giant fork-and-knife placeholder. | M | S |
| P4 | The "Serves" chip uses burgundy secondary, with the edit-pencil icon inside a chip. | M | S |
| P5 | 7 days stack vertically even at 1440 px (2 columns), so a week needs three screens of scrolling. A 7-column week fits on one screen at 1440 px. | M | M |
| P6 | `aria-allowed-attr` (9), `button-name` (45) and `image-alt` (2): icon buttons without labels. | M | S |

### Shopping lists

| # | Issue | Impact | Effort |
|---|---|---|---|
| S1 | Square Vuetify checkboxes, while the ingredient list (the same mental model) uses round ones. | M | S |
| S2 | Edit (pencil) and drag-handle icons sit at full strength on every row, which makes 16 icons on an 8-item list. On desktop they should show on hover; on touch, edit on tap of the row and reorder on long-press. | M | M |
| S3 | A "No Label" group header shows even when no labels exist. | L | S |
| S4 | The add-item field moves between screen sizes: top on desktop, bottom-docked at 768 px, and almost invisible at 390 px dark (a blank dark bar with no visible input). | H | S |
| S5 | The empty list shows only the add field: no "Nothing on this list yet" message. | M | S |
| S6 | The list index shows a trash icon on every row (a destructive action at rest), the same list glyph repeated, and no item count. | M | S |
| S7 | The "Keep Screen Awake" stock switch floats centred under the list. It should move into the list's ⋯ menu or a header toggle. | L | S |

### Cookbooks

| # | Issue | Impact | Effort |
|---|---|---|---|
| K1 | The index is a management list (name + edit + drag handle) behind a 4-line help paragraph. It reads as settings, not a bookshelf. | M | M |
| K2 | The cookbook page uses the stock card grid and a different toolbar (icon "Random", "Sort") from Home's chip row. | H | S (falls out of H1) |
| K3 | **An empty cookbook is a completely blank page.** | H | S |

### Search / filter / organizers / finder / timeline

| # | Issue | Impact | Effort |
|---|---|---|---|
| F1 | The Recipe Finder shows "No recipes found. Try adding more ingredients" *before* the user has done anything. It reads as an error, not an invitation. | M | S |
| F2 | The Tags page has an A–Z index with one 120 px card per letter in a 1100 px-wide page: mostly empty space. Use a flowing list or columns. | L | S |
| F3 | The Timeline is a stock alternating `v-timeline` with cards inside cards, a duplicated "Recipe Created" heading per card, and blank images until scroll. | M | M |

### Profile, household and group settings

| # | Issue | Impact | Effort |
|---|---|---|---|
| U1 | "👋 Welcome, Change Me!", stock undraw-style illustrations and blue (`info`) "Manage …" links: the most template-looking page in the app. | H | M |
| U2 | The profile edit form uses `underlined` fields and a blank avatar circle with a blue "Upload" link. | M | S |
| U3 | Household settings are long checkbox stacks, each with a paragraph. They should be grouped lists with switches. | M | M |

### Admin

| # | Issue | Impact | Effort |
|---|---|---|---|
| A1 | User Management shows raw UUIDs as the first column and a red trash icon on every row. | M | S |
| A2 | The Data Management toolbar has five coloured pills (Actions / Create / Combine / **Delete Unused** in red) at equal weight. | M | S |
| A3 | Site Settings is a fine status list, but the "Site Statistics" tiles are stock and the email alert card uses a 5 px left border. | L | S |

### Auth

| # | Issue | Impact | Effort |
|---|---|---|---|
| L1 | The brand mark is an orange "M" squircle here and a fork-and-knife inside the app. | M | S |
| L2 | **CLS 0.21.** The first-time-login hint box appears after `/api/app/about` resolves and pushes the card down. | M | S |
| L3 | The "Sign in" heading sits above a "Login" button. "Invite Only" is unexplained grey text. | L | S |
| L4 | Registration uses tiles inside a card, with colour-filled icon squircles. | L | S |

### Error and loading states

| # | Issue | Impact | Effort |
|---|---|---|---|
| X1 | **Recipe not found is a blank page with a red "No Entry Found" snackbar.** It needs a proper page: "This recipe doesn't exist or was deleted", plus "Back to recipes" and Search. | **H** | S |
| X2 | Loading uses spinners everywhere and nothing has skeletons. The recipe page shows a spinner and then the whole page appears at once. | M | M |

---

## 4. Interaction quality

- **Hover:** The redesigned elements have it (pills and chips change fill). Stock cards lift with a Vuetify shadow, and list rows have no hover at all. Rule: one hover treatment per element type, a fill change for controls and a hairline-strong ring for cards, never a coloured glow.
- **Focus:** The Tab walk shows **missing focus rings on the header Menu, Search and avatar buttons** on every page, and on the login email field. The redesigned pills and chips have good `:focus-visible` rings. Rule: a 2 px ring in `--accent` with a 2 px offset on everything focusable, via one global `:focus-visible` rule.
- **Active and press:** Only `.mealie-pill` has press feedback. Extend `scale(.98)` with a 120 ms duration to all buttons and cards.
- **Transitions:** Same-layout route changes hard-cut. Use a 180 ms opacity plus 4 px rise on `<NuxtPage>`. `viewTransition: true` is already on, so a shared-element transition from the card image to the recipe hero is cheap and would make the app feel native.
- **Skeletons vs spinners:** Replace spinners with skeletons that match the layout for the recipe grid, recipe page, planner and shopping list. Keep spinners only for actions under a second (inside the button).
- **Optimistic updates:** The shopping list is optimistic, with an offline queue. Favorites, ratings and the planner's servings change round-trip before updating. Make those optimistic too.
- **Toasts:** The snackbar is a full-width coloured bar, and errors are bright red. Rule: a neutral raised surface with an icon tint, bottom-centre, auto-dismiss after 4 s, and an Undo action for deletes (removing an item from a list, a meal plan entry). Never use a toast as the only content of a page (see X1).
- **Empty states:** Only the pantry gets this right. Introduce one `BaseEmptyState`: a muted icon, a one-line title, one sentence, and at most one primary action.

---

## 5. Recipe-specific UX

**Ingredient and step readability while cooking.** On the recipe page, the ingredients are 15 px and the steps 15 px at 1440 px, and both are 15 px on mobile. Kitchen distance argues for **17 px with a 1.5–1.65 line-height** for both lists, which is the `--t-body-lg` in the proposal. Quantities are already bold, which is good; add `tabular-nums` so fractions align. The checked state is a filled circle, and should also strike through and fade the line so the remaining items stand out. Steps need a stronger "you are here" cue: tapping a step should mark it done and fade it, the way cook mode does.

**Scaling and units.** The servings stepper is good in concept but has 24 px buttons and sits beside two unlabeled icon buttons (unit system and copy). Proposal: a 36 px stepper pill (44 px hit area) and the unit toggle as a labelled segmented control ("US · Metric") in the ingredient header's ⋯. Scaled quantities should briefly highlight (a 200 ms tint) so the change is noticeable.

**Images.**
- There's no shared aspect-ratio rule. Card images are 4:3 on some screens and about 16:9 on others, the hero is 4:3, and portrait and square uploads are centre-cropped. Rule: cards and hero 4:3 everywhere, tonight feature 16:9 on desktop and 4:5 on phones, and the planner and list thumbnails 1:1.
- Always reserve the box (`aspect-ratio`) and use the placeholder fill while the image loads. This fixes the blank white boxes and the planner CLS.
- No photo: a single placeholder, the warm placeholder fill with the recipe's initial in the display serif (see the mockup). It looks deliberate, not broken.

**Cook mode on a counter.** It already has the dark theme, large step text and wake lock. To add: bigger Next/Previous controls and tap zones (C3), a wake-lock status hint (C4), and fixing false ingredient chips (C1). Ingredients open as a sheet; give the sheet the same 17–20 px list with check-off that syncs with the page.

---

## 6. Accessibility

| Check | Result | Fix |
|---|---|---|
| `<html lang>` | **Missing on every page** (axe). Screen readers can't pick a voice. | Set `htmlAttrs.lang` from the i18n locale (S) |
| Contrast | Primary-as-text 4.41:1 (fail). Planner chip in dark 3.65:1. Disabled button in dark about 1.3:1. Quaternary text 2.36:1. | `--accent-ink` (5.76:1 light, 7.5:1 dark), ban quaternary for text |
| Names | 37 unlabeled icon buttons on Home and 45 on the planner (`button-name`). `aria-tooltip-name` on 17–36 nodes. | `aria-label` on every icon `v-btn` (S–M) |
| Focus visibility | Header Menu, Search and avatar, and the login email field: no ring. | Global `:focus-visible` rule (S) |
| Touch targets | Header icons 30 × 30, recipe toolbar 32 × 32, servings stepper about 24, chips 34 high, the login password eye 24, the "Reset Password" link 21 high. 42 sub-44 px targets on Home. *(`.mealie-hit-target` extends some invisibly; those were excluded where present.)* | 44 px minimum on coarse pointers, via the extender class on all icon buttons |
| Keyboard | Arrow keys work in cook mode. Card grids aren't arrow-navigable (that's acceptable). The menus are Vuetify's and are fine. | none |
| Reduced motion | Handled globally. Spinners keep spinning on purpose. | Keep it; make sure new skeleton shimmer respects it |
| Landmarks | Duplicate `<main>` on the recipe page and in cook mode. | S |

---

## 7. Performance as people experience it

| Metric (390 px, dev build) | Home | Recipe | Cook | Planner | Shopping | Login |
|---|---|---|---|---|---|---|
| CLS | 0.046 | 0.002 | 0.000 | **0.49 / 0.52** | 0.000 | **0.21** |

- **Planner CLS** comes from images without reserved dimensions inside stock cards (P2). Fixing the card fixes it.
- **Login CLS** comes from the first-time-login hint rendering late (L2). Reserve its space, or render it below the card.
- **Recipe grid first paint:** The stock cards render white boxes, and images pop in at full contrast. With the placeholder fill and a 180 ms fade-in once the image loads, the page looks complete immediately. Cards and Recently Added already request `min-original.webp` (about 70–110 KB each here). The phone-sized 2-column grid and the planner thumbnails could use `tiny-original` (about 45–70 KB) through `srcset`/`sizes`, which saves roughly 35% of grid bytes on phones. That's a modest win, not a big one. The tonight hero loads the full `original` (the right choice at desktop size); add `fetchpriority="high"` to it, since it's the LCP element.
- Fonts: the system stack costs nothing. The proposed serif is **36 KB** (Fraunces variable, latin, weight axis only), preloaded, with `font-display: swap`.

---

## 8. Proposed design system

### 8.1 Direction

You left the optional direction blank, so I'm proposing **"warm and editorial, like a modern cookbook"**, and the mockups show it.

- Food photography leads. The neutrals are warm paper in light mode and warm charcoal in dark (the dark mode is its own palette, not an inversion).
- **One accent, terracotta, used sparingly:** the primary action per view, today's marker, and links. Everything else stays neutral, so there's no teal and no burgundy.
- **A refined serif for titles only**, paired with the existing system sans for everything you read or tap.

### 8.2 Font (needs approval)

**Fraunces** (variable, OFL-1.1) installed from npm as `@fontsource-variable/fraunces`:

- Vite bundles the woff2, and it's served from Mealie's own origin, so there are **no CDN or third-party requests and nothing phones home**.
- It's 36 KB for the latin, weight-axis file.
- It's used only for page titles (h1), recipe titles, the tonight hero, step numbers and the no-photo initial.
- Body and UI stay on the system stack.

Alternatives with the same properties: Newsreader (more classic) or Source Serif 4 (more neutral). If you'd rather add no dependency at all, the fallback is `ui-serif, Georgia`, which is acceptable on macOS and iOS and weaker on Windows and Android.

### 8.3 Tokens

These extend the existing `design-tokens.scss`. Existing `--mealie-*` names stay as aliases so nothing breaks.

```scss
:root {
  // type: 8 sizes, each with a job
  --mealie-font-display: "Fraunces Variable", ui-serif, Georgia, serif;
  --mealie-text-caption: 12px;  // eyebrows, meta labels (600, +0.06em, uppercase)
  --mealie-text-meta:    13px;  // secondary lines
  --mealie-text-body:    15px;  // UI body
  --mealie-text-body-lg: 17px;  // ingredients, steps, descriptions
  --mealie-text-h3:      20px;  // section titles (650)
  --mealie-text-h2:      24px;  // group titles (650)
  --mealie-text-h1:      34px;  // page titles (display serif 560); 28px under 600px
  --mealie-text-display: 44px;  // recipe title (display serif); 32px under 600px
  // weights: 400 body · 550 controls · 600 emphasis · 650 headings. Nothing else.

  // spacing: 4px base, 8 steps
  --mealie-space-1: 4px;  --mealie-space-2: 8px;  --mealie-space-3: 12px; --mealie-space-4: 16px;
  --mealie-space-5: 24px; --mealie-space-6: 32px; --mealie-space-7: 48px; --mealie-space-8: 64px;

  // radii: 4 + pill (replaces 27 values)
  --mealie-radius-xs: 6px;   // checkboxes, kbd, tiny badges
  --mealie-radius-sm: 10px;  // inputs, thumbnails, menu items, list rows
  --mealie-radius-md: 16px;  // cards, panels, card images, dialogs
  --mealie-radius-lg: 24px;  // hero imagery, bottom sheets
  --mealie-radius-pill: 999px; // buttons, chips, segmented controls
  // nested rule: inner radius = outer radius − padding (concentric corners)

  // elevation: hairline → raised → overlay
  --mealie-elev-0: 0 0 0 1px var(--mealie-hairline);
  --mealie-elev-1: 0 1px 2px rgba(40,30,20,.05), 0 0 0 1px var(--mealie-hairline);       // cards
  --mealie-elev-2: 0 12px 32px -12px rgba(40,30,20,.22), 0 0 0 1px var(--mealie-hairline); // menus, popovers, dialogs
  // dark: no drop shadows; elevation = lighter surface (--surface → --raised) + hairline-strong

  // motion
  --mealie-ease: cubic-bezier(.2,.8,.2,1);
  --mealie-dur-press: 120ms; --mealie-dur-hover: 180ms; --mealie-dur-enter: 240ms; --mealie-dur-exit: 160ms;
}

/* color roles: light / dark */
--mealie-canvas         #FAF9F7 / #141311
--mealie-sidebar        #F3F1ED / #191816
--mealie-surface        #FFFFFF / #1D1C1A    (cards)
--mealie-raised         #FFFFFF / #262522    (menus, dialogs, sheets: dark gets lighter, not shadowed)
--mealie-ink            #1C1B19 / #F2EFEA    (16.4:1 / 16.2:1)
--mealie-ink-2          #57534D / #BDB8AF    (7.3:1 / 9.4:1)  secondary text
--mealie-ink-3          #6F6C66 / #9A958C    (5.0:1 / 6.2:1)  tertiary text; floor for any text
--mealie-ink-4          #A8A49C / #6D6962    icons, rules, placeholders. Never body text
--mealie-fill           neutral 10% / 7%     secondary buttons, inputs, tags
--mealie-accent         theme primary (#C4502A / #E0683C)  fills only
--mealie-accent-ink     #A8421F / #EF8A63    accent as text (5.8:1 / 7.5:1)
--mealie-accent-tint    accent @ 10% / 14%   selected rows, timer chips, today
--mealie-placeholder    #EBE6DD / #24221F    image boxes before/without photos
```

`success`, `warning` and `error` keep their current AA-safe values but are only used for status, never decoration. `secondary`, `accent` and `info` stay in Vuetify for upstream compatibility but **stop being used by the redesign**. They're remapped to neutral fills in the `.v-main` overrides, as is already done for info and accent buttons.

### 8.4 Component rules

1. **Buttons: three kinds only.**
   - **Primary** (accent fill): at most one per view.
   - **Secondary** (neutral fill pill).
   - **Quiet** (text or icon only).
   - Heights are 32 / 40 / 48, and 44 is the minimum on touch.
   - Destructive actions live in menus or confirm dialogs, never as a resting red button or row icon.
   - No coloured shadows.
2. **Inputs: one style.** Use the filled sunken field (fill background, 10 px radius, no underline, a 2 px accent ring on focus). Set it via Vuetify `defaults` and normalise every `variant` with one CSS block, so the 50 `underlined` call sites change without editing them.
3. **Selection controls.**
   - Round check-circles for "done" lists (ingredients, shopping, steps).
   - Square checkboxes only for form settings.
   - Switches for on/off preferences.
4. **Chips.**
   - Filter chips are outlined, and the active one is an ink fill.
   - Tags and categories are neutral fill, 30 px, no colour.
   - Status badges are tinted text.
5. **Recipe card (one component, three densities).**
   - *Grid:* a 4:3 image at 16 px radius with the favourite button on the image, a title clamped to 2 lines, and one meta line (time · category).
   - *Row:* a 1:1 thumbnail, title and meta.
   - *Compact (planner):* a thumbnail, title, and time · servings.
   - No descriptions, star rows or tag chips on cards, because they belong on the recipe page. *(Flagged §10-B.)*
6. **Cards don't nest.** A panel can contain rows separated by hairlines, but not cards. If something needs a boundary inside a panel, use a fill instead of a border.
7. **Page frame.** Every page uses `.mealie-page`: an eyebrow, a serif h1, actions on the right, and 32 px to the content. Stock `BasePageTitle` and `v-container` pages get wrapped and restyled through `BasePageTitle` itself, so call sites don't change.
8. **Empty, loading and error states.** These use `BaseEmptyState` (a new file), skeletons matching the layout for the four main screens, and a full-page error for 404s.
9. **Icons.** Use the MDI *outline* variants by default and filled only for an "on" state (a favourited heart). Sizes are 16 inline, 20 in controls and 24 in navigation. No emoji in UI.
10. **Images.** Always reserve `aspect-ratio`, use the placeholder fill and fade in over 180 ms, use `srcset` with the `tiny-` variant for phone-sized slots, and give a no-photo recipe its initial in the serif.

---

## 9. Before / after mockups (3 most important screens)

These are static HTML mockups built from the tokens above, using real seed photos. The left side of each image is the current app at the same size.

| Screen | Desktop 1440, light | Phone 390, dark |
|---|---|---|
| Recipe library | `dev/design-review/library-1440-light.jpg` | `dev/design-review/library-390-dark.jpg` |
| Recipe detail (32-ingredient curry) | `dev/design-review/recipe-1440-light.jpg` | `dev/design-review/recipe-390-dark.jpg` |
| Meal planner | `dev/design-review/planner-1440-light.jpg` | `dev/design-review/planner-390-dark.jpg` |

What changes in each:

- **Library:**
  - The grid joins the redesign, with one placeholder style (a serif initial).
  - The filters become a single scrolling row on phones.
  - The tonight hero gets a taller scrim and a serif title.
  - The count sits next to "All Recipes", and a Grid / List segmented control replaces the ⋮ menu (the existing layout toggle is still there, just visible).
- **Recipe:**
  - The organizer cards become an inline "Filed under" row of neutral tags.
  - The facts row gets human times and accent stars.
  - "Last made" becomes one quiet line of meta text.
  - Ingredients are 17 px with strikethrough when checked, and the column is sticky on desktop.
  - Serif step numbers make "where am I" findable, and the servings stepper is a 36 px pill.
- **Planner:**
  - A 7-column week on desktop and a compact list on phones, with no cards in cards.
  - Today gets an accent ring and label.
  - Each entry shows "time · Serves 4", where the servings pill keeps the per-entry scaling.
  - Dashed "Add" slots, and "Shop for this week" is promoted from the ⋯ menu.

The mockups use a placeholder brand mark. The real one keeps the current fork-and-knife logo, which also replaces the "M" on the auth pages (L1).

---

## 10. UX changes that need your OK (beyond visual)

| | Change | Why | Reversible? |
|---|---|---|---|
| A | **Bottom tab bar on phones** (Recipes · Plan · Lists · More) replacing the hamburger as primary navigation. The drawer stays behind "More". Logout moves out of the header into the account menu. | Thumb reach; the top three destinations are one tap instead of two. | Yes, purely a layout addition |
| B | **Simplify recipe cards**: no description, tag chips or 5-star row in grids. The favourite button moves onto the image, and rating and tags stay on the recipe page. The ⋯ context menu stays (on hover, or long-press on touch). | Cards are scanned for the photo and title. The stars and tags are the main source of noise. | Yes |
| C | **Planner entries compact**: drop description, tags, rating and favourite. The "Serves N − +" control becomes a "Serves N" pill that opens the same stepper. Desktop shows 7 columns. | P1/P5: a week on one screen | Yes |
| D | **404 as a page** instead of a snackbar on a blank page. | X1 | n/a |
| E | **Cookbooks index as a shelf**: cover mosaics from each cookbook's first 4 recipes. Reordering and editing move to an "Edit" mode. | K1 | Yes |
| F | **Shopping rows**: edit and drag icons appear on hover (desktop), and on touch you tap a row to edit and long-press to reorder. Hide "No Label" when the list has no labels. The add field is always bottom-docked on phones. | S2–S4 | Yes |
| G | **Recipe page on phones**: Edit, Timeline and Share go into the top bar's ⋯ and share icon, and favourite stays visible. | R6 | Yes |
| H | **Planner**: a "Today" button replaces the date-range picker button (the picker moves into ⋯), and "Add all to list" is promoted to a header button. | Most-used actions first | Yes |
| I | **Cook mode**: tap the right or left 40% of the step area to go to the next or previous step, and show the wake-lock status. | C3/C4 | Yes |

Anything you don't approve, I'll implement visually only.

---

## 11. Prioritized checklist

Order is tokens → shared components → screens. Each line is meant to be one small commit.

### Phase 1: Foundation (tokens and global rules)

- [ ] **1.1** Extend `design-tokens.scss` with the type, space, radius, elevation, motion and colour roles above, keeping `--mealie-*` aliases. Add `--accent-ink` and replace the primary-as-text uses.
- [ ] **1.2** Vuetify `defaults` in `nuxt.config.ts` for VTextField, VSelect, VAutocomplete, VCombobox, VTextarea (filled, rounded, density), VCard, VChip, VBtn, VSwitch, VCheckbox. Add one CSS block that normalises all six input variants.
- [ ] **1.3** Retire secondary (burgundy) and accent (teal) from the redesign: ratings and favourites use accent and ink, and tags use neutral fill.
- [ ] **1.4** Global `:focus-visible` ring, press feedback, and a page transition on `<NuxtPage>`.
- [ ] **1.5** `<html lang>` from i18n, and `aria-label` on every icon button in the shared shell (header, sidebar).
- [ ] **1.6** *(If approved)* the Fraunces display font through `@fontsource-variable/fraunces`, preloaded and used only by `.mealie-display`.
- [ ] **1.7** Sync `template.env` colours with the code defaults.

### Phase 2: Shared components

- [ ] **2.1** `RecipeCard` and `RecipeCardMobile`: the restyle with one placeholder, reserved aspect ratio, image fade-in and `srcset` with `tiny-original` on phones (fixes H1–H3, H5, K2, P2/P3, favourites, timeline).
- [ ] **2.2** `BaseEmptyState` (new), applied to search, empty cookbook, empty list, finder, and the 404 page.
- [ ] **2.3** `RecipeChips` (neutral tags) and `RecipeRating` (accent stars, 16 px, 44 px hit area).
- [ ] **2.4** `BasePageTitle` and `BaseCardSectionTitle` render the `.mealie-page` header, so stock pages inherit it without call-site edits.
- [ ] **2.5** Skeletons for the grid, recipe page, planner and shopping list (new `BaseSkeleton*` files).
- [ ] **2.6** Toast restyle (the `alert` composable's snackbar) with Undo on delete.
- [ ] **2.7** *(If approved)* the mobile tab bar (new `AppTabBar.vue`, mounted from `DefaultLayout`).

### Phase 3: Screens, in order

- [ ] **3.1** Recipe page: inline organizers, Last Made, no-photo hero, 17 px lists, sticky ingredients, 36/44 px controls, serif step numbers.
- [ ] **3.2** Home: filter row scroll, hero scrim, count, and the layout segmented control.
- [ ] **3.3** Meal planner: compact entries and the 7-column week.
- [ ] **3.4** Cook mode: navigation size, tap zones, wake-lock hint, larger step type, the C1 false-match fix.
- [ ] **3.5** The 404 and error page.
- [ ] **3.6** Shopping list and index (S1–S7).
- [ ] **3.7** Cookbooks shelf (if approved) and the empty state.
- [ ] **3.8** Profile, user settings and household settings (remove the emoji and illustrations, grouped lists).
- [ ] **3.9** Recipe editor (time fields, one input style, ingredient rows).
- [ ] **3.10** Timeline, tags/categories/tools pages, and the Finder.
- [ ] **3.11** Admin and data tables (hide UUIDs, demote destructive actions).
- [ ] **3.12** Auth: brand mark, the L2 layout shift, copy.

### What I'd do first, and why

1. **Phase 1.1–1.3 (tokens, Vuetify defaults, retiring teal and burgundy).** About half a day for the largest visible change per line of code. The defaults and the variant-normalising CSS restyle roughly 150 stock inputs, every card and every chip **without touching the upstream templates**, so merges stay painless.
2. **2.1 (the recipe card).** One component appears on six screens. Restyling it removes most of the "stock admin" seam, and fixes the worst CLS (planner, 0.5).
3. **3.1 (recipe page).** It's the screen people spend the most time on and the one they cook from. Most of the fixes are small and the page is already 80% there.
4. **2.2 and 3.5 (empty states and 404).** Cheap, and they eliminate the moments where the app looks broken.

That order gets the three mockup screens to their "after" state by the end of Phase 2 plus 3.1–3.3.

---

## 12. Upstream merge strategy

- **Prefer, in this order:**
  1. Token and CSS overrides in `design-tokens.scss` (a fork-only file).
  2. Vuetify `defaults` in `nuxt.config.ts` (one block).
  3. New fork-only components (`BaseEmptyState`, `AppTabBar`, skeletons).
  4. Edits to shared upstream components only where a template change is unavoidable (`RecipeCard*`, `RecipeChips`, `RecipeRating`, `BasePageTitle`).
- **Every upstream file touched gets logged in this section** as commits land. The predicted set for Phases 1–2 is `nuxt.config.ts` (html lang through `app.head.htmlAttrs`, or a fork-only plugin), `RecipeCard.vue`, `RecipeCardMobile.vue`, `RecipeChips.vue`, `RecipeRating.vue`, `RecipeFavoriteBadge.vue`, `BasePageTitle.vue`, `BaseCardSectionTitle.vue`, `DefaultLayout.vue`, and `template.env`. Most of these are already fork-modified.
- The fork already modifies **141 upstream frontend files**, deletes 5 and adds 24. The full list is in `dev/design-review/upstream-files-touched.txt`.
  - Heads-up: all 41 non-English `lang/locales/*.ts` files carry a one-line Vuetify import-path change. These aren't Crowdin-managed message files, but they will conflict whenever upstream touches them.

### Upstream files touched by this audit

None. This commit adds `DESIGN_AUDIT.md` and `dev/design-review/` only.

---

## Appendix B: Bugs found in passing (not visual)

- **B-1** Cook mode auto-matches "pot" to the potatoes ingredient (C1). The cause is the fuzzy fallback in `extractIngredientReferences`.
- **B-2** The fallback for recipe time text shows raw ISO 8601 ("PT1H30M") when an import stored text instead of seconds (H8).
- **B-3** `WakelockSwitch.vue` lets the `request("screen")` rejection go unhandled. It fails on plain-HTTP LAN installs, which are common for self-hosters. It's harmless in production, but it shows the dev error overlay and would be better as a visible "needs HTTPS" hint.
- **B-4** `template.env` primary `#E58325` doesn't match the code default `#C4502A`.
