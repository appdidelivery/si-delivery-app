import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeWhatsAppReplyRecipient } from '../lib/whatsappReplyRecipient.js';

test('preserves Brazilian Meta wa_id with or without ninth digit, without guessing', () => {
  assert.equal(normalizeWhatsAppReplyRecipient('5551987654321'), '5551987654321');
  assert.equal(normalizeWhatsAppReplyRecipient('555187654321'), '555187654321');
  assert.equal(normalizeWhatsAppReplyRecipient('5511987654321'), '5511987654321');
  assert.equal(normalizeWhatsAppReplyRecipient('551187654321'), '551187654321');
});

test('adds +55 country code only to Brazilian national numbers with DDD', () => {
  assert.equal(normalizeWhatsAppReplyRecipient('51987654321'), '5551987654321');
  assert.equal(normalizeWhatsAppReplyRecipient('(51) 8765-4321'), '555187654321');
  assert.equal(normalizeWhatsAppReplyRecipient('+55 (51) 98765-4321'), '5551987654321');
  assert.equal(normalizeWhatsAppReplyRecipient('55987654321'), '5555987654321'); // DDD 55.
});

test('retains known international identifiers instead of adding Brazil code', () => {
  assert.equal(normalizeWhatsAppReplyRecipient('+1 415 555 2671'), '14155552671');
  assert.equal(normalizeWhatsAppReplyRecipient('14155552671'), '14155552671');
  assert.equal(normalizeWhatsAppReplyRecipient('447700900123'), '447700900123');
});

test('rejects ambiguous, malformed, and unsupported recipients without sending', () => {
  for (const item of ['', 'abc', '55', '0000000000', '005551987654321', '+55 00 98765-4321', '55 51 98765-43210', '55; DROP TABLE', null, undefined, {}, 'whatsapp:5551987654321']) {
    assert.equal(normalizeWhatsAppReplyRecipient(item), null, String(item));
  }
});

test('chat_reply uses validated recipient and has no DDD-based digit removal', () => {
  const code = readFileSync(new URL('../api/index.js', import.meta.url), 'utf8');
  const begin = code.indexOf("if (action === 'chat_reply') {");
  assert.ok(begin >= 0, 'chat_reply handler not found');
  const end = code.indexOf('if (action ===', begin + 1);
  const handler = code.slice(begin, end > begin ? end : begin + 6000);
  assert.match(handler, /normalizeWhatsAppReplyRecipient\(toPhone\)/);
  assert.match(handler, /if \(!cleanPhone\) return res\.status\(400\)/);
  assert.match(handler, /to: cleanPhone/);
  assert.doesNotMatch(handler, /substring\(0, 4\).*substring\(5\)/s);
  assert.doesNotMatch(handler, /triggerFailover\(/);
});
