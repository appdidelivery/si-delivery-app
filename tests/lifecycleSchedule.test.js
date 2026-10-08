import test from 'node:test';
import assert from 'node:assert/strict';
import { OCCASION_SLOTS, brazilLocalParts, dispatchWindow, confirmedMatchEvent, occasionPurchaseScore, isStoreOpenForSlot } from '../lib/lifecycleSchedule.js';

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
  const now = new Date('2026-10-07T20:30:00Z');
  const valid = {type:'football_match',active:true,confirmed:true,date:'2026-10-07',matchLabel:'Time A x Time B',kickoffAt:'2026-10-08T00:00:00Z'};
  assert.equal(confirmedMatchEvent(valid,'2026-10-07',now),true);
  assert.equal(confirmedMatchEvent({...valid,confirmed:false},'2026-10-07',now),false);
  assert.equal(confirmedMatchEvent(valid,'2026-10-14',now),false);
  assert.equal(confirmedMatchEvent({...valid,matchLabel:''},'2026-10-07',now),false);
  assert.equal(confirmedMatchEvent({...valid,kickoffAt:'2026-10-07T18:00:00Z'},'2026-10-07',now),false);
  assert.equal(confirmedMatchEvent({...valid,kickoffAt:'2026-10-08T04:00:00Z'},'2026-10-07',now),false);
});

test('slots respect store operating hours', () => {
  const store = {isOpen:true, schedule:{5:{open:true,start:'16:00',end:'23:00'},6:{open:false}}};
  assert.equal(isStoreOpenForSlot(store,{day:5,hour:17,minute:45}),true);
  assert.equal(isStoreOpenForSlot(store,{day:5,hour:11,minute:0}),false);
  assert.equal(isStoreOpenForSlot(store,{day:6,hour:11,minute:0}),false);
  assert.equal(isStoreOpenForSlot({isOpen:false},{day:5,hour:17,minute:45}),false);
});

test('weekday historical purchase gets higher occasion score', () => {
  const boughtFriday = new Date('2026-10-02T21:00:00Z');
  const boughtMonday = new Date('2026-10-05T12:00:00Z');
  assert.ok(occasionPurchaseScore([boughtFriday],'fri') > occasionPurchaseScore([boughtMonday],'fri'));
});
