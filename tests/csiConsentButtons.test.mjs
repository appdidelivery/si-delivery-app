import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCsiConsentInvite, CSI_CONSENT_BUTTON_YES, CSI_CONSENT_BUTTON_NO } from '../lib/csiMarketingConsentInvite.js';
import { isExplicitCsiOptIn, isExplicitCsiOptOut } from '../lib/whatsappConsentCapture.js';

test('consent invitation contains clear affirmative and negative buttons', () => {
  const item = buildCsiConsentInvite('5551999998888');
  assert.equal(item.type,'interactive');
  assert.equal(item.interactive.type,'button');
  assert.equal(item.to,'5551999998888');
  assert.equal(item.interactive.action.buttons.length,2);
  assert.deepEqual(item.interactive.action.buttons.map(b=>b.reply.id),
    [CSI_CONSENT_BUTTON_YES,CSI_CONSENT_BUTTON_NO]);
  assert.match(item.interactive.body.text,/Conveniência Santa Isabel/);
  assert.match(item.interactive.body.text,/18 anos/);
  assert.match(item.interactive.body.text,/PARAR/);
  assert.ok(item.interactive.action.buttons.every(b=>b.reply.title.length<=20));
});
test('invalid and missing phone IDs cannot receive invitations',()=>{
  for(const id of ['',null,'abc','123','5511','+44 7733 123456']) {
    assert.throws(()=>buildCsiConsentInvite(id),/Telefone inválido/);
  }
});
test('clicking yes registers opt-in and 18+, no opts out',()=>{
  assert.equal(CSI_CONSENT_BUTTON_YES,'csi_marketing_yes_18');
  assert.equal(CSI_CONSENT_BUTTON_NO,'csi_marketing_no');
  assert.equal(isExplicitCsiOptIn('QUERO OFERTAS 18'),true);
  assert.equal(isExplicitCsiOptOut('NAO QUERO RECEBER OFERTAS'),true);
});
test('auto opt-in prompt and manual fallback both use buttons and supported Graph API',()=>{
  const code=readFileSync(new URL('../api/index.js',import.meta.url),'utf8');
  assert.match(code,/body:JSON\.stringify\(buildCsiConsentInvite\(message\.from\)\)/);
  assert.match(code,/body:JSON\.stringify\(buildCsiConsentInvite\('55'\+phone\)\)/);
  assert.match(code,/const promptResponse=await fetch\(marketingMessagesEndpoint\(phoneNumberId\)/);
  assert.match(code,/const response=await fetch\(marketingMessagesEndpoint\(phoneNumberId\)/);
  assert.doesNotMatch(code,/type:'text',\s*text:\{body:CSI_MARKETING_PROMPT\}/);
  assert.match(code,/if\(optout\.exists \|\| blocked\.exists/);
  assert.match(code,/if \(d\.direction !== 'inbound'\) continue/);
  assert.match(code,/previous\.data\(\) \|\| \{\}/);
  assert.match(code,/if\(storeId==='csi' && normalizedPhone && isExplicitCsiOptIn\(messageText\)\)/);
});
test('invites only send after an authenticated human click, never on page load',()=>{
  const page=readFileSync(new URL('../src/pages/MarketingAutomationStatus.jsx',import.meta.url),'utf8');
  assert.match(page,/window\.confirm\(/);
  assert.match(page,/action:'csi_consent_invite',storeId:'csi',maxRecipients:20/);
  assert.match(page,/onClick=\{inviteRecent\}/);
  assert.doesNotMatch(page,/useEffect\(\(\) => \{ void inviteRecent\(\);/);
});
