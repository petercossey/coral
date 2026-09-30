import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { beforeEach, test } from 'node:test';
import { resetBrowser, window } from './browser.js';
import { getB2BConfig } from '../../assets/js/b2b/config.js';

const root = new URL('../../', import.meta.url);
const { settings } = JSON.parse(await readFile(new URL('config.json', root), 'utf8'));
const baseLayout = await readFile(new URL('templates/layout/base.html', root), 'utf8');

beforeEach(() => {
  resetBrowser();
});

test('the starter theme ships with B2B disabled', () => {
  assert.equal(settings.b2b_enabled, false);
});

test('SDK defaults match the shipped theme settings', () => {
  window.Coral.b2b = {};

  const config = getB2BConfig();

  assert.equal(config.enabled, settings.b2b_enabled);
  assert.equal(config.apiBaseUrl, settings.b2b_api_base_url);
  assert.equal(config.appClientId, settings.b2b_client_id);
});

test('the base layout publishes each B2B theme setting to window.Coral.b2b', () => {
  assert.match(baseLayout, /enabled: \{\{#if theme_settings\.b2b_enabled\}\}true\{\{else\}\}false\{\{\/if\}\}/);
  assert.match(baseLayout, /apiBaseUrl: '\{\{\{theme_settings\.b2b_api_base_url\}\}\}'/);
  assert.match(baseLayout, /appClientId: '\{\{\{theme_settings\.b2b_client_id\}\}\}'/);
});
