// src/utils/domainHelper.js

export const getStoreIdFromHostname = () => {
  const hostname = window.location.hostname;
  const baseDomain = 'velodelivery.com.br'; // Seu domínio principal

  // 1. Caso de desenvolvimento local (localhost)
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    // Para testar a loja 'csi' localmente, você pode retornar 'csi' aqui:
    // return 'csi';
    // Ou mantenha 'default' se quiser uma loja genérica para localhost
    return 'default'; 
  }

  // 2. Caso de subdomínios do seu domínio principal (ex: csi.velodelivery.com.br ou admin.csi.velodelivery.com.br)
  // Remove o domínio principal para isolar o subdomínio(s)
  const parts = hostname.replace(`.${baseDomain}`, '').split('.');

  // Se for admin.nomedaloja.velodelivery.com.br, o nome da loja é o segundo elemento
  if (parts.length >= 2 && parts[0] === 'admin') {
    return parts[1];
  }
  // Se for nomedaloja.velodelivery.com.br, o nome da loja é o primeiro elemento
  else if (parts.length >= 1) {
    return parts[0];
  }

  // 3. Caso do domínio principal velodelivery.com.br (página inicial da plataforma)
  // Ou qualquer outro fallback se nada corresponder.
  return 'main-platform';
};