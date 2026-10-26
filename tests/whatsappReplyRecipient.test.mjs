import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeWhatsAppReplyRecipient, resolveWhatsAppChatRecipient, matchesWhatsAppChatSearch } from '../lib/whatsappReplyRecipient.js';

test('preserves Brazilian Meta wa_id with or without ninth digit, without guessing', () => {
  assert.equal(normalizeWhatsAppReplyRecipient('5551987654321'), '5551987654321');
  assert.equal(normalizeWhatsAppReplyRecipient('555187654321'), '555187654321');
  assert.equal(normalizeWhatsAppReplyRecipient('5511987654321'), '5511987654321');
  assert.equal(normalizeWhatsAppReplyRecipient('551187654321'), '551187654321');
});

test('adds +55 country code only to Brazilian national numbers with DDD', () => {
  assert.equal(normalizeWhatsAppReplyRecipient('51987654321'), '5551987654321');
  assert.equal(normalizeWhatsAppReplyRecipient('11987654321'), '5511987654321');
  assert.equal(normalizeWhatsAppReplyRecipient('12987654321'), '5512987654321');
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

test('chat search matches complete +55 number and local DDD, as well as names', () => {
  assert.equal(matchesWhatsAppChatSearch('5548988722970', '48988722970', 'Cliente'), true);
  assert.equal(matchesWhatsAppChatSearch('+55 (48) 98872-2970', '48988722970', 'Cliente'), true);
  assert.equal(matchesWhatsAppChatSearch('48988722970', '48988722970', 'Cliente'), true);
  assert.equal(matchesWhatsAppChatSearch('98872', '48988722970', 'Cliente'), true);
  assert.equal(matchesWhatsAppChatSearch('Glenda', '48988722970', 'Glenda'), true);
  assert.equal(matchesWhatsAppChatSearch('5511999999999', '48988722970', 'Cliente'), false);
});

test('reply takes original incoming Meta wa_id, not reconstructed chat display key', () => {
  const messages = [
    { direction: 'inbound', from: '55488722970', receivedAt: { seconds: 1750000000 } },
    { direction: 'outbound', to: '554898722970', receivedAt: { seconds: 1750000200 } },
    { direction: 'inbound', from: '5548988722970', receivedAt: { seconds: 1750000500 } },
  ];
  assert.equal(resolveWhatsAppChatRecipient(messages), '5548988722970');
  assert.equal(resolveWhatsAppChatRecipient([messages[0]]), '55488722970');
  assert.equal(resolveWhatsAppChatRecipient([{ direction: 'outbound', to: '5548988722970' }]), null);
  assert.equal(resolveWhatsAppChatRecipient([]), null);
});

test('visual chat only sends to original inbound wa_id, never a synthetic 55 + display key', () => {
  const code = readFileSync(new URL('../src/components/AdminChat.jsx', import.meta.url), 'utf8');
  assert.match(code, /matchesWhatsAppChatSearch\(chatSearchTerm, chat\.phone, getDisplayName\(chat\.phone\)\)/);
  const media = code.slice(code.indexOf('const sendMediaMessage = async'), code.indexOf('const handleSendReply = async'));
  const text = code.slice(code.indexOf('const handleSendReply = async'), code.indexOf('const handleSendReply = async') + 2200);
  assert.match(media, /resolveWhatsAppChatRecipient\(chats\[activeChat\]\?\.msgs\)/);
  assert.match(text, /resolveWhatsAppChatRecipient\(chats\[activeChat\]\?\.msgs\)/);
  assert.doesNotMatch(media, /const safePhone = `55\$\{cleanActiveChat\}`/);
  assert.doesNotMatch(text, /const safePhone = `55\$\{cleanActiveChat\}`/);
});
