#!/usr/bin/env node
'use strict'

var assert = require('assert')
var theme = require('../assets/theme.js')

function resolve(settings, prefs) {
  return theme.resolvePalette(settings, prefs)
}

assert.deepStrictEqual(
  theme.normalizeThemeSettings({}),
  { appearance: 'system', lightTheme: 'light', darkTheme: 'dark' }
)
assert.deepStrictEqual(
  theme.normalizeThemeSettings({ theme: 'cream' }),
  { appearance: 'light', lightTheme: 'cream', darkTheme: 'dark' }
)
assert.deepStrictEqual(
  theme.normalizeThemeSettings({ theme: 'black' }),
  { appearance: 'dark', lightTheme: 'light', darkTheme: 'black' }
)
assert.equal(
  theme.normalizeThemeSettings({ theme: 'dark' }).appearance,
  'dark'
)
assert.equal(
  theme.normalizeThemeSettings({ theme: 'light' }).appearance,
  'system'
)
assert.equal(
  theme.normalizeThemeSettings({ appearance: 'light', theme: 'cream' }).appearance,
  'light'
)

assert.equal(resolve({}, { scheme: 'light', contrast: false }), 'light')
assert.equal(resolve({}, { scheme: 'dark', contrast: false }), 'dark')
assert.equal(resolve({}, { scheme: 'light', contrast: true }), 'light')
assert.equal(resolve({}, { scheme: 'dark', contrast: true }), 'black')

assert.equal(
  resolve({ lightTheme: 'cream' }, { scheme: 'light', contrast: false }),
  'cream'
)
assert.equal(
  resolve({ lightTheme: 'cream' }, { scheme: 'light', contrast: true }),
  'light'
)
assert.equal(
  resolve({ darkTheme: 'black' }, { scheme: 'dark', contrast: false }),
  'black'
)

assert.equal(
  resolve({ appearance: 'light', lightTheme: 'cream' }, { scheme: 'dark', contrast: true }),
  'cream'
)
assert.equal(
  resolve({ appearance: 'dark', darkTheme: 'dark' }, { scheme: 'light', contrast: true }),
  'dark'
)
assert.equal(
  resolve({ appearance: 'dark', darkTheme: 'black' }, { scheme: 'light', contrast: false }),
  'black'
)

console.log('theme resolve ok')
