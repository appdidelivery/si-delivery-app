import test from 'node:test';
import assert from 'node:assert/strict';
import { OCCASION_SLOTS, brazilLocalParts, dispatchWindow, confirmedMatchEvent, occasionPurchaseScore } from '../lib/lifecycleSchedule.js';

test('all slots are São Paulo time and use only allowed days', () => {
  assert.deepEqual(Object.keys(OCCASION_SLOTS), ['wed','fri','sat','sun']);
  const w = new Date('2026-10-07T20:30:00Z');
  assert.deepEqual(brazilLocalParts(w), {day:3,hour:17,minute:30,dateKey:'2026-10-07'});
  assert.equal(dispatchWindow('wed', w).allowed, true);
  assert.equal(dispatchWindow('fri', w).allowed, false);
  assert.equal(dispatchWindow('fri',new Date('2026-10-09T20:20:00Z')).allowed, false);
  assert.equal(dispatchWindow('fri',new Date('2026-10-09T20:40:00Z')).allowed, true);
  assert.equal(dispatchWindow('sat',new Date('2026-10-10T14:10:00Z')).allowed, true);
  assert.equal(dispatchWindow('sun',new Date('2026-10-11T14:10:00Z')).allowed, true);
  assert.equal(dispatchWindow('wed',new Date('2026-10-07T19:00:00Z')).allowed, false);
});

test('no invented Wednesday games', () => {
  const valid = {type:'football_match',active:true,confirmed:true,date:'2026-10-07',matchLabel:'Time A x Time B'};
  assert.equal(confirmedMatchEvent(valid,'2026-10-07'),true);
  assert.equal(confirmedMatchEvent({...valid,confirmed:false},'2026-10-07'),false);
  assert.equal(confirmedMatchEvent(valid,'2026-10-14'),false);
  assert.equal(confirmedMatchEvent({...valid,matchLabel:''},'2026-10-07'),false);
});

test('weekday historical purchase gets higher occasion score', () => {
  const boughtFriday = new Date('2026-10-02T21:00:00Z');
  const boughtMonday = new Date('2026-10-05T12:00:00Z');
  assert.ok(occasionPurchaseScore([boughtFriday],'fri') > occasionPurchaseScore([boughtMonday],'fri'));
});
