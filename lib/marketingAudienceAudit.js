// Aggregate *one primary reason* per number, without logging phone numbers.
// This read-only helper does not alter eligibility or send messages.
export function explainReactivationExclusions(customers, {
  cutoffMs, blockedPhones = new Set(), recentlyContactedHashes = new Set(),
  hashPhone, legacySentCount = 0
} = {}) {
  const breakdown = {
    uniqueCustomers: 0,
    purchasedTooRecently: 0,
    missingMarketingConsent: 0,
    missingAgeConfirmation: 0,
    blockedOrOptedOut: 0,
    previouslyContacted: 0,
    passedIndividualChecks: 0,
    conservativeLegacyExclusions: 0,
    finalEligible: 0
  };
  for (const c of customers) {
    breakdown.uniqueCustomers++;
    if (c.lastOrderAtMs > cutoffMs) breakdown.purchasedTooRecently++;
    else if (!c.basicOptIn) breakdown.missingMarketingConsent++;
    else if (!c.ageConfirmed) breakdown.missingAgeConfirmation++;
    else if (blockedPhones.has(c.phone)) breakdown.blockedOrOptedOut++;
    else if (recentlyContactedHashes.has(hashPhone(c.phone))) breakdown.previouslyContacted++;
    else breakdown.passedIndividualChecks++;
  }
  breakdown.conservativeLegacyExclusions = Math.min(
    Math.max(0, Number(legacySentCount) || 0), breakdown.passedIndividualChecks
  );
  breakdown.finalEligible = breakdown.passedIndividualChecks - breakdown.conservativeLegacyExclusions;
  return breakdown;
}
