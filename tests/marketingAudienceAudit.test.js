import test from 'node:test';
import assert from 'node:assert/strict';
import {explainReactivationExclusions} from '../lib/marketingAudienceAudit.js';

test('independent rejection reasons reveal exact sources of a zero audience',()=>{
  const customers=[
    {phone:'1',lastOrderAtMs:101,basicOptIn:true,ageConfirmed:true},
    {phone:'2',lastOrderAtMs:1,basicOptIn:false,ageConfirmed:true},
    {phone:'3',lastOrderAtMs:1,basicOptIn:true,ageConfirmed:false},
    {phone:'4',lastOrderAtMs:1,basicOptIn:true,ageConfirmed:true},
    {phone:'5',lastOrderAtMs:1,basicOptIn:true,ageConfirmed:true},
    {phone:'6',lastOrderAtMs:1,basicOptIn:true,ageConfirmed:true}
  ];
  const a=explainReactivationExclusions(customers,{cutoffMs:100,blockedPhones:new Set(['4']),
    recentlyContactedHashes:new Set(['5']),hashPhone:x=>x,legacySentCount:100});
  assert.deepEqual(a,{uniqueCustomers:6,purchasedTooRecently:1,
    missingMarketingConsent:1,missingAgeConfirmation:1,blockedOrOptedOut:1,
    previouslyContacted:1,passedIndividualChecks:1,conservativeLegacyExclusions:1,finalEligible:0});
});
test('no retrospective adult confirmation is inferred from a purchase alone',()=>{
  const a=explainReactivationExclusions([
    {phone:'1',lastOrderAtMs:1,basicOptIn:true,ageConfirmed:false}
  ],{cutoffMs:100,hashPhone:x=>x});
  assert.equal(a.missingAgeConfirmation,1);
  assert.equal(a.finalEligible,0);
});
