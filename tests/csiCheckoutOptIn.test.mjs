import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCsiCheckoutConsent, buildCsiOptInWhatsAppUrl, normalizeBrazilianCheckoutPhone } from '../src/utils/csiMarketingOptIn.js';

const now = new Date('2026-10-27T12:00:00.000Z');

test('somente aceite e maioridade explícitos da CSI geram autorização', () => {
  for (const input of [
    {storeId:'csi',marketingOptIn:false,adultConfirmed:true},
    {storeId:'csi',marketingOptIn:true,adultConfirmed:false},
    {storeId:'csi'},
    {storeId:'outra-loja',marketingOptIn:true,adultConfirmed:true},
  ]) {
    const result = buildCsiCheckoutConsent({...input,now});
    assert.equal(result.whatsappMarketingOptIn,false);
    assert.equal(result.alcoholMarketingAgeConfirmed,false);
    assert.equal(result.marketingOptInAt,null);
    assert.equal(result.marketingOptInSource,null);
  }
});
test('aceite explícito guarda data e origem',()=>{
  assert.deepEqual(buildCsiCheckoutConsent({storeId:'csi',marketingOptIn:true,adultConfirmed:true,now}),{
    whatsappMarketingOptIn:true,alcoholMarketingAgeConfirmed:true,
    marketingOptInAt:'2026-10-27T12:00:00.000Z',marketingOptInSource:'checkout_explicit_csi'
  });
});
test('link de autoaceite exige WhatsApp configurado válido',()=>{
  assert.equal(buildCsiOptInWhatsAppUrl('(48) 98888-7777'),
    'https://wa.me/5548988887777?text=QUERO%20OFERTAS%2018');
  assert.equal(buildCsiOptInWhatsAppUrl('5548988887777'),
    'https://wa.me/5548988887777?text=QUERO%20OFERTAS%2018');
  assert.equal(buildCsiOptInWhatsAppUrl(''),null);
  assert.equal(buildCsiOptInWhatsAppUrl('12345'),null);
});

test('checkout accepts Brazilian WhatsApp DDD and preserves 8/9 digit variants',()=>{
  assert.equal(normalizeBrazilianCheckoutPhone('(48) 98872-2970'),'48988722970');
  assert.equal(normalizeBrazilianCheckoutPhone('+55 (48) 98872-2970'),'48988722970');
  assert.equal(normalizeBrazilianCheckoutPhone('48988722970'),'48988722970');
  assert.equal(normalizeBrazilianCheckoutPhone('4888722970'),'4888722970');
});
test('checkout rejects absent, malformed or non-Brazilian contact',()=>{
  for (const phone of ['',null,'2970','+1 415 555 2671','55123','00000000000','48; DROP','554888722970000']) {
    assert.equal(normalizeBrazilianCheckoutPhone(phone),null,String(phone));
  }
});
test('Webview exposes mandatory phone before optional marketing choices',()=>{
  const code=readFileSync(new URL('../src/pages/WppWebview.jsx',import.meta.url),'utf8');
  const phonePos=code.indexOf('aria-label="Seu WhatsApp com DDD"');
  const optinPos=code.indexOf('checked={customer.whatsappMarketingOptIn === true}');
  assert.ok(phonePos>0 && phonePos<optinPos);
  assert.match(code,/const checkoutPhone = normalizeBrazilianCheckoutPhone\(customer\.phone\)/);
  assert.match(code,/customerPhone: checkoutPhone/);
  assert.match(code,/whatsappMarketingOptIn: false,\s*alcoholMarketingAgeConfirmed: false/);
});
