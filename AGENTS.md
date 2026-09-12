# Agent guide — Readalong

Technical reference for humans and AI agents working on this codebase. For end-user info see [README.md](README.md).

**Style reference:** [darter](../darter) (sibling project) uses the same Brio + tokens/utilities + element/modifier patterns.

---

## Architecture

| Layer | Stack |
|-------|-------|
| Server | PHP 8+, no framework, no build step |
| Client | Vanilla JS + vendored [Brio](assets/brio/brio.js) |
| Styles | Single `assets/styles.css` + `assets/brio/brio.css` |
| Data | Story folders under `stories/`, JSON metadata + translations |

**Entry points**

- `index.php` — home or onboarding (via `needs_onboarding()`)
- `stories/view.php` — story player (included from each `stories/<slug>/index.php`)
- `router.php` — dev router for `php -S`

**Partials** live in `assets/partials/`. Story pages use `assets/story-shell.php` as the HTML shell.

---

## Run locally

```bash
./serve.sh
# or
php -S localhost:8765 router.php
```

---

## Asset load order

Always preserve this order:

1. `assets/brio/brio.css` (in `head.php`)
2. `assets/styles.css` (in `head.php`)
3. `assets/brio/brio.js` (defer)
4. Project JS (`scripts.js`, `home.js`, `onboarding.js`)

Onboarding loads its own script block in `assets/partials/onboarding.php` (same Brio order).

**Cache busting:** bump `?v=` on CSS/JS when changing those files (`head.php`, `scripts.php`, `index.php`, `onboarding.php`).

**Updating Brio:** copy from the sibling repo — no npm/build:

- `../brio/brio.js` → `assets/brio/brio.js`
- `../brio/dist/brio.css` → `assets/brio/brio.css`

---

## Brio — chrome actions

UI chrome (buttons, dialogs, filters, form changes) uses **declarative Brio attributes**, not inline handlers or per-element listeners.

| Attribute | Use for |
|-----------|---------|
| `data-click="actionName"` | Buttons, links that trigger a global action |
| `data-click="openDialog(settings)"` | Open a `<dialog>` by id |
| `data-click="closeDialog(settings)"` | Close a dialog |
| `data-change="actionName"` | `<select>` change |
| `data-input="actionName"` | Form input (live updates) |
| `data-el="close-button"` | Close control inside a dialog (Escape/backdrop) |

Global action functions live on `window` and accept Brio’s signature `(el, event, target)` — extra args may be ignored:

```js
function filterKind(el) { /* read el.getAttribute('data-kind-filter') */ }
function play() { /* no args needed */ }
function updateSettings() { /* called from settings form */ }
```

### Do use Brio for

- Play / pause / rewind / forward (`data-click=play`, `pause`, `playPrevious`, `playNext`)
- Translation toggle (`data-click=toggleTranslation`)
- Settings open/close (`openDialog(settings)`, `closeDialog(settings)`)
- Home title dropdowns (`data-click=toggleTitleMenu`, `data-change=updateTitleFilter`), filters, history toggle, onboarding controls
- Developer nav controls (`data-click`, `data-input`)

### Do not use Brio for

- Audio `timeupdate` / `ended` / seeking logic
- Sentence click handlers and auto-scroll
- `pagehide` progress persistence
- Range slider keyboard handling in settings
- Cookie ↔ localStorage sync (`setLangPref` in `index.php` / `onboarding.js`)
- Title-menu light dismiss (outside click / Escape) in `home.js`

Language prefs use **`setLangPref(key, value)`** — writes both `localStorage` and cookies so PHP can read them on next request. Do not replace with Brio’s storage helpers.

---

## Dialogs

Settings is a native `<dialog>`:

| Id | Where | Role |
|----|-------|------|
| `#settings` | `assets/partials/settings-dialog.php` | Bottom sheet: theme; on home also translation language; in the player also reader controls |

**Contract**

```html
<dialog id=settings class="dialog-sheet settings">
  <div class=panel>
    <button data-el=close-button data-click="closeDialog(settings)">…</button>
    <form data-input=updateSettings data-change=updateSettings>…</form>
  </div>
</dialog>
```

- No custom scrim — use native `::backdrop`
- Project CSS wins over Brio’s centered dialog on wide viewports (`#settings` stays a bottom sheet)
- `updateThemeColor()` in `settings.js` checks `settingsDialog.open`, not `.hidden`

Home read-along language is a single-select title menu; levels are a multi-select (`toggleTitleMenu`, `updateTitleFilter`). Consecutive levels collapse to a range (`A1-B2`). Trigger width follows the active label. No comma in the title. They apply immediately via `setLangPref` (no reload). They are not in `#settings`. Translation language in the settings sheet applies on change (`data-change=saveCatalogPrefs`) and reloads. There is no save button; the reader sheet has no title.

---

## JavaScript files

| File | Scope |
|------|-------|
| `assets/scripts.js` | Story player: audio, sentences, settings, translation, progress |
| `assets/home.js` | Home: filters, continue reading, header language/level dropdowns |
| `assets/onboarding.js` | First-run flow; two steps — language tiles + translate menu, then demo with speed/pause |

New **chrome** actions → global function + `data-click`/`data-change` in HTML.

New **player** logic → `scripts.js`, wired via DOM events or existing init — not Brio.

---

## CSS conventions

Three layers in `assets/styles.css` (see index comment at top):

1. **Tokens** — `:root` custom properties (`--spacing-*`, `--gap-*`, colors, radii)
2. **Utilities** — section 3 “Layout”: `.flex`, `.grid`, `.gap-*`, `.text-color-*`, `.font-size-*`, `.full-width`, `.padding-page`
3. **Components** — story, nav, settings segments, popover curve, etc.

### Naming

- **No BEM** — no `block__element` or `block--modifier`
- Modifiers = extra classes: `.pill.choice`, `ul.history`, `li.featured`, `.settings-segment label > span.button`
- Nest under component: `.story-item .body`, `.story-item .badge`, `.story-item progress`

### Spacing

Prefer tokens and utilities over raw `rem` in new code:

```css
padding: var(--spacing-16);
gap: var(--gap-small);
```

**Hardcoded rem allowed** (do not “tokenize” these):

- Translation popover close button + `.curve` (5rem × 1.5rem, `left: -1rem`)
- Nav clearance (`12rem` content padding; iOS `8rem` / `11rem` popover bottom)
- `calc(... - 1px)` border offsets on buttons
- Shadows and blur values

### Layout in HTML

Build layout with utilities instead of one-off flex/gap classes:

```html
<div class="flex columns gap-small">
<header class="flex gap-small">
```

Component CSS only where utilities cannot express the design (radio cards, featured continue card, slider thumbs, popover curve).

---

## PHP conventions

- Escape output: `e()` helper
- Strings: `t('key')` via `assets/i18n.php`
- Icons: `icon('name', $attrs)` from `assets/icons.php`
- Story lists: `render_story_list()` / `story_list_item()` in `assets/story.php`

**Story folder layout**

```
stories/<slug>/
  index.php          → sets $_GET['slug'], includes view.php
  story.json         → metadata, voices, timestamps
  text/<lang>.json   → source headings (optional)
  translations/*.json
```

Audio files live under `audio/<slug>/`.

---

## i18n & preferences

| Mechanism | Keys |
|-----------|------|
| Cookies + localStorage | `readalong-read`, `readalong-translate`, `readalong-level`, `readalong-ui`, `readalong-onboarding-complete` |
| PHP reads | `lang_pref()`, `needs_onboarding()` in `assets/helpers.php` |
| UI locale | `ui_locale()`, browser detection |

Onboarding is shown when neither `readalong-onboarding-complete` nor `readalong-read` cookie exists.

---

## Verification checklist

After UI or chrome changes, test:

**Home**

- [ ] Header reads as one title: Readalong language dropdown level dropdown (no commas)
- [ ] Language is single-select; levels are multi-select with ranges like A1-B2; trigger width follows the active label
- [ ] Language and level filters apply immediately (no reload)
- [ ] Settings gear: translation language + theme only (not read-along/level)
- [ ] Settings: open, Escape, backdrop, close X; translation language applies on change + reload; no save button
- [ ] Filters: kind pills, duration select, clear filters
- [ ] History toggle (only when 2+ continue items)
- [ ] Featured continue card layout

**Onboarding**

- [ ] Step 1: subtle translate/UI dropdown with flags; read-along language tiles with flags
- [ ] Step 1 → step 2 via Next; no demo on step 1
- [ ] Step 2: demo play/pause, speed and sentence-pause sliders, Back to step 1
- [ ] Continue → home with saved prefs and reader settings

**Story**

- [ ] Play / pause / rewind / forward
- [ ] Translation show/hide; popover close button alignment
- [ ] Settings sheet: sliders, theme, font, layout (no title, no save button)
- [ ] Settings bottom sheet on desktop and ~390px width

**Regressions**

- [ ] No `onclick=` in PHP/HTML
- [ ] No BEM class names (`__`, `--`) in new code
- [ ] `icon-only.small` does not shrink translation popover close button (scoped overrides in `styles.css`)

---

## Common pitfalls

1. **`onclick` on buttons** — use `data-click`; Brio binds at runtime.
2. **Custom dialog scrims** — use `<dialog>` + Brio; project CSS styles the sheet.
3. **BEM in new markup** — use element nesting + utility classes.
4. **Forgetting cache `?v=`** — browsers cache CSS/JS aggressively.
5. **Player logic via Brio** — sentence timing stays in `scripts.js`.
6. **Settings segment `.button` spans** — styled as cards, not global `<button>` resets; scope carefully if adding global button rules.

---

## File map

```
index.php                 Home + inline setLangPref / cookie sync
assets/
  helpers.php             PHP utilities, needs_onboarding, lang prefs
  story.php               Story listing, render_story_list
  story-shell.php         Story page HTML shell
  scripts.js              Player + settings
  home.js                 Home chrome actions
  onboarding.js           Onboarding flow
  styles.css              All project CSS
  brio/                   Vendored Brio (do not edit unless syncing from ../brio)
  partials/
    head.php              CSS links
    scripts.php           Brio + scripts.js
    nav.php               Player controls
    settings-dialog.php   #settings dialog
    onboarding.php        First-run screen
    translation-popover.php
stories/<slug>/           Content + thin index.php stub
router.php                Dev server routes
```
