#!/usr/bin/env node
'use strict'

var assert = require('assert')
var theme = require('../assets/theme.js')

function resolved(settings, prefs) {
  return theme.resolveTheme(settings, prefs)
}

assert.deepStrictEqual(
  theme.normalizeThemeSettings({}),
  { appearance: 'system', paper: 'neutral' }
)
assert.deepStrictEqual(
  theme.normalizeThemeSettings({ theme: 'cream' }),
  { appearance: 'system', paper: 'warm' }
)
assert.deepStrictEqual(
  theme.normalizeThemeSettings({ theme: 'black' }),
  { appearance: 'dark', paper: 'neutral' }
)
assert.deepStrictEqual(
  theme.normalizeThemeSettings({ appearance: 'light', lightTheme: 'cream' }),
  { appearance: 'light', paper: 'warm' }
)
assert.equal(
  theme.normalizeThemeSettings({ theme: 'light' }).appearance,
  'system'
)
assert.equal(
  theme.normalizeThemeSettings({ appearance: 'dark', theme: 'cream' }).paper,
  'warm'
)

assert.deepStrictEqual(
  resolved({}, { scheme: 'light', contrast: false }),
  { palette: 'light', warm: false, scheme: 'light', contrast: false }
)
assert.deepStrictEqual(
  resolved({}, { scheme: 'dark', contrast: false }),
  { palette: 'dark', warm: false, scheme: 'dark', contrast: false }
)
assert.deepStrictEqual(
  resolved({}, { scheme: 'light', contrast: true }),
  { palette: 'light', warm: false, scheme: 'light', contrast: true }
)
assert.deepStrictEqual(
  resolved({}, { scheme: 'dark', contrast: true }),
  { palette: 'black', warm: false, scheme: 'dark', contrast: true }
)

assert.deepStrictEqual(
  resolved({ paper: 'warm' }, { scheme: 'light', contrast: false }),
  { palette: 'light', warm: true, scheme: 'light', contrast: false }
)
assert.deepStrictEqual(
  resolved({ paper: 'warm' }, { scheme: 'light', contrast: true }),
  { palette: 'light', warm: true, scheme: 'light', contrast: true }
)
assert.deepStrictEqual(
  resolved({ paper: 'warm' }, { scheme: 'dark', contrast: false }),
  { palette: 'dark', warm: true, scheme: 'dark', contrast: false }
)
assert.deepStrictEqual(
  resolved({ paper: 'warm' }, { scheme: 'dark', contrast: true }),
  { palette: 'black', warm: true, scheme: 'dark', contrast: true }
)

assert.deepStrictEqual(
  resolved({ appearance: 'light', paper: 'warm' }, { scheme: 'dark', contrast: true }),
  { palette: 'light', warm: true, scheme: 'light', contrast: true }
)
assert.deepStrictEqual(
  resolved({ appearance: 'dark' }, { scheme: 'light', contrast: true }),
  { palette: 'black', warm: false, scheme: 'dark', contrast: true }
)
assert.deepStrictEqual(
  resolved({ appearance: 'dark', paper: 'warm' }, { scheme: 'light', contrast: false }),
  { palette: 'dark', warm: true, scheme: 'dark', contrast: false }
)

assert.equal(theme.resolvePalette({ paper: 'warm' }, { scheme: 'light', contrast: false }), 'cream')
assert.equal(theme.resolvePalette({ paper: 'warm' }, { scheme: 'dark', contrast: false }), 'dark')
assert.equal(theme.metaKey({ palette: 'light', warm: true }), 'cream')
assert.equal(theme.metaKey({ palette: 'dark', warm: true }), 'dark-warm')
assert.equal(theme.metaKey({ palette: 'black', warm: true }), 'black-warm')

console.log('theme resolve ok')
