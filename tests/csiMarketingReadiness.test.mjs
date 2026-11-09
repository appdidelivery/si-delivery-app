import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hasAuthorizedCsiMarketingConsent } from '../lib/csiMarketingEligibility.js';
import { analyzeCsiMarketingReadiness } from '../lib/csiMarketingReadiness.js';

const now = Date.parse('2026-10-22T14:00:00Z');
const phone = '51999998888';
const consent = {storeId:'csi',phone,optedIn:true,adultConfirmed:true,
  source:'whatsapp_inbound_explicit_keyword',consentVersion:'2026-10-v1',sourceMessageId:'wamid.test1'};
const minutesAgo = m => new Date(now - m * 60000);

test('verified WhatsApp consent is accepted without checkout opt-in, but opt-out overrides it', () => {
  assert.equal(hasAuthorizedCsiMarketingConsent({}, consent),true);
  assert.equal(hasAuthorizedCsiMarketingConsent({whatsappMarketingOptOut:true},consent),false);
  assert.equal(hasAuthorizedCsiMarketingConsent({}, {...consent, adultConfirmed:false}),false);
  assert.equal(hasAuthorizedCsiMarketingConsent({}, null),false);
  assert.equal(hasAuthorizedCsiMarketingConsent({whatsappMarketingOptIn:true,alcoholMarketingAgeConfirmed:true}),true);
});

test('diagnose eligible abandoned cart using verified WhatsApp consent', () => {
  const carts=[
    {status:'abandoned',customerPhone:phone,lastUpdated:minutesAgo(40)},
    {status:'abandoned',customerPhone:'51888887777',lastUpdated:minutesAgo(40)},
    {status:'abandoned',customerPhone:'51777776666',lastUpdated:minutesAgo(10)}
  ];
  const r=analyzeCsiMarketingReadiness({carts,consents:[consent],nowMs:now});
  assert.equal(r.abandoned.eligibleNow,1);
  assert.equal(r.abandoned.missingConsentOrAdult,1);
  assert.equal(r.abandoned.notDue,1);
  assert.equal(r.validWhatsAppConsents,1);
  assert.ok(!JSON.stringify(r).includes(phone));
});

test('post-sale and second-purchase identify eligible consented customer', () => {
  const orders=[{status:'completed',customerPhone:phone,createdAt:minutesAgo(15*24*60),
    completedAt:minutesAgo(45)}];
  const r=analyzeCsiMarketingReadiness({orders,consents:[consent],nowMs:now});
  assert.equal(r.postSale.eligibleNow,1);
  assert.equal(r.secondPurchase.eligibleNow,0); // pós-venda recente não é segunda compra elegível
  assert.equal(r.retention.examined,0);
});

test('second-purchase campaign waits at least seven days after the only completed order', () => {
  const orders=[{status:'completed',customerPhone:phone,createdAt:minutesAgo(15*24*60),
    completedAt:minutesAgo(15*24*60)}];
  const r=analyzeCsiMarketingReadiness({orders,consents:[consent],nowMs:now});
  assert.equal(r.secondPurchase.eligibleNow,1);
  assert.equal(r.postSale.eligibleNow,0);
});

test('retention excludes opt-outs and observes 7 day cooldown', () => {
  const orders=[{status:'completed',customerPhone:phone,createdAt:minutesAgo(95*24*60)}];
  const good=analyzeCsiMarketingReadiness({orders,consents:[consent],nowMs:now});
  assert.equal(good.retention.eligibleNow,1);
  const blocked=analyzeCsiMarketingReadiness({orders,consents:[consent],
    optouts:[{phone}],nowMs:now});
  assert.equal(blocked.retention.eligibleNow,0);
  assert.equal(blocked.retention.blocked,1);
});

test('deep audit remains behind authenticated GET and no message sends', () => {
  const source = readFileSync(new URL('../api/index.js', import.meta.url),'utf8');
  const start = source.indexOf("if (path === '/api/marketing-automation-status')");
  const end = source.indexOf("if (path === '/api/whatsapp-embedded-signup')",start);
  const slice = source.slice(start,end);
  assert.match(slice,/await assertStoreAccess\(req\.user, statusStoreId\)/);
  assert.match(slice,/analyzeCsiMarketingReadiness/);
  assert.match(slice,/method:\s*'GET'|const response = await fetch\(url/);
  assert.doesNotMatch(slice,/method:\s*'POST'|sendMessageToMeta\(|reserveMarketingAttempt\(/);
});

test('anonymous carts are distinguished from invalid or incomplete phone data',()=>{
  const carts=[
    {status:'abandoned',customerPhone:'',lastUpdated:minutesAgo(50)},
    {status:'abandoned',customerPhone:'48',lastUpdated:minutesAgo(50)},
    {status:'abandoned',customerPhone:phone,lastUpdated:minutesAgo(50)}
  ];
  const r=analyzeCsiMarketingReadiness({carts,consents:[consent],nowMs:now});
  assert.equal(r.abandoned.missingPhone,2);
  assert.equal(r.abandoned.unidentifiedPhone,1);
  assert.equal(r.abandoned.invalidPhone,1);
  assert.equal(r.abandoned.eligibleNow,1);
});

test('diagnostic separates 18+ WhatsApp consents into disjoint order cohorts without exposing phones', () => {
  const p0='51991110000', p1='51992220000', p2='51993330000', p3='51994440000';
  const valid = p => ({...consent, phone:p, sourceMessageId:'wamid.'+p});
  const orders = [
    {status:'completed', customerPhone:p1, createdAt:minutesAgo(10*24*60)},
    {status:'completed', customerPhone:p2, createdAt:minutesAgo(45*24*60)},
    {status:'completed', customerPhone:p3, createdAt:minutesAgo(80*24*60), marketingOptOut:true}
  ];
  const r=analyzeCsiMarketingReadiness({
    orders, consents:[valid(p0),valid(p1),valid(p2),valid(p3)], nowMs:now
  });
  assert.deepEqual(r.consentCoverage,{
    withoutOrderInSample:1, recentOrderUnder30Days:1,
    inactiveOrder30PlusDays:1, blockedOrOptedOut:1
  });
  assert.equal(Object.values(r.consentCoverage).reduce((a,b)=>a+b,0),r.validWhatsAppConsents);
  for (const p of [p0,p1,p2,p3]) assert.equal(JSON.stringify(r).includes(p),false);
});
