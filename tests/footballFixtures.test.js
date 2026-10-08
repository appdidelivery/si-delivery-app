import test from 'node:test';
import assert from 'node:assert/strict';
import { extractTrackedFixtures, preferredFootballMatch, safeCurrentFixture, matchAudienceAllowed } from '../lib/footballFixtures.js';
const moment=new Date('2026-10-08T15:00:00Z');
function sample({home='6273',away='1936',date='2026-10-11T20:30:00Z',state='pre'}={}) {
  return {events:[{id:'401841267',date,competitions:[{timeValid:true,status:{type:{state}},competitors:[
    {homeAway:'home',team:{id:home,displayName:home==='6273'?'Grêmio':'Outro Clube'}},
    {homeAway:'away',team:{id:away,displayName:away==='1936'?'Internacional':'Outro Clube'}}
  ]}]}]};
}
test('detect real structured Gre-Nal with time in Brasília',()=>{
  const matches=extractTrackedFixtures(sample(),'bra.1',moment);
  assert.equal(matches.length,1);
  assert.equal(matches[0].isGreNal,true);
  assert.equal(matches[0].date,'2026-10-11');
  assert.equal(matches[0].kickoffAt,'2026-10-11T20:30:00.000Z');
  assert.equal(matches[0].priority,100);
});
test('never treat ongoing, expired, unknown or unrelated games as future confirmed events',()=>{
  assert.equal(extractTrackedFixtures(sample({state:'in'}),'bra.1',moment).length,0);
  assert.equal(extractTrackedFixtures(sample({date:'2026-10-01T20:30:00Z'}),'bra.1',moment).length,0);
  assert.equal(extractTrackedFixtures(sample({home:'12',away:'14'}),'bra.1',moment).length,0);
  assert.equal(extractTrackedFixtures(sample(),'epl',moment).length,0);
});
test('Gre-Nal gets priority, and stale verification expires safely',()=>{
  const fixture=extractTrackedFixtures(sample(),'bra.1',moment)[0];
  const other={...fixture,isGreNal:false,priority:80};
  assert.equal(preferredFootballMatch([other,fixture],'2026-10-11').isGreNal,true);
  const event={...fixture,active:true,confirmed:true,type:'football_match',lastVerifiedAt:'2026-10-08T14:30:00Z'};
  assert.equal(safeCurrentFixture(event,'2026-10-11',moment),true);
  assert.equal(safeCurrentFixture({...event,lastVerifiedAt:'2026-10-06T14:30:00Z'},'2026-10-11',moment),false);
  assert.equal(safeCurrentFixture({...event,active:false},'2026-10-11',moment),false);
});

test('only opted-in adults see their chosen club fixture, Gre-Nal includes local fans',()=>{
  const inter={teams:['internacional'],isGreNal:false};
  const grenal={teams:['gremio','internacional'],isGreNal:true};
  assert.equal(matchAudienceAllowed({consent:true,adult:true,team:'gremio'},inter),false);
  assert.equal(matchAudienceAllowed({consent:true,adult:true,team:'gremio'},grenal),true);
  assert.equal(matchAudienceAllowed({consent:true,adult:true,team:'none'},grenal),false);
  assert.equal(matchAudienceAllowed({consent:true,adult:false,team:'gremio'},grenal),false);
  assert.equal(matchAudienceAllowed({consent:false,adult:true,team:'gremio'},grenal),false);
  assert.equal(matchAudienceAllowed({consent:true,adult:true,team:null},inter),false);
});
