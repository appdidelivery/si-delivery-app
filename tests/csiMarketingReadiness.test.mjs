import test from 'node:test';
import assert from 'node:assert/strict';
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
  assert.equal(r.secondPurchase.eligibleNow,1);
  assert.equal(r.retention.examined,0);
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
  const source = (await import('node:fs')).readFileSync(new URL('../api/index.js', import.meta.url),'utf8');
  const start = source.indexOf("if (path === '/api/marketing-automation-status')");
  const end = source.indexOf("if (path === '/api/whatsapp-embedded-signup')",start);
  const slice = source.slice(start,end);
  assert.match(slice,/await assertStoreAccess\(req\.user, statusStoreId\)/);
  assert.match(slice,/analyzeCsiMarketingReadiness/);
  assert.match(slice,/method:\s*'GET'|const response = await fetch\(url/);
  assert.doesNotMatch(slice,/method:\s*'POST'|sendMessageToMeta\(|reserveMarketingAttempt\(/);
});
