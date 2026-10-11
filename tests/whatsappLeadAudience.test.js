import test from 'node:test';
import assert from 'node:assert/strict';
import {buildUnifiedWhatsAppAudience,latestOrderPerPhone,addInboundLead} from '../lib/whatsappLeadAudience.js';

const now=Date.parse('2026-10-11T20:20:00Z');
test('includes WhatsApp-only leads in contact count without treating chat as marketing opt-in',()=>{
  const orders=new Map(),incoming=new Map();
  latestOrderPerPhone(orders,{customerPhone:'51999999999',createdAt:'x',whatsappMarketingOptIn:true,alcoholMarketingAgeConfirmed:true},now-1e8);
  addInboundLead(incoming,{direction:'inbound',from:'5551988888888',text:'Oi, vocês estão abertos?'},now-300000);
  addInboundLead(incoming,{direction:'outbound',from:'5551977777777',text:'Oferta'},now-300000);
  const {eligible,breakdown}=buildUnifiedWhatsAppAudience(orders,incoming,new Set(),'csi',now);
  assert.deepEqual(eligible,['51999999999']);
  assert.equal(breakdown.uniqueContacts,2);
  assert.equal(breakdown.onlyInboundLeads,1);
  assert.equal(breakdown.activeService24h,1);
  assert.equal(breakdown.activeServiceWithoutMarketingConsent,1);
  assert.equal(breakdown.missingMarketingConsent,1);
});
test('requires opt-in and adult confirmation in source, never infers age from ordinary messages',()=>{
  const orders=new Map(),incoming=new Map();
  latestOrderPerPhone(orders,{customerPhone:'51999999999',whatsappMarketingOptIn:true},now-1000);
  addInboundLead(incoming,{direction:'inbound',from:'5551999999999'},now-1000);
  const r=buildUnifiedWhatsAppAudience(orders,incoming,new Set(),'csi',now);
  assert.equal(r.eligible.length,0);
  assert.equal(r.breakdown.missingAdultRecord,1);
  assert.equal(r.breakdown.activeService24h,1);
});
test('only latest order decides consent; blocked and opt-out stay excluded',()=>{
  const orders=new Map(),incoming=new Map();
  latestOrderPerPhone(orders,{customerPhone:'51999999999',whatsappMarketingOptIn:true,alcoholMarketingAgeConfirmed:true},10);
  latestOrderPerPhone(orders,{customerPhone:'51999999999',whatsappMarketingOptIn:false,alcoholMarketingAgeConfirmed:true},20);
  latestOrderPerPhone(orders,{customerPhone:'51988888888',whatsappMarketingOptIn:true,alcoholMarketingAgeConfirmed:true},30);
  const r=buildUnifiedWhatsAppAudience(orders,incoming,new Set(['51988888888']),'csi',now);
  assert.equal(r.breakdown.uniqueContacts,2);
  assert.equal(r.breakdown.excludedBlockedOrOptOut,1);
  assert.equal(r.breakdown.missingMarketingConsent,1);
  assert.equal(r.breakdown.eligibleMarketing,0);
});

test('Explicit affirmative WhatsApp consent permits a WhatsApp-only lead with adult declaration',()=>{
  const order=new Map(),inbound=new Map(),verified=new Map();
  addInboundLead(inbound,{direction:'inbound',from:'5551999999999'},now-30000);
  verified.set('51999999999',{optedIn:true,adultConfirmed:true,source:'whatsapp_inbound_explicit_keyword',consentVersion:'2026-10-v1',sourceMessageId:'wamid.csi'});
  const result=buildUnifiedWhatsAppAudience(order,inbound,new Set(),'csi',now,verified);
  assert.equal(result.eligible.length,1);
  assert.equal(result.breakdown.onlyInboundLeads,1);
  assert.equal(result.breakdown.explicitWhatsAppConsents,1);
  const blocked=buildUnifiedWhatsAppAudience(order,inbound,new Set(['51999999999']),'csi',now,verified);
  assert.equal(blocked.eligible.length,0);
});
