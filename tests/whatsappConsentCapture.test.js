import test from 'node:test';
import assert from 'node:assert/strict';
import {isExplicitCsiOptIn,isExplicitCsiOptOut,hasValidCsiMarketingRecord,shouldOfferCsiOptIn,storedCsiConsentId} from '../lib/whatsappConsentCapture.js';

test('Only intentional affirmative reply stating 18+ is consent',()=>{
  for(const x of ['QUERO OFERTAS 18','quero ofertas tenho 18 anos',' QUERO   OFERTAS 18 '])
    assert.equal(isExplicitCsiOptIn(x),true);
  for(const x of ['oi','sim','quero receber','tenho 18','quero ofertas','quanto custa','QUERO OFERTAS 17'])
    assert.equal(isExplicitCsiOptIn(x),false);
});
test('Existing PARAR command takes priority and consent records need source evidence',()=>{
  assert.equal(isExplicitCsiOptOut('PÁRAR'),true);
  assert.equal(isExplicitCsiOptOut('não quero receber ofertas'),true);
  const base={optedIn:true,adultConfirmed:true,source:'whatsapp_inbound_explicit_keyword',consentVersion:'2026-10-v1',sourceMessageId:'wamid.1'};
  assert.equal(hasValidCsiMarketingRecord(base),true);
  assert.equal(hasValidCsiMarketingRecord({...base,adultConfirmed:false}),false);
  assert.equal(hasValidCsiMarketingRecord({...base,sourceMessageId:null}),false);
});
test('Prompts only after CSI inbound service interaction and no marketing optout',()=>{
  const base={storeId:'csi',hasApiCredentials:true,optedOut:false,alreadyOptedIn:false,lastPromptAtMs:0,nowMs:100*86400000,hasText:true,blocked:false};
  assert.equal(shouldOfferCsiOptIn(base),true);
  assert.equal(shouldOfferCsiOptIn({...base,storeId:'other'}),false);
  assert.equal(shouldOfferCsiOptIn({...base,optedOut:true}),false);
  assert.equal(shouldOfferCsiOptIn({...base,lastPromptAtMs:99*86400000}),false);
  assert.equal(shouldOfferCsiOptIn({...base,blocked:true}),false);
  assert.equal(storedCsiConsentId('csi','+55 (51) 99999-9999'),'csi_51999999999');
});
