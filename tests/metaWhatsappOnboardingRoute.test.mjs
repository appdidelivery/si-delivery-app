import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const connector = readFileSync(new URL('../src/components/WhatsAppConnectionChoice.jsx', import.meta.url), 'utf8');
const standalone = readFileSync(new URL('../src/pages/WhatsAppMetaConnect.jsx', import.meta.url), 'utf8');
const backend = readFileSync(new URL('../server/metaWhatsAppEmbeddedSignup.js', import.meta.url), 'utf8');

test('Meta signup has its own Firebase-protected route', () => {
  assert.match(app, /path="\/admin\/whatsapp-meta"/);
  assert.match(app, /<ProtectedRoute user=\{currentUser\}>\s*<WhatsAppMetaConnect\s*\/>/);
});

test('legacy integrations page only navigates to isolated Meta signup', () => {
  assert.match(connector, /if \(!standalone\) \{ window\.location\.assign\('\/admin\/whatsapp-meta'\); return; \}/);
  assert.match(standalone, /<WhatsAppConnectionChoice[\s\S]*\bstandalone/);
});

test('Embedded Signup selects v4 using configuration, not unsupported version extras', () => {
  assert.match(connector, /config_id: config\.configId/);
  assert.match(connector, /auth_type: 'rerequest'/);
  assert.match(connector, /featureType: 'whatsapp_business_app_onboarding'/);
  assert.doesNotMatch(connector, /\{\s*version: 'v4'/);
});

test('new onboarding refuses to overwrite a native WhatsApp API connection', () => {
  assert.match(backend, /if \(active\) return res\.status\(409\)/);
  assert.match(backend, /const active = Boolean\(whatsapp\.phoneNumberId && whatsapp\.apiToken\)/);
});

test('a missing Meta phone session cannot silently activate a number', () => {
  assert.match(connector, /!session\.current\?\.wabaId \|\| !session\.current\?\.phoneNumberId/);
});
