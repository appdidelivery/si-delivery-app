// Dedicated supported Graph version for WhatsApp MARKETING templates.
// Keep this separate from legacy customer-service routes and Meta Login.
export const WHATSAPP_MARKETING_GRAPH_VERSION = 'v25.0';

export function marketingMessagesEndpoint(phoneNumberId) {
  if (!/^[0-9]{6,30}$/.test(String(phoneNumberId || ''))) {
    throw new Error('Phone Number ID da Meta inválido.');
  }
  return `https://graph.facebook.com/${WHATSAPP_MARKETING_GRAPH_VERSION}/${phoneNumberId}/messages`;
}
