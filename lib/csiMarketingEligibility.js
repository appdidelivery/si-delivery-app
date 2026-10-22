import { hasEligibleMarketingConsent } from './whatsappMarketingGuard.js';
import { hasValidCsiMarketingRecord } from './whatsappConsentCapture.js';

// A valid, auditable WhatsApp opt-in is a consent source alongside checkout.
// An explicit opt-out on the current order always wins over earlier consent.
export function hasAuthorizedCsiMarketingConsent(source = {}, record = null) {
  if (source?.whatsappMarketingOptOut === true || source?.marketingOptOut === true) return false;
  return hasEligibleMarketingConsent(source, true) || hasValidCsiMarketingRecord(record);
}
