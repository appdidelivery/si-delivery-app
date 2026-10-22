import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarizeCsiConsentReceipts} from '../lib/csiConsentReceiptSummary.js';
const now=Date.parse('2026-10-22T20:00:00Z');
const date=new Date(now-3600000);
const mk=(id,deliveryStatus='sent')=>({
  storeId:'csi',source:'admin_24h_consent_invite',
  metaMessageId:id,deliveryStatus,sentAt:date,to:'555199998888'
});
test('11 accepted messages are not assumed delivered',()=>{
  const items=Array.from({length:11},(_,i)=>mk('wamid.'+i));
  items[0].deliveryStatus='delivered';
  items[1].deliveryStatus='read';
  items[2].deliveryStatus='failed';
  const result=summarizeCsiConsentReceipts(items,{nowMs:now});
  assert.equal(result.accepted,11);
  assert.equal(result.delivered,1);
  assert.equal(result.read,1);
  assert.equal(result.failed,1);
  assert.equal(result.pendingDelivery,8);
  assert.ok(!JSON.stringify(result).includes('555199998888'));
  assert.ok(!JSON.stringify(result).includes('wamid.'));
});
test('exclude other stores, unrelated outbound sends, stale messages and duplicate wamid',()=>{
  const current=mk('wamid.123','delivered');
  const other={...mk('wamid.234'),storeId:'other'};
  const old={...mk('wamid.345'),sentAt:new Date(now-7*86400000)};
  const unrelated={...mk('wamid.456'),source:'journey_automation'};
  const result=summarizeCsiConsentReceipts([current,current,other,old,unrelated],{nowMs:now});
  assert.equal(result.accepted,1);
  assert.equal(result.delivered,1);
});
test('aggregate diagnostic is authenticated and never sends invitations',()=>{
  const s=readFileSync(new URL('../api/index.js',import.meta.url),'utf8');
  const begin=s.indexOf("if (path === '/api/marketing-automation-status')");
  const end=s.indexOf("if (path === '/api/whatsapp-embedded-signup')",begin);
  assert.ok(begin>0 && end>begin);
  const handler=s.slice(begin,end);
  assert.match(handler,/req\.method !== 'GET'/);
  assert.match(handler,/assertStoreAccess\(req\.user, statusStoreId\)/);
  assert.match(handler,/summarizeCsiConsentReceipts/);
  assert.doesNotMatch(handler,/method:\s*'POST'|reserveMarketingAttempt\(/);
  const ui=readFileSync(new URL('../src/pages/MarketingAutomationStatus.jsx',import.meta.url),'utf8');
  assert.match(ui,/Entrega dos convites \(últimas 48h\)/);
  assert.match(ui,/status\.receiptAudit\.delivered/);
});
