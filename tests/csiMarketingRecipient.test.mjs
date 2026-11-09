import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { csiMarketingRecipient } from '../lib/csiMarketingRecipient.js';

test('CSI marketing preserves exact Meta recipient with and without ninth digit', () => {
  assert.equal(csiMarketingRecipient('5551987654321'), '5551987654321');
  assert.equal(csiMarketingRecipient('555187654321'), '555187654321');
  assert.equal(csiMarketingRecipient('5511987654321'), '5511987654321');
  assert.equal(csiMarketingRecipient('551187654321'), '551187654321');
  assert.equal(csiMarketingRecipient('(51) 8765-4321'), '555187654321');
  assert.equal(csiMarketingRecipient('+55 (51) 98765-4321'), '5551987654321');
});

test('CSI marketing rejects international or malformed recipients', () => {
  for (const value of ['+1 415 555 2671', '447700900123', '', '55', '005551987654321', 'abc']) {
    assert.equal(csiMarketingRecipient(value), null, String(value));
  }
});

test('retention and football dispatch preserve recipient, not normalized audience key', () => {
  for (const path of ['../server/lifecycleDispatch.js', '../server/footballAlerts.js']) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.match(source, /csiMarketingRecipient\(rawPhone\)/, path);
    assert.match(source, /to:\s*customer\.recipient/, path);
    assert.doesNotMatch(source, /to:\s*`55\$\{customer\.phone\}`/, path);
  }
});
