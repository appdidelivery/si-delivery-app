import test from 'node:test';
import assert from 'node:assert/strict';
import { productShareSlug, matchesChatProductSearch, chatProductImageUrl, buildChatProductShare, MAX_CHAT_PRODUCTS } from '../src/lib/chatProductShare.js';

test('gera o link real da vitrine com slug idêntico à página de produtos', () => {
  const item = { id: 'p123', name: 'Água Tônica 350ml', price: 5.9, imageUrl: 'https://cdn.example.com/agua.jpg' };
  assert.equal(productShareSlug(item.name), 'agua-tonica-350ml');
  const msg = buildChatProductShare(item, 'https://convenienciasantaisabel.com.br');
  assert.match(msg, /R\$\s*5,90/);
  assert.match(msg, /https:\/\/convenienciasantaisabel\.com\.br\/p\/agua-tonica-350ml/);
  assert.match(msg, /Responda com o nome/);
});
test('suporta preço promocional vigente e não oferece preço falso quando está vazio', () => {
  const sale = { name: 'Red Label', price: 149.9, promotionalPrice: 129.9, promotionStartAt: '2020-01-01', promotionEndAt: '2099-01-01' };
  assert.match(buildChatProductShare(sale, 'https://csi.velodelivery.com.br'), /129,90/);
  assert.match(buildChatProductShare({ name: 'Sem valor' }, 'https://csi.velodelivery.com.br'), /Preço sob consulta/);
});
test('busca sem acentos e imagem HTTP válida, limita seleção múltipla', () => {
  assert.equal(matchesChatProductSearch({ name: 'Água Tônica', category: 'Bebidas' }, 'agua tonica'), true);
  assert.equal(matchesChatProductSearch({ name: 'Água Tônica' }, 'vinho'), false);
  assert.equal(chatProductImageUrl({ imageUrl: 'javascript:alert(1)', images: ['https://cdn.example.com/p.png'] }), 'https://cdn.example.com/p.png');
  assert.equal(MAX_CHAT_PRODUCTS, 8);
});
