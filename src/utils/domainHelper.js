// src/utils/domainHelper.js

export const getStoreIdFromHostname = () => {
  const hostname = window.location.hostname;
  const baseDomain = 'velodelivery.com.br'; // Seu domínio principal

  // Caso de desenvolvimento local (localhost)
  // Para testar a loja 'csi' localmente, mude 'default' para 'csi'.
  // Ex: return 'csi';
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return 'default'; // Ou 'csi' para testar a loja específica
  }

  // Caso do domínio principal velodelivery.com.br (página inicial da plataforma)
  if (hostname === baseDomain || hostname === `www.${baseDomain}`) {
    return 'main-platform'; // Ou o ID da sua "loja principal" se velodelivery.com.br for uma loja
  }

  // Caso de subdomínios (ex: csi.velodelivery.com.br)
  // Extrai a parte antes de .velodelivery.com.br
  const subdomains = hostname.replace(`.${baseDomain}`, '');
  const parts = subdomains.split('.'); // Divide por ponto, caso haja admin.csi, etc.

  // Se for admin.csi, queremos 'csi'. Se for csi, queremos 'csi'.
  // O último elemento antes do domínio base é o ID da loja.
  if (parts.length > 0) {
    return parts[parts.length - 1]; // Retorna o último componente do subdomínio (e.g., 'csi' de 'admin.csi' ou 'csi' de 'csi')
  }
  
  return 'main-platform'; // Fallback
};