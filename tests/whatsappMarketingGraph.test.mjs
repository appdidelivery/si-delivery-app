import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WHATSAPP_MARKETING_GRAPH_VERSION, marketingMessagesEndpoint } from '../lib/whatsappMarketingGraph.js';

test('Cloud API MARKETING uses a supported Graph version', () => {
  assert.equal(WHATSAPP_MARKETING_GRAPH_VERSION, 'v25.0');
  assert.equal(marketingMessagesEndpoint('123456789012345'),
    'https://graph.facebook.com/v25.0/123456789012345/messages');
});

test('reject invalid phone IDs before constructing requests', () => {
  for (const value of ['', 'abc123', '123', '12345678/foo', null]) {
    assert.throws(() => marketingMessagesEndpoint(value), /Phone Number ID/);
  }
});

test('queued cart and post-sale marketing avoid sunset Graph v19', () => {
  const script = readFileSync(new URL('../server/journeyQueue.js', import.meta.url), 'utf8');
  assert.match(script, /marketingMessagesEndpoint\(waConfig\.phoneNumberId\)/);
  assert.doesNotMatch(script, /graph\.facebook\.com\/v19\.0/);
  assert.match(script, /journeyAbandonedSent === true/);
  assert.match(script, /journeyPostSaleSent === true/);
  assert.match(script, /canReceiveJourneyMarketing\(phone, cart\)/);
});

test('30/60/90 lifecycle and sports campaigns use supported Graph API', () => {
  const lifecycle = readFileSync(new URL('../server/lifecycleDispatch.js', import.meta.url), 'utf8');
  const football = readFileSync(new URL('../server/footballAlerts.js', import.meta.url), 'utf8');
  assert.match(lifecycle, /marketingMessagesEndpoint\(wa\.phoneNumberId\)/);
  assert.match(football, /marketingMessagesEndpoint\(wa\.phoneNumberId\)/);
  assert.doesNotMatch(lifecycle + football, /graph\.facebook\.com\/v19\.0/);
  assert.match(lifecycle, /cfg\.enabled === false/);
  assert.match(lifecycle, /reserveMarketingAttempt/);
});

test('legacy native WhatsApp chat remains on its existing route', () => {
  const source = readFileSync(new URL('../api/index.js', import.meta.url), 'utf8');
  assert.match(source, /\/api\/whatsapp-webhook/);
  assert.match(source, /\/api\/whatsapp-send/);
  assert.match(source, /marketingMessagesEndpoint\(journeyWa\.phoneNumberId\)/);
  assert.match(source, /const response = await fetch\(marketingMessagesEndpoint\(phoneNumberId\),/);
  assert.match(source, /const GRAPH_API_URL = `https:\/\/graph\.facebook\.com\/v19\.0\/\$\{phoneNumberId\}\/messages`/);
});

test('the existing production cron schedules are unchanged', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const paths = config.crons.map(c => c.path);
  for (const name of [
    '/api/cron-automations',
    '/api/whatsapp-retention-wed','/api/whatsapp-retention-fri',
    '/api/whatsapp-retention-sat','/api/whatsapp-retention-sun'
  ]) assert.ok(paths.includes(name), name);
});
