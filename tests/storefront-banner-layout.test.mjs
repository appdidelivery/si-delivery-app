import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8');

function carouselAfter(marker) {
  const start = home.indexOf(marker);
  assert.notEqual(start, -1, 'Banner não encontrado: ' + marker);
  const end = home.indexOf('</AnimatePresence>', start);
  assert.notEqual(end, -1, 'Carrossel incompleto: ' + marker);
  return home.slice(start, end);
}

test('banners promocionais ocupam 100% da largura, sem cantos arredondados ou recorte', () => {
  const promo = carouselAfter('{marketingSettings?.promoActive &&');
  assert.match(promo, /className="w-full overflow-hidden bg-slate-50"/);
  assert.match(promo, /className="block w-full h-auto object-contain rounded-none"/);
  assert.doesNotMatch(promo, /rounded-4xl|object-cover|border-4 border-white|className="overflow-hidden p-6/);
});

test('banners cadastrados no painel usam o mesmo padrão full-bleed no mobile', () => {
  const general = carouselAfter('{generalBanners.length > 0 &&');
  assert.match(general, /className="w-full overflow-hidden bg-slate-50"/);
  assert.match(general, /className="block w-full h-auto object-contain rounded-none"/);
  assert.match(general, /href=\{banner\.linkTo\}/);
  assert.doesNotMatch(general, /rounded-4xl|object-cover|border-4 border-white|className="overflow-hidden p-6/);
});

test('o esqueleto de carregamento reserva banner reto e em largura total', () => {
  assert.match(home, /w-\[calc\(100%\+3rem\)\] -mx-6 aspect-\[2\/1\] bg-slate-200 rounded-none/);
});
