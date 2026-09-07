/* Utilities
  -----------------------------------------------------------------------------
  Requires: defer attribute or placement before </body>
  Dependencies (recommended config hooks):
  - getData uses `configureAuth(fn)` (fallback: legacy global `jwtToken`)
  - getRelativeDate uses `configureTranslations(obj)` (fallback: legacy global `translations`)
----------------------------------------------------------------------------- */

// ─── Configuration hooks ──────────────────────────────────────────────────────

let brioAuthProvider = null; // () => string | Promise<string>
let brioTranslations = null; // { today, yesterday }
let warnedMissingAuth = false;
let warnedMissingTranslations = false;

function configureAuth(provider) {
  if (provider == null) {
    brioAuthProvider = null;
    return;
  }
  brioAuthProvider = (typeof provider === 'function') ? provider : () => provider;
}

function configureTranslations(obj) {
  brioTranslations = (obj && typeof obj === 'object') ? obj : null;
}

window.configureAuth = configureAuth;
window.configureTranslations = configureTranslations;


/* 1. DOM helpers
----------------------------------------------------------------------------- */

function hasAncestor(element, selector) {
  while (element = element.parentNode) {
    if (element == document) return false;
    if (element.matches(selector)) return true;
  }
  return false;
}

function focus(elementId) {
  let focusElement = document.getElementById(elementId);
  if (focusElement) focusElement.focus();
}

function disable(el, event, querySelector) {
  let element = querySelector
    ? document.body.querySelector(querySelector)
    : el;
  if (element) element.disabled = true;
}

// Called automatically by actions.js on every submit event.
// Sets form fields to readOnly so they still submit with the form.
// Also handles elements outside the form using [form="formId"].
// Adds data-state="loading" to the submit button for CSS loading state.
// Also marks submit and form with ARIA loading metadata.
// Call enableForm(formId) to reverse — called automatically by readServerMessages
// when the server returns success: false.
function disableForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  // Disable fields inside the form
  for (const element of form.elements) {
    element.readOnly = true;
    element.dataset.wasDisabled = element.disabled ? 'true' : 'false';
  }

  // Disable fields outside the form linked via [form="formId"]
  for (const element of document.querySelectorAll(`[form="${formId}"]`)) {
    element.readOnly = true;
    element.dataset.wasDisabled = element.disabled ? 'true' : 'false';
  }

  form.setAttribute('aria-busy', 'true');

  // Add loading state to submit button
  const submitButton = form.querySelector('[type=submit]');
  if (submitButton) {
    submitButton.dataset.state = 'loading';
    submitButton.dataset.loading = 'true'; // back-compat for existing projects
    submitButton.setAttribute('aria-disabled', 'true');
    submitButton.disabled = true;
  }
}

// Reverses disableForm. Called automatically by readServerMessages when the
// server returns success: false. Call manually if you handle errors outside
// readServerMessages.
function enableForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  for (const element of [...form.elements, ...document.querySelectorAll(`[form="${formId}"]`)]) {
    element.readOnly = false;
    if (element.dataset.wasDisabled === 'true') element.disabled = true;
    delete element.dataset.wasDisabled;
  }

  form.removeAttribute('aria-busy');

  const submitButton = form.querySelector('[type=submit]');
  if (submitButton) {
    delete submitButton.dataset.state;
    delete submitButton.dataset.loading;
    submitButton.removeAttribute('aria-disabled');
  }
}

function setThemeColor(color) {
  let themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', color);
  } else {
    themeMeta = document.createElement('meta');
    themeMeta.setAttribute('name', 'theme-color');
    themeMeta.setAttribute('content', color);
    document.head.appendChild(themeMeta);
  }
}


/* 2. String helpers
----------------------------------------------------------------------------- */

function ucFirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function hasNumber(string) {
  return /\d/.test(string);
}


/* 3. Number helpers
----------------------------------------------------------------------------- */

function getRandomNumber(range = [1, 6], negative = false) {
  let number = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
  if (negative) number *= Math.round(Math.random()) ? 1 : -1;
  return number;
}


/* 4. URL helpers
----------------------------------------------------------------------------- */

function removeParams() {
  let url = new URL(window.location.href);
  history.replaceState({}, '', url.origin + url.pathname);
}


/* 5. Storage helpers
----------------------------------------------------------------------------- */

function getStorageItem(item, defaultValue) {
  try {
    const stored = localStorage.getItem(item);
    if (stored === null) {
      localStorage.setItem(item, defaultValue);
      return defaultValue;
    }
    return stored;
  } catch (e) {
    console.warn('[utils] localStorage unavailable:', e);
    return defaultValue;
  }
}


/* 6. Date helpers
----------------------------------------------------------------------------- */

// Requires a `translations` object in scope: { today: '...', yesterday: '...' }
function getRelativeDate(timestamp) {
  const t = brioTranslations || (typeof translations !== 'undefined' ? translations : null);
  if (!t || !t.today || !t.yesterday) {
    if (!warnedMissingTranslations) {
      warnedMissingTranslations = true;
      console.warn('[utils] getRelativeDate requires configureTranslations({ today, yesterday }) (or legacy global `translations`).');
    }
    return new Date(timestamp).toLocaleDateString(document.documentElement.lang);
  }

  let today    = new Date(),
      date     = new Date(timestamp),
      lang     = document.documentElement.lang,
      day      = date.toLocaleString(lang, { weekday: 'long' }),
      month    = date.toLocaleString(lang, { month: 'long' }),
      msInDay  = 24 * 60 * 60 * 1000,
      msInWeek = msInDay * 7;

  let difference = today - date;

  if (difference < msInDay)      return t['today'];
  if (difference < msInDay * 2)  return t['yesterday'];
  if (difference < msInWeek)     return ucFirst(day);
  else                           return date.getDate() + ' ' + month;
}


/* 7. Network helpers
----------------------------------------------------------------------------- */

// Requires a `jwtToken` variable in scope
async function getData(url, parse) {
  const token = brioAuthProvider
    ? await brioAuthProvider()
    : (typeof jwtToken !== 'undefined' ? jwtToken : null);

  if (!token) {
    if (!warnedMissingAuth) {
      warnedMissingAuth = true;
      console.warn('[utils] getData requires configureAuth(fn) (or legacy global `jwtToken`).');
    }
    throw new Error('[utils] Missing auth token. Call configureAuth(fn) first.');
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type':  'application/json'
    }
  });
  if (!response.ok) throw new Error(`[utils] getData failed: ${response.status} ${response.statusText}`);
  return parse ? response.json() : response.text();
}


/* 8. Timing helpers
----------------------------------------------------------------------------- */

// Debounce — delays execution until after `wait` ms of inactivity.
// Use for search inputs, resize handlers, anything that fires rapidly
// but should only act after the user stops.
//
// Usage:
//   const onSearch = debounce((event) => fetchResults(event.target.value), 300);
//   input.addEventListener('input', onSearch);

function debounce(fn, wait = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

// Throttle — limits execution to at most once per `wait` ms.
// Use for scroll handlers, mousemove, anything that should fire
// continuously but at a controlled rate.
//
// Usage:
//   const onScroll = throttle(() => updateHeader(), 100);
//   window.addEventListener('scroll', onScroll);

function throttle(fn, wait = 100) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= wait) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}


/* 9. Disclosure toggle
----------------------------------------------------------------------------- */

// Toggle visibility of a target element. Manages hidden + aria-expanded/controls.
//
// Usage:
//   Explicit target:   data-click="toggle(target-id)" aria-expanded="false"
//   Implicit sibling:  data-click="toggle"            aria-expanded="false"
//
// Add aria-expanded="false" to the trigger to declare the correct initial ARIA
// state before any interaction — toggle keeps it in sync from that point on.
// If no target is given, the next sibling element is used. An id is generated
// on the sibling if none exists.
//
// Examples:
//   <button data-click="toggle(faq-1)" aria-expanded="false">Question</button>
//   <div id="faq-1" hidden>Answer</div>
//
//   <button data-click="toggle" aria-expanded="false">Show more</button>
//   <div hidden>More content</div>

function toggle(el, event, target) {
  if (!el) return;

  let region;

  if (target) {
    region = document.getElementById(target);
    if (!region) {
      console.warn(`[toggle] No element found with id "${target}"`);
      return;
    }
  } else {
    // Fall back to next sibling
    region = el.nextElementSibling;
    if (!region) {
      console.warn('[toggle] No target given and no next sibling found');
      return;
    }
    // Auto-generate an id if absent so aria-controls can reference it
    if (!region.id) region.id = 'toggle-' + Math.random().toString(36).slice(2, 7);
  }

  // Wire aria-controls (idempotent)
  if (!el.hasAttribute('aria-controls')) el.setAttribute('aria-controls', region.id);

  const isHidden = region.hasAttribute('hidden');
  if (isHidden) {
    region.removeAttribute('hidden');
    el.setAttribute('aria-expanded', 'true');
  } else {
    region.setAttribute('hidden', '');
    el.setAttribute('aria-expanded', 'false');
  }
}


/* 10. Dynamic form fields
----------------------------------------------------------------------------- */

// Supported syntax on any element:
//   data-show-when    data-hide-when    data-enable-when    data-disable-when
//
// Condition syntax:
//   fieldId==value          field equals value
//   fieldId!=value          field does not equal value
//
// Multiple conditions:
//   cond1||cond2            OR  — attribute applied if ANY condition is met
//   cond1&&cond2            AND — attribute applied if ALL conditions are met
//
// Note: || and && cannot be mixed in one expression.
//
// Examples:
//   data-show-when="plan==pro||plan==enterprise"
//   data-show-when="plan==pro&&seats==10"
//   data-hide-when="status!=active"

function updateDynamicFields() {
  const fieldTypes = {
    'hide':    { attribute: 'hidden',   defaultState: false },
    'show':    { attribute: 'hidden',   defaultState: true  },
    'disable': { attribute: 'disabled', defaultState: false },
    'enable':  { attribute: 'disabled', defaultState: true  }
  };

  for (const type in fieldTypes) {
    const config = fieldTypes[type];
    const fields = document.querySelectorAll(`[data-${type}-when]`);

    for (const field of fields) {
      const expression   = field.dataset[`${type}When`];
      const conditionMet = evaluateConditions(expression);
      const shouldHaveAttribute = config.defaultState !== conditionMet;

      if (shouldHaveAttribute) field.setAttribute(config.attribute, '');
      else field.removeAttribute(config.attribute);
    }
  }
}

function evaluateConditions(expression) {
  // AND — all conditions must be met
  if (expression.includes('&&')) {
    return expression.split('&&').every(c => evaluateSingleCondition(c.trim()));
  }
  // OR — at least one condition must be met
  if (expression.includes('||')) {
    return expression.split('||').some(c => evaluateSingleCondition(c.trim()));
  }
  return evaluateSingleCondition(expression.trim());
}

function evaluateSingleCondition(condition) {
  const isNotEqual = condition.includes('!=');
  const [elementId, targetValue] = condition.split(isNotEqual ? '!=' : '==').map(s => s.trim());
  const element = document.getElementById(elementId);
  if (!element) return false;

  // Delegate to getElementValue so checkbox, select, textarea, and display
  // elements are all handled consistently in one place.
  const currentValue = getElementValue(element);
  return isNotEqual ? currentValue !== targetValue : currentValue === targetValue;
}

updateDynamicFields();


/* 11. Text helper
----------------------------------------------------------------------------- */

// Direct text helper kept as a small utility.
// For declarative reactivity, use data-bind/data-bind-* from binding.js.

function setText(target, value) {
  const el = typeof target === 'string'
    ? document.getElementById(target)
    : target;
  if (!el) {
    console.warn(`[setText] No element found for target: "${target}"`);
    return;
  }
  el.textContent = value;
}

// Returns the current value of an element.
// Form fields → .value  |  Checkboxes → 'true'/'false'  |  Other → .textContent
// Shared by bind evaluation and dynamic field conditions.
function getElementValue(el) {
  if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
    return el.type === 'checkbox' ? el.checked.toString() : el.value;
  }
  return el.textContent;
}

// Toggle a CSS class on an element.
//
// JS usage:
//   toggleClassName('panel-1', 'is-open')
//   toggleClassName(panelEl, 'is-open')
//
// data-click usage:
//   data-click="toggleClassName(panel-1,is-open)"
//   data-click="toggleClassName(this,is-open)"            // use the trigger element
function toggleClassName(el, className, target) {
  // Called via actions.js as: (triggerEl, event, "target,className")
  if (el instanceof Element && className && typeof className === 'object' && typeof target === 'string') {
    const triggerEl = el;
    const raw = target.trim();
    const comma = raw.indexOf(',');
    if (comma === -1) {
      console.warn('[toggleClassName] Expected "target,className" e.g. toggleClassName(test,open)');
      return;
    }
    const actionElTarget = raw.slice(0, comma).trim();
    const actionClassName = raw.slice(comma + 1).trim();
    if (!actionElTarget || !actionClassName) {
      console.warn('[toggleClassName] Expected "target,className" e.g. toggleClassName(test,open)');
      return;
    }
    const targetEl = actionElTarget === 'this' ? triggerEl : resolveToggleTarget(actionElTarget);
    if (!targetEl) {
      console.warn(`[toggleClassName] No element found for target: "${actionElTarget}"`);
      return;
    }
    targetEl.classList.toggle(actionClassName);
    return;
  }

  // Direct helper call: (targetElOrId, className)
  const resolved = resolveToggleTarget(el);
  if (!resolved) {
    console.warn(`[toggleClassName] No element found for target: "${el}"`);
    return;
  }
  if (!className) return;
  resolved.classList.toggle(className);
}

function resolveToggleTarget(target) {
  if (!target) return null;
  if (target instanceof Element) return target;
  if (typeof target !== 'string') return null;

  const s = target.trim();
  if (!s) return null;
  if (s === 'this') return null; // only valid in action mode
  // Strictly treat strings as element ids (not selectors).
  return document.getElementById(s);
}

window.setText = setText;
window.toggleClassName = toggleClassName;

/*

  Action Framework
  ─────────────────
  Bind behaviour to HTML elements declaratively using data-attributes.

    <button data-click="openDialog(settings)">Open</button>
    <button data-click="openDialog(settings)|openTab(general)">Open</button>

  Supported event types: click, change, input, submit (always registered)
  Additional event types can be registered on demand via registerEvent().

  Keyboard shortcut (single key):   data-key="n"
  Keyboard shortcut (chord):        data-key="Ctrl+s"  data-key="Ctrl+Shift+z"
  Supported modifiers (in order):   Ctrl  Alt  Shift  Meta
  URL trigger:                      ?action=openDialog(settings)

  Built-in action shorthand:
    url:<href>   — navigate to a URL  (e.g. data-click="url:https://example.com")
    refresh      — reload the page

  All other action names are resolved dynamically from the global scope,
  so any function you define is immediately available as a data-action value.
  The function signature is: myAction(targetElement, event, target)

  Registering additional event types:
  ─────────────────────────────────────
  Call registerEvent() before injecting elements that use non-core event types.

    registerEvent('dragstart');
    registerEvent('dragover');

*/


// ─── 1. Event listeners ───────────────────────────────────────────────────────

const registeredEvents = new Set(['click', 'change', 'input', 'submit']);

document.addEventListener('click',            handleEvents,      false);
document.addEventListener('change',           handleEvents,      false);
document.addEventListener('input',            handleEvents,      false);
document.addEventListener('submit',           handleEvents,      false);
document.addEventListener('keydown',          handleKeys,        false);
document.addEventListener('DOMContentLoaded', checkParameters,   false);
document.addEventListener('DOMContentLoaded', validateBrioHtmlOnInit, false);


// ─── 2. Dynamic event registration ───────────────────────────────────────────

function registerEvent(eventType) {
  if (!registeredEvents.has(eventType)) {
    document.addEventListener(eventType, handleEvents, false);
    registeredEvents.add(eventType);
  }
}


// ─── 3. Event handler ─────────────────────────────────────────────────────────

function handleEvents(event) {

  // Calls disableForm (defined in utils.js) after every submit to lock the
  // form during the request. Reversed automatically by readServerMessages
  // when the server returns success: false.
  if (event.type === 'submit' && typeof disableForm === 'function') {
    disableForm(event.target.id);
  }

  // Fire data-action if present on the target or any ancestor.
  // Text nodes (e.g. click on button label) have no closest() — use parentElement.
  const rawTarget = event.target;
  const targetEl = rawTarget instanceof Element ? rawTarget : rawTarget?.parentElement;
  const targetElement = targetEl?.closest(`[data-${event.type}]:not([disabled])`);
  if (targetElement) {
    determineAction(targetElement, event, targetElement.dataset[event.type]);
  }

  // Refresh conditional field visibility on change and submit.
  // Not run on input — dynamic fields are controlled by selects and checkboxes
  // (which fire change), not by freeform text input.
  if (['change', 'submit'].includes(event.type) && typeof updateDynamicFields === 'function') {
    updateDynamicFields();
  }

  // Refresh declarative bindings on change, input, and submit.
  if (['change', 'input', 'submit'].includes(event.type) && typeof refreshBindings === 'function') {
    refreshBindings();
  }

  // Intercept no-refresh form submits after action dispatch.
  // Action handlers can opt out by calling event.preventDefault().
  if (
    event.type === 'submit' &&
    event.target instanceof HTMLFormElement &&
    event.target.hasAttribute('data-fetch') &&
    !event.defaultPrevented &&
    typeof brioSubmitFetch === 'function'
  ) {
    brioSubmitFetch(event.target, event);
  }

}


// ─── 4. Keyboard handler ──────────────────────────────────────────────────────

// Index of data-key elements.
// Incrementally maintained on DOM changes instead of full map rebuilds.
let keyIndex = new Map(); // chord string -> Set<HTMLElement>
const chordByEl = new WeakMap(); // el -> chord string

function indexKeyElement(el) {
  if (!(el instanceof Element)) return;
  const chord = el.dataset.key;
  if (!chord) return;

  let set = keyIndex.get(chord);
  if (!set) {
    set = new Set();
    keyIndex.set(chord, set);
  }
  set.add(el);
  chordByEl.set(el, chord);
}

function unindexKeyElement(el) {
  if (!(el instanceof Element)) return;
  const chord = chordByEl.get(el);
  if (!chord) return;

  const set = keyIndex.get(chord);
  if (set) {
    set.delete(el);
    if (set.size === 0) keyIndex.delete(chord);
  }
  chordByEl.delete(el);
}

function indexKeyTree(root) {
  if (!root) return;
  if (root instanceof Element && root.hasAttribute?.('data-key')) indexKeyElement(root);
  if (root.querySelectorAll) for (const el of root.querySelectorAll('[data-key]')) indexKeyElement(el);
}

function unindexKeyTree(root) {
  if (!root) return;
  if (root instanceof Element && root.hasAttribute?.('data-key')) unindexKeyElement(root);
  if (root.querySelectorAll) for (const el of root.querySelectorAll('[data-key]')) unindexKeyElement(el);
}

const keyIndexObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      for (const node of mutation.addedNodes) indexKeyTree(node);
      for (const node of mutation.removedNodes) unindexKeyTree(node);
      continue;
    }

    if (mutation.type === 'attributes' && mutation.attributeName === 'data-key') {
      const el = mutation.target;
      unindexKeyElement(el);
      if (el instanceof Element && el.dataset?.key) indexKeyElement(el);
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  indexKeyTree(document.body);
  keyIndexObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-key']
  });
});

function handleKeys(event) {
  // Ignore shortcuts while the user is typing in a field
  if (event.target.matches('input, textarea, select, [contenteditable]')) return;

  const chord = buildChord(event);
  const targets = keyIndex.get(chord);
  if (!targets) return;

  for (const el of targets) {
    if (el.offsetParent !== null) {
      event.preventDefault(); // prevent browser defaults (e.g. Ctrl+S save dialog)
      el.click();
    }
  }
}

// Builds a normalised chord string from a keyboard event.
// Modifiers are always in this order: Ctrl, Alt, Shift, Meta.
// The key is lowercased for single printable characters.
// Examples: "n", "Escape", "Ctrl+s", "Ctrl+Shift+z", "Alt+ArrowDown"
function buildChord(event) {
  const modifiers = [];
  if (event.ctrlKey)  modifiers.push('Ctrl');
  if (event.altKey)   modifiers.push('Alt');
  if (event.shiftKey) modifiers.push('Shift');
  if (event.metaKey)  modifiers.push('Meta');

  // Lowercase single printable characters; keep special keys as-is (Escape, Enter, ArrowDown…)
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

  return modifiers.length ? modifiers.join('+') + '+' + key : key;
}


// ─── 5. URL parameter actions ─────────────────────────────────────────────────

function checkParameters() {
  const action = new URL(window.location.href).searchParams.get('action');
  if (action) determineAction(null, null, action);
}


// ─── 6. Action parser ─────────────────────────────────────────────────────────

const ACTION_REGEX = /^(\w+)(?:\((.+)\))?$/;

function determineAction(targetElement, event, action) {
  action = action.trim();

  // Built-in: url redirect — checked before pipe split so URLs containing
  // a pipe character are not incorrectly split into multiple actions.
  if (action.startsWith('url:')) {
    window.location.href = action.slice(4);
    return;
  }

  // Multiple actions separated by pipe
  if (action.includes('|')) {
    for (const single of action.split('|')) {
      determineAction(targetElement, event, single.trim());
    }
    return;
  }

  // Built-in: page refresh
  if (action === 'refresh') {
    window.location.reload();
    return;
  }

  // Extract action name and optional target argument: actionName(target)
  const match = action.match(ACTION_REGEX);
  if (!match) {
    console.warn(`[actions] Could not parse action: "${action}"`);
    return;
  }

  const actionName = match[1];
  const target     = match[2] ?? null;

  initiateAction(targetElement, event, actionName, target);
}


// ─── 7. Dynamic action dispatcher ────────────────────────────────────────────

function initiateAction(targetElement, event, action, target) {
  if (typeof window[action] === 'function') {
    window[action](targetElement, event, target);
  } else {
    console.warn(`[actions] Unknown action: "${action}". Define window.${action} to handle it.`);
  }
}


// ─── 8. Init-time HTML validation ─────────────────────────────────────────────

function validateBrioHtmlOnInit() {
  // Validate [data-message][data-for] targets.
  for (const region of document.querySelectorAll('[data-message][data-for]')) {
    const id = region.dataset.for;
    if (!id) continue;
    if (!document.getElementById(id)) {
      console.warn(`[feedback] [data-message][data-for="${id}"] points to missing #${id}.`, region);
    }
  }

  // Validate data-fetch forms — enableForm requires a form id.
  for (const form of document.querySelectorAll('form[data-fetch]')) {
    if (!form.id) {
      console.warn('[binding] form[data-fetch] should have an id so enableForm can re-enable after submit.', form);
    }
    const appendTarget = form.getAttribute('data-fetch-append-target');
    if (appendTarget && !form.querySelector(appendTarget)) {
      console.warn(`[binding] form[data-fetch-append-target="${appendTarget}"] did not match any element inside the form.`, form);
    }
  }

  // Validate actions referenced by data-* attributes.
  for (const attr of ['click', 'change', 'input', 'submit']) {
    for (const el of document.querySelectorAll(`[data-${attr}]`)) {
      validateActionString(el.dataset[attr], el);
    }
  }
}

function validateActionString(action, elForContext = null) {
  action = (action || '').trim();
  if (!action) return;

  // Built-in: url redirect — checked before pipe split so URLs containing
  // a pipe character are not incorrectly split into multiple actions.
  if (action.startsWith('url:')) return;

  if (action.includes('|')) {
    for (const single of action.split('|')) validateActionString(single.trim(), elForContext);
    return;
  }

  if (action === 'refresh') return;

  const match = action.match(ACTION_REGEX);
  if (!match) {
    console.warn('[actions] Could not parse action:', action, elForContext);
    return;
  }

  const actionName = match[1];
  const target = match[2] ?? null;

  // Validate dialog targets (common mistake).
  if ((actionName === 'openDialog' || actionName === 'closeDialog') && target) {
    const dialog = document.getElementById(target);
    if (!(dialog instanceof HTMLDialogElement)) {
      console.warn(`[actions] ${actionName}(${target}) but no <dialog id="${target}"> found.`, elForContext);
    }
  }

  // Validate that the action function exists in global scope.
  if (typeof window[actionName] !== 'function') {
    console.warn(`[actions] Unknown action: "${actionName}". Define window.${actionName} to handle it.`, elForContext);
  }
}

/* Binding (Reactivity v0.1)
  -----------------------------------------------------------------------------
  Requires: defer attribute or placement before </body>
  Designed to work alongside actions.js, utils.js, and feedback.js.

  Declarative bindings:
    <span data-bind="user.name"></span>
    <a data-bind-href="links.profile" data-bind="user.name"></a>
    <button data-bind-disabled="ui.saving">Save</button>
    <span data-bind="{{#qty}} × {{pricing.currency}}{{#price}}"></span>

  State API:
    BRIO_API.setState({ user: { name: 'Ada' } })
    BRIO_API.getState('user.name')
    BRIO_API.refreshBindings()

  No-refresh submit response extensions:
    {
      success: true|false,
      messages: [...],
      state:   {...},               // merged into BRIO state
      patches: [{ target, html }],  // replace target innerHTML
      append:  [{ target, html }]   // append HTML
    }

  Explicit security contract for patches/append:
    - `patches[*].html` and `append[*].html` are inserted as HTML into the DOM.
    - Brio does NOT sanitize by default.
    - Only use with HTML you trust (typically server-rendered templates you control).
    - If any HTML can contain untrusted user input, sanitize it first. You can
      provide a sanitizer via `configureSanitizeHtml(fn)`.
----------------------------------------------------------------------------- */

const BRIO_STATE = {};

const BOOLEAN_ATTRS = new Set([
  'disabled', 'checked', 'hidden', 'readonly', 'required', 'selected', 'open'
]);
const ALLOWED_BIND_ATTRS = new Set([
  'href', 'src', 'alt', 'title', 'value', 'placeholder',
  'disabled', 'checked', 'hidden', 'readonly', 'required', 'selected', 'open',
  'aria-label', 'aria-describedby', 'aria-controls', 'aria-expanded',
  'role', 'id', 'name', 'for'
]);
const ALLOWED_BIND_ATTR_PREFIXES = ['data-', 'aria-'];

function mergeState(target, source) {
  if (!source || typeof source !== 'object') return target;
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
        target[key] = {};
      }
      mergeState(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function getPathValue(path, source) {
  return path.split('.').reduce((obj, key) => obj?.[key], source);
}

function setPathValue(path, value, source) {
  const keys = path.split('.');
  let ref = source;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!ref[key] || typeof ref[key] !== 'object' || Array.isArray(ref[key])) ref[key] = {};
    ref = ref[key];
  }
  ref[keys[keys.length - 1]] = value;
}

function normalizeDatasetBindKey(datasetKey) {
  // dataset key examples: bindHref, bindAriaLabel, bindDataId
  const attrPart = datasetKey.slice(4);
  return attrPart.replace(/[A-Z]/g, (match) => '-' + match.toLowerCase()).replace(/^-/, '');
}

function coerceBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const lowered = value.toLowerCase().trim();
    return !(lowered === '' || lowered === 'false' || lowered === '0' || lowered === 'null' || lowered === 'undefined');
  }
  return !!value;
}

function resolveToken(token, context = null) {
  if (token.startsWith('#')) {
    const sourceEl = document.getElementById(token.slice(1));
    if (!sourceEl) return null;
    return (typeof getElementValue === 'function') ? getElementValue(sourceEl) : sourceEl.textContent;
  }

  if (context && typeof context === 'object') {
    const contextValue = getPathValue(token, context);
    if (contextValue !== undefined && contextValue !== null) return contextValue;
  }

  const stateValue = getPathValue(token, BRIO_STATE);
  if (stateValue !== undefined && stateValue !== null) return stateValue;

  return getPathValue(token, window);
}

function evaluateBindingExpression(expression, context = null) {
  if (!expression) return null;
  const trimmed = expression.trim();
  if (!trimmed) return null;

  if (trimmed.includes('{{')) {
    return trimmed.replace(/\{\{([^}]+)\}\}/g, (_, token) => {
      const value = resolveToken(token.trim(), context);
      return value == null ? '' : String(value);
    });
  }

  const value = resolveToken(trimmed, context);
  return value == null ? null : value;
}

function applyBoundAttribute(el, attrName, value) {
  if (BOOLEAN_ATTRS.has(attrName)) {
    const enabled = coerceBoolean(value);
    if (attrName === 'hidden') {
      if (enabled) el.setAttribute('hidden', '');
      else el.removeAttribute('hidden');
      return;
    }
    el[attrName] = enabled;
    if (enabled) el.setAttribute(attrName, '');
    else el.removeAttribute(attrName);
    return;
  }

  if (attrName === 'value' && 'value' in el) {
    if (document.activeElement !== el) el.value = value == null ? '' : String(value);
    if (value == null || value === '') el.removeAttribute('value');
    else el.setAttribute('value', String(value));
    return;
  }

  if (value == null || value === '') {
    el.removeAttribute(attrName);
    return;
  }

  el.setAttribute(attrName, String(value));
}

function isAllowedBindAttr(attrName) {
  if (ALLOWED_BIND_ATTRS.has(attrName)) return true;
  return ALLOWED_BIND_ATTR_PREFIXES.some((prefix) => attrName.startsWith(prefix));
}

function compileBindingExpression(expression) {
  if (!expression) return () => null;
  const trimmed = String(expression).trim();
  if (!trimmed) return () => null;

  // Fast path: no template interpolation.
  if (!trimmed.includes('{{')) {
    return (context = null) => {
      const value = resolveToken(trimmed, context);
      return value == null ? null : value;
    };
  }

  // Template mode: replace {{ tokens }}.
  const parts = [];
  const re = /\{\{([^}]+)\}\}/g;
  let lastIndex = 0;
  let match;

  while ((match = re.exec(trimmed))) {
    if (match.index > lastIndex) parts.push(trimmed.slice(lastIndex, match.index));
    parts.push({ token: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < trimmed.length) parts.push(trimmed.slice(lastIndex));

  return (context = null) => {
    let out = '';
    for (const part of parts) {
      if (typeof part === 'string') {
        out += part;
      } else {
        const value = resolveToken(part.token, context);
        out += value == null ? '' : String(value);
      }
    }
    return out;
  };
}

// Binding caches so `refreshBindings()` doesn't scan `*` repeatedly.
let bindingIndexInitialized = false;
const indexedTextBindEls = new WeakSet();
const indexedAttrBindEls = new WeakSet();
const warnedUnsupportedBindEls = new WeakSet();

const textBindEntries = []; // { el, fn }
const attrBindEntries = []; // { el, attrName, fn }

let brioSanitizeHtml = null; // (html, { opType, targetSelector }) => string
let warnedUnsafeHtmlInsert = false;

function configureSanitizeHtml(fn) {
  brioSanitizeHtml = (typeof fn === 'function') ? fn : null;
}

window.configureSanitizeHtml = configureSanitizeHtml;

function collectElementNodes(root, { includeRoot = false } = {}) {
  const nodes = [];
  if (!root) return nodes;

  if (includeRoot && root.nodeType === Node.ELEMENT_NODE) nodes.push(root);

  if (root.querySelectorAll) {
    nodes.push(...root.querySelectorAll('*'));
    return nodes;
  }

  if (!root.childNodes) return nodes;

  // DocumentFragment may not implement querySelectorAll (eg. iOS Safari).
  const stack = Array.from(root.childNodes);
  while (stack.length) {
    const n = stack.pop();
    if (!n) continue;
    if (n.nodeType === Node.ELEMENT_NODE) {
      nodes.push(n);
      if (n.childNodes?.length) stack.push(...Array.from(n.childNodes));
    }
  }
  return nodes;
}

function collectMatchingElements(root, selector, { includeRoot = false } = {}) {
  const matches = [];
  if (!root) return matches;

  if (includeRoot && root.nodeType === Node.ELEMENT_NODE && root.matches?.(selector)) {
    matches.push(root);
  }

  if (root.querySelectorAll) {
    matches.push(...root.querySelectorAll(selector));
    return matches;
  }

  for (const el of collectElementNodes(root, { includeRoot: false })) {
    if (el.matches?.(selector)) matches.push(el);
  }
  return matches;
}

function indexBindingsWithin(root) {
  if (!root) return;

  // Text bindings: [data-bind]
  const bindNodes = collectMatchingElements(root, '[data-bind]', { includeRoot: true });

  for (const el of bindNodes) {
    if (indexedTextBindEls.has(el)) continue;
    indexedTextBindEls.add(el);
    textBindEntries.push({
      el,
      fn: compileBindingExpression(el.dataset.bind),
    });
  }

  // Attribute bindings: data-bind-*
  const allNodes = collectElementNodes(root, { includeRoot: true });

  for (const el of allNodes) {
    if (indexedAttrBindEls.has(el)) continue;
    indexedAttrBindEls.add(el);

    for (const [datasetKey, expression] of Object.entries(el.dataset || {})) {
      if (!datasetKey.startsWith('bind') || datasetKey === 'bind') continue;
      const attrName = normalizeDatasetBindKey(datasetKey);
      if (!isAllowedBindAttr(attrName)) {
        if (!warnedUnsupportedBindEls.has(el)) {
          warnedUnsupportedBindEls.add(el);
          console.warn(`[binding] Skipping unsupported bind attribute "${attrName}" on`, el);
        }
        continue;
      }

      attrBindEntries.push({
        el,
        attrName,
        fn: compileBindingExpression(expression),
      });
    }
  }
}

function applyBindingsLocal(scope = document, context = null) {
  const root = scope || document;
  const bindNodes = collectMatchingElements(root, '[data-bind]', { includeRoot: true });

  for (const el of bindNodes) {
    const value = evaluateBindingExpression(el.dataset.bind, context);
    el.textContent = value == null ? '' : String(value);
  }

  const allNodes = collectElementNodes(root, { includeRoot: true });

  for (const el of allNodes) {
    for (const [datasetKey, expression] of Object.entries(el.dataset || {})) {
      if (!datasetKey.startsWith('bind') || datasetKey === 'bind') continue;
      const attrName = normalizeDatasetBindKey(datasetKey);
      if (!isAllowedBindAttr(attrName)) {
        console.warn(`[binding] Skipping unsupported bind attribute "${attrName}" on`, el);
        continue;
      }
      const value = evaluateBindingExpression(expression, context);
      applyBoundAttribute(el, attrName, value);
    }
  }
}

function applyBindings(scope = document, context = null) {
  const root = scope || document;

  if (root === document) {
    if (!bindingIndexInitialized) {
      indexBindingsWithin(document);
      bindingIndexInitialized = true;
    }

    // Update cached bindings.
    for (const entry of textBindEntries) {
      if (!entry.el.isConnected) continue;
      const value = entry.fn(context);
      entry.el.textContent = value == null ? '' : String(value);
    }

    for (const entry of attrBindEntries) {
      if (!entry.el.isConnected) continue;
      const value = entry.fn(context);
      applyBoundAttribute(entry.el, entry.attrName, value);
    }
    return;
  }

  // For sub-scopes (templates/fragments/patch targets), do the old local scan.
  // We also index these nodes so future full refreshes can update them fast.
  indexBindingsWithin(root);
  applyBindingsLocal(root, context);
}

function renderTemplateItems(target, templateId, items) {
  const template = document.getElementById(templateId);
  if (!(template instanceof HTMLTemplateElement)) {
    console.warn(`[binding] No <template> found with id "${templateId}"`);
    return;
  }

  // Strip binding attributes after applying item context, so later full-document
  // applyBindings(document) calls don't overwrite rendered template values.
  function stripBindingAttributes(scope) {
    const nodes = collectElementNodes(scope, { includeRoot: true });
    const bindNodes = collectMatchingElements(scope, '[data-bind]');

    for (const el of bindNodes) {
      el.removeAttribute('data-bind');
      for (const attr of Array.from(el.attributes)) {
        if (attr.name.startsWith('data-bind-')) el.removeAttribute(attr.name);
      }
    }
    for (const el of nodes) {
      for (const attr of Array.from(el.attributes)) {
        if (attr.name.startsWith('data-bind-')) el.removeAttribute(attr.name);
      }
    }
  }

  for (const item of items) {
    const fragment = template.content.cloneNode(true);
    // Apply bindings locally with item context; don't index these into the global
    // refresh cache because they are now "rendered output", not reactive bindings.
    applyBindingsLocal(fragment, item);
    stripBindingAttributes(fragment);
    target.appendChild(fragment);
  }
}

function applyPatches(patches = []) {
  for (const patch of patches) {
    const target = document.querySelector(patch.target);
    if (!target) continue;
    if (patch.html != null) {
      if (!brioSanitizeHtml && !warnedUnsafeHtmlInsert) {
        warnedUnsafeHtmlInsert = true;
        console.warn(
          '[binding] Security contract: patches/append insert HTML without sanitization. ' +
          'Trusted HTML only. For untrusted HTML, call configureSanitizeHtml(fn).'
        );
      }
      const html = brioSanitizeHtml
        ? String(brioSanitizeHtml(patch.html, { opType: 'patch', targetSelector: patch.target }))
        : patch.html;
      target.innerHTML = html;
    }
    indexBindingsWithin(target);
    applyBindings(target);
  }
}

const brioAfterFetchListeners = [];

function registerAfterFetch(fn) {
  if (typeof fn === 'function') brioAfterFetchListeners.push(fn);
}

function resolveAppendTarget(op, form) {
  if (op.target === '__form__' && form instanceof HTMLFormElement) {
    const innerSel = form.getAttribute('data-fetch-append-target');
    if (innerSel) return form.querySelector(innerSel);
    return form.querySelector('[data-comments-list]');
  }
  if (op.target) return document.querySelector(op.target);
  return null;
}

function applyAppend(append = [], form = null) {
  for (const op of append) {
    const target = resolveAppendTarget(op, form);
    if (!target) continue;

    if (op.template && Array.isArray(op.items)) {
      renderTemplateItems(target, op.template, op.items);
      continue;
    }

    if (op.html != null) {
      if (!brioSanitizeHtml && !warnedUnsafeHtmlInsert) {
        warnedUnsafeHtmlInsert = true;
        console.warn(
          '[binding] Security contract: patches/append insert HTML without sanitization. ' +
          'Trusted HTML only. For untrusted HTML, call configureSanitizeHtml(fn).'
        );
      }
      const html = brioSanitizeHtml
        ? String(brioSanitizeHtml(op.html, { opType: 'append', targetSelector: op.target || null }))
        : op.html;
      target.insertAdjacentHTML('beforeend', html);
      indexBindingsWithin(target);
      applyBindings(target);
    }
  }
}

function failDataFetchSubmit(form, message, error) {
  if (typeof showMessage === 'function') {
    showMessage(form, message, 'error');
  }
  if (typeof enableForm === 'function' && form.id) enableForm(form.id);
  if (error) console.warn('[binding] data-fetch submit failed:', error);
}

async function parseDataFetchResponse(form, response) {
  if (!response.ok) {
    failDataFetchSubmit(form, 'Request failed. Please try again.');
    return null;
  }
  try {
    return await response.json();
  } catch (error) {
    failDataFetchSubmit(form, 'Request failed. Please try again.', error);
    return null;
  }
}

async function brioSubmitFetch(form, event) {
  if (!(form instanceof HTMLFormElement) || !form.hasAttribute('data-fetch')) return;
  if (event?.defaultPrevented) return;

  event?.preventDefault();
  if (typeof clearMessages === 'function') clearMessages(form);

  try {
    const method = (form.getAttribute('method') || 'GET').toUpperCase();
    const action = form.getAttribute('action') || window.location.href;
    const formData = new FormData(form);
    const request = { method, credentials: 'same-origin' };

    if (method === 'GET') {
      const url = new URL(action, window.location.href);
      for (const [key, value] of formData.entries()) url.searchParams.set(key, value);
      const response = await fetch(url.toString(), request);
      const data = await parseDataFetchResponse(form, response);
      if (data) handleFetchResponse(form, data);
      return;
    }

    request.body = formData;

    const response = await fetch(action, request);
    const data = await parseDataFetchResponse(form, response);
    if (data) handleFetchResponse(form, data);
  } catch (error) {
    failDataFetchSubmit(form, 'Request failed. Please try again.', error);
  }
}

function handleFetchResponse(form, data) {
  applyResponse(data, form);
  if (typeof enableForm === 'function' && form?.id) enableForm(form.id);
  if (typeof window.brioAfterFetch === 'function') {
    try {
      window.brioAfterFetch(form, data);
    } catch (e) {
      console.warn('[binding] brioAfterFetch:', e);
    }
  }
  for (const fn of brioAfterFetchListeners) {
    try {
      fn(form, data);
    } catch (e) {
      console.warn('[binding] registerAfterFetch listener:', e);
    }
  }
}

function applyResponse(data, form = null) {
  if (typeof readServerMessages === 'function') {
    readServerMessages(form || document.body, data || {});
  }
  if (data?.state && typeof data.state === 'object') mergeState(BRIO_STATE, data.state);
  if (Array.isArray(data?.patches)) applyPatches(data.patches);
  if (Array.isArray(data?.append)) applyAppend(data.append, form);
  applyBindings(document);
  if (typeof updateDynamicFields === 'function') updateDynamicFields();
}

function setState(partial) {
  mergeState(BRIO_STATE, partial || {});
  applyBindings(document);
  if (typeof updateDynamicFields === 'function') updateDynamicFields();
}

function getState(path = null) {
  if (!path) return BRIO_STATE;
  return getPathValue(path, BRIO_STATE);
}

function refreshBindings(scope = document) {
  applyBindings(scope);
  if (scope === document && typeof updateDynamicFields === 'function') updateDynamicFields();
}

window.BRIO_API = window.BRIO_API || {};
window.BRIO_API.setState = setState;
window.BRIO_API.getState = getState;
window.BRIO_API.refreshBindings = refreshBindings;
window.BRIO_API.applyResponse = applyResponse;
window.BRIO_API.registerAfterFetch = registerAfterFetch;

window.setBrioState = setState;
window.getBrioState = getState;
window.refreshBindings = refreshBindings;
window.brioSubmitFetch = brioSubmitFetch;

document.addEventListener('DOMContentLoaded', () => {
  applyBindings(document);
});

/* Dialogs (native <dialog>)
  -----------------------------------------------------------------------------
  Requires: defer attribute or placement before </body>
  Designed to work alongside actions.js but fully standalone.

  Required HTML structure:
    <dialog id="..."> ... </dialog>

  Brio API remains unchanged:
    openDialog(el, event, "dialog-id")
    closeDialog(el, event, "dialog-id" | null)
    closeAllDialogs()

  Policy layer (on top of native behavior):
    - Escape/backdrop dismiss only when an enabled [data-el=close-button] exists
    - Focus returns to opener when dialog closes
    - Optional reopen stack via data-reopen="false"
----------------------------------------------------------------------------- */

let reopenDialog = null;
const openerStack = [];
let modelessZIndex = 0;

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

function getDialogById(id) {
  const dialog = document.getElementById(id);
  if (!dialog || dialog.tagName !== 'DIALOG') return null;
  return dialog;
}

function getOpenDialogs() {
  return [...document.querySelectorAll('dialog[open]')];
}

function getTopOpenDialog() {
  const open = getOpenDialogs();
  return open.length ? open[open.length - 1] : null;
}

function isClosable(dialog) {
  return !!dialog.querySelector('[data-el=close-button]:not([disabled])');
}

function updateModalPageLock() {
  const hasOpenModal = !!document.querySelector('dialog[open]:not([data-modeless])');
  document.documentElement.toggleAttribute('data-brio-modal-open', hasOpenModal);
}

function setModelessLayer(dialog) {
  if (!dialog?.hasAttribute('data-modeless')) return;
  modelessZIndex += 1;
  dialog.style.zIndex = String(1000 + modelessZIndex);
}

function autoFocus(dialog) {
  const explicit = dialog.querySelector('[data-autofocus]');
  if (explicit) { explicit.focus(); return; }
  if (dialog.hasAttribute('data-autofocus')) { dialog.focus(); return; }

  const focusable = [...dialog.querySelectorAll(FOCUSABLE)]
    .find((el) => el.offsetParent !== null && !el.matches('[data-el=close-button]'));
  if (focusable) focusable.focus();
}

function closeDialogInternal(dialog, internal = false) {
  if (!dialog?.open) return;
  dialog.close();
  updateModalPageLock();

  if (reopenDialog && !internal) {
    const reopenId = reopenDialog.id;
    reopenDialog = null;
    openDialog(null, null, reopenId);
    return;
  }

  if (!internal) openerStack.pop()?.focus();
}

// Called by framework as: openDialog(el, event, 'dialog-id')
function openDialog(el, event, dialogId) {
  const dialog = getDialogById(dialogId);
  if (!dialog) {
    console.warn(`[dialogs] openDialog: no <dialog> found with id "${dialogId}"`);
    return;
  }

  const currentlyOpen = getTopOpenDialog();
  if (el) openerStack.push(el);

  if (currentlyOpen && currentlyOpen !== dialog) {
    if (currentlyOpen.dataset.reopen !== 'false') reopenDialog = currentlyOpen;
    closeDialogInternal(currentlyOpen, true);
  }

  if (!dialog.open) {
    if (dialog.hasAttribute('data-modeless')) dialog.show();
    else dialog.showModal();
  }

  setModelessLayer(dialog);
  updateModalPageLock();
  autoFocus(dialog);
}

// Called by framework as: closeDialog(el, event, 'dialog-id') or closeDialog(el, event, null)
function closeDialog(el, event, dialogId, _internal = false) {
  let dialog = null;

  if (dialogId) dialog = getDialogById(dialogId);
  else {
    dialog = getTopOpenDialog();
    if (!dialog && el) dialog = el.closest('dialog[open]');
  }

  closeDialogInternal(dialog, _internal);
}

// Called by framework as: closeAllDialogs(el, event, null)
function closeAllDialogs() {
  getOpenDialogs().forEach((dialog) => dialog.close());
  updateModalPageLock();
  reopenDialog = null;
  const originalOpener = openerStack[0];
  openerStack.length = 0;
  originalOpener?.focus();
}

// Back-compat action name. With native <dialog> there is no dim layer element.
function clickDimLayer() {
  const dialog = getTopOpenDialog();
  if (dialog && isClosable(dialog)) closeDialogInternal(dialog);
}

function addDialogTitleIds() {
  document.querySelectorAll('dialog[id]').forEach((dialog) => {
    const heading = dialog.querySelector('h2');
    if (heading) {
      if (!heading.id) heading.id = dialog.id + '-title';
    } else if (!dialog.hasAttribute('aria-label') && !dialog.hasAttribute('aria-labelledby')) {
      console.warn(`[dialogs] #${dialog.id} has no accessible name — add aria-label or an <h2> inside the dialog.`);
    }
  });
}

// Escape policy: block native cancel unless closable
document.addEventListener('cancel', (event) => {
  const dialog = event.target;
  if (!(dialog instanceof HTMLDialogElement)) return;
  if (!isClosable(dialog)) event.preventDefault();
}, true);

// Backdrop policy: close only when user clicks outside dialog content and dialog is closable
document.addEventListener('click', (event) => {
  const dialog = event.target;
  if (!(dialog instanceof HTMLDialogElement)) return;
  if (!dialog.open) return;

  const rect = dialog.getBoundingClientRect();
  const isBackdropClick =
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom;

  if (isBackdropClick) {
    event.preventDefault();
    if (isClosable(dialog)) closeDialogInternal(dialog);
  }
}, true);

addDialogTitleIds();
updateModalPageLock();

/* Feedback
  -----------------------------------------------------------------------------
  Requires: defer attribute or placement before </body>
  Designed to work alongside actions.js but fully standalone.

  Usage — HTML:
  ─────────────
  Field-level message (linked to input via data-for="fieldId"):
    <input id="email" type="email">
    <span data-message data-for="email" hidden></span>

  Form-level message (scoped to nearest form or container):
    <form id="booking-form">
      <div data-message hidden></div>
      ...
    </form>

  Non-form action feedback (nearest sibling):
    <button data-click="addToCart">Add to cart</button>
    <span data-message hidden></span>

  Usage — JavaScript:
  ────────────────────
  Client-side:
    showMessage(el, 'You have reached the maximum.', 'info');
    showMessage('email', 'Please enter a valid email address.', 'error');

  Server-side (pass the parsed JSON response body):
    readServerMessages(el, responseData);

  Clear all messages in a container:
    clearMessages(el);

  Server response contract:
  ──────────────────────────
  {
    "success": true|false,
    "messages": [
      { "field": "email", "message": "Please enter a valid email address", "type": "error" },
      { "field": null,    "message": "Something went wrong",               "type": "error" }
    ]
  }
  field: null   → form-level message, shown in the nearest [data-message] without [data-for]
  field: "id"   → field-level message, shown in [data-message][data-for="id"]
  type:         → "error" | "success" | "info" | "warning"

  Form re-enabling:
  ──────────────────
  When success is false, readServerMessages automatically calls enableForm on
  the nearest ancestor form so the user can correct and resubmit. This pairs
  with the automatic disableForm call in actions.js on every submit event.

----------------------------------------------------------------------------- */


// ─── Show a single message ────────────────────────────────────────────────────

// target: a field id (string), a triggering element, or null
function showMessage(target, message, type = 'error') {
  const region = resolveMessageRegion(target);
  if (!region) {
    console.warn('[feedback] No [data-message] region found for target:', target);
    return;
  }

  // Ensure the region has an id so aria-describedby can reference it
  if (!region.id) region.id = 'msg-' + Math.random().toString(36).slice(2, 7);

  region.textContent  = message;
  region.dataset.type = type;
  region.removeAttribute('hidden');

  // Announce errors immediately; other types announce politely
  if (type === 'error') {
    region.setAttribute('role', 'alert');
    region.removeAttribute('aria-live');
  } else {
    region.setAttribute('aria-live', 'polite');
    region.removeAttribute('role');
  }

  // Wire aria-describedby on the associated input if target is a field id
  if (typeof target === 'string') {
    const input = document.getElementById(target);
    if (input) input.setAttribute('aria-describedby', region.id);
  }
}


// ─── Read a full server response ─────────────────────────────────────────────

// el: the triggering element (used to resolve form-level message region)
// data: parsed JSON response body matching the contract above
function readServerMessages(el, data) {
  if (!data.messages || !data.messages.length) return;

  for (const item of data.messages) {
    const target = item.field || el;
    showMessage(target, item.message, item.type || 'error');
  }

  // Re-enable the form when the server reports failure so the user can
  // correct and resubmit. Pairs with the automatic disableForm call in
  // actions.js. enableForm is a no-op if the form was never disabled.
  if (data.success === false && typeof enableForm === 'function') {
    const form = (el instanceof Element) ? el.closest('form') : null;
    if (form?.id) enableForm(form.id);
  }
}


// ─── Clear messages ───────────────────────────────────────────────────────────

// Clears all [data-message] regions inside a container, or the nearest one to el
function clearMessages(el) {
  const container = el?.closest('form, [data-feedback-scope]') || document;

  container.querySelectorAll('[data-message]').forEach(region => {
    // Remove aria-describedby from any input that references this region
    if (region.id) {
      const input = container.querySelector(`[aria-describedby="${region.id}"]`);
      if (input) input.removeAttribute('aria-describedby');
    }
    region.textContent = '';
    region.removeAttribute('data-type');
    region.removeAttribute('role');
    region.removeAttribute('aria-live');
    region.setAttribute('hidden', '');
  });
}


// ─── Resolve message region ───────────────────────────────────────────────────

// Priority:
// 1. target is a string id → find [data-message][data-for="id"]
// 2. target is an element  → find nearest [data-message] sibling
// 3. target is an element  → find nearest ancestor containing [data-message]
function resolveMessageRegion(target) {

  // 1. String id — look for a [data-message][data-for="id"]
  if (typeof target === 'string') {
    return document.querySelector(`[data-message][data-for="${target}"]`) || null;
  }

  // 2. Element — look for a [data-message] sibling
  if (target instanceof Element) {
    const parent  = target.parentElement;
    const sibling = parent?.querySelector('[data-message]');
    if (sibling) return sibling;

    // 3. Walk up to nearest ancestor containing a form-level [data-message]
    const ancestor = target.closest('form, [data-feedback-scope]');
    if (ancestor) return ancestor.querySelector('[data-message]:not([data-for])') || null;
  }

  return null;
}

