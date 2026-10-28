import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const api = readFileSync(new URL('../api/index.js',import.meta.url),'utf8');
const queue = readFileSync(new URL('../server/journeyQueue.js',import.meta.url),'utf8');
const retention = readFileSync(new URL('../server/lifecycleDispatch.js',import.meta.url),'utf8');
const page = readFileSync(new URL('../src/pages/MarketingAutomationStatus.jsx',import.meta.url),'utf8');

const controlStart=api.indexOf("if (path === '/api/csi-marketing-control')");
const controlEnd=api.indexOf('// Read-only marketing diagnostic',controlStart);
const control=api.slice(controlStart,controlEnd);

test('Pilot switch is authenticated, CSI-only, and never sends messages directly',()=>{
  assert.ok(controlStart>0 && controlEnd>controlStart);
  assert.match(control,/req\.method !== 'POST'/);
  assert.match(control,/assertStoreAccess\(req\.user, 'csi'\)/);
  assert.match(control,/regulatoryReviewConfirmed !== true/);
  assert.doesNotMatch(control,/\/messages\b|csi_consent_invite|sendJourneyTemplate/);
  assert.doesNotMatch(control,/sendViaEvolutionAPI\(|sendMessageToMeta\(|\/messages\b/);
});

test('Activation requires official credentials and rechecks approved Meta templates',()=>{
  for (const name of [
    'velo_carrinho_bebidas','1_velo_pos_venda_bebidas','velo_segunda_compra_bebidas',
    'velo_retencao_30_bebidas','velo_retencao_60_bebidas','velo_retencao_90_bebidas'
  ]) assert.ok(control.includes(name),name);
  assert.match(control,/message_templates\?fields=name,status,language/);
  assert.match(control,/t\.status==='APPROVED' && t\.language==='pt_BR'/);
  assert.match(control,/A integração Meta mudou/);
});

test('Activation transaction fixes CSI niche, enables limited pilot, and pause deactivates both streams',()=>{
  assert.match(control,/tx\.update\(storeRef,\{storeNiche:'conveniencia',seoCategory:'conveniencia'\}\)/);
  assert.match(control,/'integrations\.whatsapp\.journeyAutomation\.dailyLimit':10/);
  assert.match(control,/'integrations\.whatsapp\.lifecycleAutomation\.dailyLimit':10/);
  assert.match(control,/'integrations\.whatsapp\.journeyAutomation\.enabled'\s*:\s*false/);
  assert.match(control,/'integrations\.whatsapp\.lifecycleAutomation\.enabled'\s*:\s*false/);
  assert.match(control,/'integrations\.whatsapp\.journeyAutomation\.enabled'\s*:\s*true/);
  assert.match(control,/'integrations\.whatsapp\.lifecycleAutomation\.enabled'\s*:\s*true/);
  assert.doesNotMatch(control,/'integrations\.whatsapp\.(apiToken|phoneNumberId|wabaId)'\s*:/);
});

test('Background cron, queue, retention and diagnostic reject implicit activation',()=>{
  assert.match(api,/journeyConfig\.enabled === true && journeyProfile\.key === 'beverage'/);
  assert.match(api,/nativeConnected && journey\.enabled === true && niche\.key === 'beverage'/);
  assert.match(api,/nativeConnected && lifecycle\.enabled === true/);
  assert.match(queue,/journeyAutomation\?\.enabled !== true/);
  assert.match(retention,/cfg\.enabled !== true/);
});

test('Dashboard activation requires human acknowledgement and pause is available',()=>{
  assert.match(page,/checked=\{policyConfirmed\}/);
  assert.match(page,/window\.confirm\(question\)/);
  assert.match(page,/authenticatedFetch\('\/api\/csi-marketing-control'/);
  assert.match(page,/Corrigir categoria e ativar piloto/);
  assert.match(page,/Pausar automações/);
});
