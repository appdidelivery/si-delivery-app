import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const api = readFileSync(new URL('../api/index.js',import.meta.url),'utf8');
const page = readFileSync(new URL('../src/pages/MarketingAutomationStatus.jsx',import.meta.url),'utf8');
const start = api.indexOf("if (path === '/api/csi-whatsapp-waba-link')");
const end = api.indexOf("// Read-only marketing diagnostic",start);
const route = api.slice(start,end);
test('WABA linking route is authenticated and only accepts POST',()=>{
  assert.ok(start>=0&&end>start);
  assert.match(route,/req\.method !== 'POST'/);
  assert.match(route,/assertStoreAccess\(req\.user, 'csi'\)/);
  assert.match(route,/\^\[0-9\]\{6,30\}\$/);
});
test('Meta validates WABA contains the EXISTING phone number before linking',()=>{
  assert.match(route,/phone_numbers\?fields=id&limit=100/);
  assert.match(route,/String\(item\.id\) === String\(before\.phoneNumberId\)/);
  assert.match(route,/if \(!verified\) return res\.status\(422\)/);
  assert.match(route,/if \(!oldId\) await ref\.update/);
});
test('Only the WABA ID is written, never WhatsApp token or phone',()=>{
  const writes=[...route.matchAll(/ref\.update\(\{([^}]+)\}\)/g)].map(x=>x[1]);
  assert.deepEqual(writes,["'integrations.whatsapp.wabaId':wabaId"]);
  assert.doesNotMatch(route,/apiToken:\s*|phoneNumberId:\s*|\/messages/);
});
test('Operator must explicitly provide WABA ID, approved by Meta; no automatic writes',()=>{
  assert.match(page,/onClick=\{linkWaba\}/);
  assert.match(page,/window\.confirm\('Verificar na Meta/);
  assert.match(page,/authenticatedFetch\('\/api\/csi-whatsapp-waba-link'/);
  assert.match(page,/Verificar e vincular WABA/);
});
test('Journey summary reflects beverage category gate from production cron',()=>{
  const begin=api.indexOf("if (path === '/api/marketing-automation-status')");
  const handler=api.slice(begin,api.indexOf("if (path === '/api/whatsapp-embedded-signup')",begin));
  assert.match(handler,/nicheMatch: niche\.key === 'beverage'/);
  assert.match(handler,/nativeConnected && journey\.enabled === true && niche\.key === 'beverage'/);
});
