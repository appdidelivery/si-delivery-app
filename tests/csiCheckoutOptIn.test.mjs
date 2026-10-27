import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCsiCheckoutConsent, buildCsiOptInWhatsAppUrl } from '../src/utils/csiMarketingOptIn.js';

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
