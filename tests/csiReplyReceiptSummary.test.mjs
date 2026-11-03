import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {csiTestPhoneVariants, summarizeCsiReplyReceipts} from '../lib/csiReplyReceiptSummary.js';

test('requires full Brazilian DDD number and never guesses the ninth digit', () => {
  assert.deepEqual(csiTestPhoneVariants('48988722970'), ['48988722970', '5548988722970']);
  assert.deepEqual(csiTestPhoneVariants('+55 (48) 98872-2970'), ['48988722970', '5548988722970']);
  assert.deepEqual(csiTestPhoneVariants('4888722970'), ['4888722970', '554888722970']);
  assert.equal(csiTestPhoneVariants('2970'), null);
  assert.equal(csiTestPhoneVariants('0011999999999'), null);
  assert.equal(csiTestPhoneVariants('+1 415 555 2671'), null);
});
test('only CSI manual Cloud API replies count; a Meta acceptance is not delivery', () => {
  const now = Date.parse('2026-11-03T18:00:00Z');
  const base = {storeId:'csi', direction:'outbound', source:'chat_reply',
    to:'5548988722970', sentAt:new Date(now-60000)};
  const items=[
    {...base, metaMessageId:'wamid.1',deliveryStatus:'accepted'},
    {...base, metaMessageId:'wamid.2',deliveryStatus:'delivered'},
    {...base, metaMessageId:'wamid.3',deliveryStatus:'read'},
    {...base, metaMessageId:'wamid.4',deliveryStatus:'failed'},
    {...base, metaMessageId:'wamid.4',deliveryStatus:'failed'},
    {...base, metaMessageId:'wamid.5',deliveryStatus:'sent'},
    {...base, metaMessageId:'wamid.6',deliveryStatus:'accepted',storeId:'other'},
    {...base, metaMessageId:'wamid.7',deliveryStatus:'delivered',source:'broadcast'},
    {...base, metaMessageId:'wamid.8',deliveryStatus:'delivered',sentAt:new Date(now-20*86400000)}
  ];
  const s=summarizeCsiReplyReceipts(items,{nowMs:now});
  assert.equal(s.total,5);
  assert.equal(s.apiAccepted,5);
  assert.equal(s.delivered,1);
  assert.equal(s.read,1);
  assert.equal(s.failed,1);
  assert.equal(s.awaitingDelivery,2);
  assert.ok(!JSON.stringify(s).includes('48988722970'));
  assert.ok(!JSON.stringify(s).includes('wamid.'));
});
test('receipt lookup is login and tenant protected, GET-only and does not send messages', () => {
  const api=readFileSync(new URL('../api/index.js', import.meta.url),'utf8');
  const start=api.indexOf("if (path === '/api/marketing-automation-status')");
  const end=api.indexOf("if (path === '/api/whatsapp-embedded-signup')",start);
  const handler=api.slice(start,end);
  assert.ok(start>0 && end>start);
  assert.match(handler,/assertStoreAccess\(req\.user, statusStoreId\)/);
  assert.match(handler,/csiTestPhoneVariants/);
  assert.match(handler,/summarizeCsiReplyReceipts/);
  assert.match(handler,/\.where\('to', 'in', candidates\)/);
  assert.doesNotMatch(handler,/method:\s*'POST'|reserveMarketingAttempt\(|sendJourneyTemplate\(/);
  const ui=readFileSync(new URL('../src/pages/MarketingAutomationStatus.jsx',import.meta.url),'utf8');
  assert.match(ui,/Conferir entrega de uma mensagem de teste/);
  assert.match(ui,/status\.testReceipt/);
});
