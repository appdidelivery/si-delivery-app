import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchGeminiWithRetry } from './gemini.js';

for (const scenario of [
  { name: 'usa outro modelo após 404', statuses: [404, 200] },
  { name: 'retorna o último 404 quando todos os modelos falham', statuses: [404, 404] },
  { name: 'não repete erros de permissão', statuses: [403] },
  { name: 'retorna sucesso sem novas chamadas', statuses: [200] },
]) {
  test(scenario.name, async (t) => {
    const calls = [];
    t.mock.method(globalThis, 'fetch', async (url) => {
      calls.push(new URL(url).pathname);
      return new Response('{}', { status: scenario.statuses[calls.length - 1] });
    });
    const response = await fetchGeminiWithRetry(
      'https://example.invalid/models/first:generateContent',
      {},
      { models: ['second'] },
    );
    assert.equal(response.status, scenario.statuses.at(-1));
    assert.deepEqual(calls, [
      '/models/first:generateContent',
      ...(scenario.statuses.length > 1 ? ['/models/second:generateContent'] : []),
    ]);
  });
}
