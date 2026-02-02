// src/utils/domainHelper.js

export const getStoreIdFromHostname = () => {
  const hostname = window.location.hostname;
  const baseDomain = 'velodelivery.com.br'; // Seu domínio principal

  // 1. Caso de desenvolvimento local (localhost)
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    // Para testar a loja 'csi' localmente, mude 'default' para 'csi'.
    // Ex: return 'csi';
    return 'default'; // Ou 'csi' para testar uma loja específica localmente
  }

  // 2. Caso de domínio provisório do Vercel (ex: si-delivery-app-git-main-eyagencia.vercel.app)
  if (hostname.endsWith('.vercel.app')) {
    const parts = hostname.split('.');
    // O ID da loja é o primeiro segmento do subdomínio para URLs do Vercel
    // Ex: "si-delivery-app-git-main-eyagencia" de "si-delivery-app-git-main-eyagencia.vercel.app"
    if (parts.length >= 3) { // Deve ter pelo menos [id].vercel.app
      return parts[0]; 
    }
    return 'vercel-fallback'; // Fallback se a URL do Vercel for inesperada
  }

  // 3. Caso do seu domínio principal (velodelivery.com.br ou www.velodelivery.com.br)
  if (hostname === baseDomain || hostname === `www.${baseDomain}`) {
    return 'main-platform'; // Ou o ID da sua "loja principal" se velodelivery.com.br for uma loja
  }

  // 4. Caso de subdomínios do seu domínio principal (ex: csi.velodelivery.com.br)
  // Extrai a parte antes de .velodelivery.com.br
  if (hostname.endsWith(`.${baseDomain}`)) {
    const subdomains = hostname.replace(`.${baseDomain}`, '');
    const parts = subdomains.split('.');
    // O ID da loja é o último componente do subdomínio
    // Ex: 'csi' de 'csi.velodelivery.com.br'
    return parts[parts.length - 1]; 
  }
  
  return 'unknown-store'; // Último fallback para qualquer outro caso não previsto
};