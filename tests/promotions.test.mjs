import test from 'node:test';
import assert from 'node:assert/strict';
import { dateInSaoPaulo, promotionStartIso, promotionEndIso, promotionDateInput, presetPromotionRange, promotionStatus, effectivePromoPrice, effectiveUnitPrice, validatePromotion } from '../src/lib/promotions.js';
const p={price:49.9,promotionalPrice:39.9,promotionStartAt:promotionStartIso('2026-10-16'),promotionEndAt:promotionEndIso('2026-10-18')};
test('datas de São Paulo e limites do prazo com fim exclusivo',()=>{
  assert.equal(p.promotionStartAt,'2026-10-16T03:00:00.000Z');
  assert.equal(p.promotionEndAt,'2026-10-19T03:00:00.000Z');
  assert.equal(promotionDateInput(p.promotionEndAt,true),'2026-10-18');
  assert.equal(promotionStatus(p,Date.parse('2026-10-16T02:59:59Z')),'scheduled');
  assert.equal(promotionStatus(p,Date.parse('2026-10-16T03:00:00Z')),'active');
  assert.equal(promotionStatus(p,Date.parse('2026-10-19T02:59:59Z')),'active');
  assert.equal(promotionStatus(p,Date.parse('2026-10-19T03:00:00Z')),'expired');
  assert.equal(effectivePromoPrice(p,Date.parse('2026-10-19T03:00:00Z')),0);
  assert.equal(effectiveUnitPrice(p,Date.parse('2026-10-19T03:00:00Z')),49.9);
});
test('promoções sem datas continuam funcionando para lojas existentes',()=>{
  const legacy={price:20,promotionalPrice:15};
  assert.equal(promotionStatus(legacy,0),'active');
  assert.equal(effectiveUnitPrice(legacy,0),15);
});
test('presets hoje, 7 dias e fim de semana',()=>{
 const today=presetPromotionRange('today','2026-10-16');
 assert.equal(promotionDateInput(today.promotionEndAt,true),'2026-10-16');
 const seven=presetPromotionRange('week','2026-10-16');
 assert.equal(promotionDateInput(seven.promotionEndAt,true),'2026-10-22');
 const weekend=presetPromotionRange('weekend','2026-10-16');
 assert.equal(promotionDateInput(weekend.promotionStartAt),'2026-10-17');
 assert.equal(promotionDateInput(weekend.promotionEndAt,true),'2026-10-18');
});
test('validação de vigência e preço, inclusive datas inválidas',()=>{
 assert.equal(validatePromotion(p),null);
 assert.match(validatePromotion({...p,promotionEndAt:''}),/início e a data/);
 assert.match(validatePromotion({...p,promotionEndAt:promotionEndIso('2026-10-15')}),/igual ou posterior/);
 assert.match(validatePromotion({...p,promotionalPrice:0}),/antes de agendar/);
 assert.match(validatePromotion({...p,promotionalPrice:59}),/menor/);
 assert.equal(promotionStatus({...p,promotionEndAt:''},Date.now()),'invalid');
 assert.equal(promotionStartIso('2026-02-30'),'');
});
test('fuso de São Paulo independe do fuso do navegador',()=>{
 assert.equal(dateInSaoPaulo(new Date('2026-10-17T01:59:59Z')),'2026-10-16');
});
