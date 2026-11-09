import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeCsiConsentReconciliation, csiAuditPhoneIdentity } from '../lib/csiConsentReconciliation.js';

const validConsent = phone => ({
  storeId:'csi',phone,optedIn:true,adultConfirmed:true,
  source:'whatsapp_inbound_explicit_keyword',consentVersion:'2026-10-v1',
  sourceMessageId:'wamid.synthetic'
});

test('audit phone comparison preserves exact 10 vs 11 digit identities',()=>{
  assert.deepEqual(csiAuditPhoneIdentity('+55 (51) 98765-4321'),{
    exact:'51987654321',comparison:'51987654321'
  });
  assert.deepEqual(csiAuditPhoneIdentity('555187654321'),{
    exact:'5187654321',comparison:'51987654321'
  });
  for(const value of ['+1 415 555 2671','00123456','not a phone','5500000000000',null])
    assert.equal(csiAuditPhoneIdentity(value),null,String(value));
});

test('only exact orders are attributed; ninth-digit variants are review candidates',()=>{
  const pA='51987654321',pB='51977776666',pC='51966665555',
    pD='51955554444',pE='51944443333',pF='51933332222';
  const result=analyzeCsiConsentReconciliation({
    consents:[pA,pB,pC,pD,pE,pF].map(validConsent),
    orders:[
      {customerPhone:'+55 (51) 98765-4321',status:'completed'},
      {customerPhone:'5177776666',status:'completed'},
      {customerPhone:pE,customer:{phone:'51988880000'},status:'completed'},
      {customer:{phone:pF},status:'completed'}
    ],
    carts:[{customerPhone:pC,status:'abandoned'}],
    blocked:[{phone:pD}],
    partial:{orders:true,carts:false},
    scanned:{orders:25_000,carts:1}
  });
  assert.equal(result.validDistinctConsentPhones,6);
  assert.deepEqual(result.coverage,{
    exactOrderMatch:2,formatOnlyOrderMatch:1,
    cartOnlyExact:1,cartOnlyFormatReview:0,noOrderOrCartInScan:2,
    completedOrderExact:2,completedOrderFormatReview:1,
    optedOutOrBlocked:1
  });
  assert.deepEqual(result.orderPhoneQuality,{
    missingOrInvalid:0,nestedOnly:1,conflictingFields:1,valid:3
  });
  assert.equal(result.partial.orders,true);
  for(const phone of [pA,pB,pC,pD,pE,pF])
    assert.equal(JSON.stringify(result).includes(phone),false,'Audit must not expose recipients');
});

test('cancelled order may be located but does not count as completed',()=>{
  const phone='51987654321';
  const r=analyzeCsiConsentReconciliation({
    orders:[{customerPhone:phone,status:'cancelado'}],consents:[validConsent(phone)]
  });
  assert.equal(r.coverage.exactOrderMatch,1);
  assert.equal(r.coverage.completedOrderExact,0);
  assert.equal(r.canceledOrRefundedOrders,1);
});

test('reconciliation route requires store access and contains no outbound messaging',()=>{
  const api=readFileSync(new URL('../api/index.js',import.meta.url),'utf8');
  const begin=api.indexOf("if (path === '/api/csi-consent-reconciliation')");
  const end=api.indexOf("if (path === '/api/marketing-automation-status')",begin);
  assert.ok(begin>0 && end>begin);
  const handler=api.slice(begin,end);
  assert.match(handler,/await assertStoreAccess\(req\.user, 'csi'\)/);
  assert.match(handler,/analyzeCsiConsentReconciliation\(/);
  assert.doesNotMatch(handler,/fetch\(|reserveMarketingAttempt\(|sendJourney|sendMessageToMeta\(|method:\s*'POST'/);
  assert.match(handler,/scanCsiReconciliationCollection/);
});
