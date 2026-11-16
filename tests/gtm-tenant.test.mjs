import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const inlineTag = html.match(/<!-- GTM por tenant:[\s\S]*?<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(inlineTag, 'GTM por tenant precisa estar no head');

function load(hostname, pathname = '/') {
  const scripts = [];
  const window = { location: { hostname, pathname } };
  const document = {
    createElement: () => ({}),
    head: { appendChild: (script) => scripts.push(script) },
  };
  runInNewContext(inlineTag, { window, document });
  return { scripts, dataLayer: window.dataLayer || [] };
}

test('Love Picados recebe exclusivamente seu GTM', () => {
  const data = load('lovepicados.velodelivery.com.br');
  assert.equal(data.scripts.length, 1);
  assert.equal(data.scripts[0].src, 'https://www.googletagmanager.com/gtm.js?id=GTM-WZS3HG4D');
  assert.equal(data.dataLayer.some(event => event.event === 'velo_store_context' && event.velo_store_id === 'lovepicados'), true);
});

test('Xis da Lê recebe exclusivamente seu GTM', () => {
  const data = load('xisdale.velodelivery.com.br', '/bio');
  assert.equal(data.scripts.length, 1);
  assert.equal(data.scripts[0].src, 'https://www.googletagmanager.com/gtm.js?id=GTM-55THPMSD');
  assert.equal(data.dataLayer.some(event => event.event === 'velo_store_context' && event.velo_store_id === 'xisdale'), true);
});

test('Não instala contêiner de outra marca', () => {
  for (const hostname of ['app.velodelivery.com.br', 'csi.velodelivery.com.br', 'www.velodelivery.com.br', 'localhost']) {
    assert.equal(load(hostname).scripts.length, 0, hostname);
  }
});

test('Não executa GTM no backoffice, login ou área de motoboys', () => {
  for (const pathname of ['/admin', '/admin/marketing-automation', '/admin-saas', '/login', '/driver/abc/123', '/driver-login']) {
    assert.equal(load('lovepicados.velodelivery.com.br', pathname).scripts.length, 0, pathname);
  }
});

test('Contêiner extra não aparece na implantação', () => {
  assert.equal(html.includes('GTM-PLJ7HVW4'), false);
});
