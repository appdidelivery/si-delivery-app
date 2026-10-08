import test from 'node:test';
import assert from 'node:assert/strict';
import {occasionPhrase,occasionTemplateComponents,canUseGenericOccasionTemplate} from '../lib/csiOccasionTemplate.js';

test('one reusable Meta model works for all programmed occasions',()=>{
  for (const slot of ['wed','fri','sat','sun','football']) {
    const components=occasionTemplateComponents(slot);
    assert.equal(components.length,1);
    assert.equal(components[0].type,'body');
    assert.equal(components[0].parameters.length,1);
    assert.ok(components[0].parameters[0].text.length>5);
    assert.equal(components[0].parameters[0].text,occasionPhrase(slot));
  }
});
test('unrecognized occasions fail closed',()=>{
  assert.equal(occasionTemplateComponents('unknown'),null);
  assert.equal(occasionPhrase('unknown'),null);
});
test('template never substitutes automatically before approval and policy review',()=>{
  const base={occasionTemplateName:'velo_momentos_bebidas',occasionTemplateApproved:true,marketingPolicyReviewed:true};
  assert.equal(canUseGenericOccasionTemplate(base),true);
  assert.equal(canUseGenericOccasionTemplate({...base,occasionTemplateApproved:false}),false);
  assert.equal(canUseGenericOccasionTemplate({...base,marketingPolicyReviewed:false}),false);
  assert.equal(canUseGenericOccasionTemplate({...base,occasionTemplateName:'!invalid!'}),false);
});
