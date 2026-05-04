export const getStoreIdFromHostname = () => {
  try {
    // CORREÇÃO 1: Força minúsculo e remove espaços em branco invisíveis
    const rawHostname = window.location.hostname;
    const hostname = rawHostname.toLowerCase().trim();
    const baseDomain = 'velodelivery.com.br'; 

    // 1. Caso de desenvolvimento local ou Codespaces
    if (hostname.includes('app.github.dev') || hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      const urlParams = new URLSearchParams(window.location.search);
      const debugStore = urlParams.get('store');
      return debugStore || 'loja-teste'; 
    }

    // 2. Caso de domínio provisório do Vercel
    if (hostname.endsWith('.vercel.app')) {
      const parts = hostname.split('.');
      if (parts.length >= 3) {
        return parts[0]; 
      }
      return 'vercel-fallback';
    }

    // 3. Caso do seu domínio principal
    if (hostname === baseDomain || hostname === `www.${baseDomain}`) {
      return 'main-app'; 
    }

    // 4. Caso de subdomínios (cliente.velodelivery.com.br)
    if (hostname.endsWith(`.${baseDomain}`)) {
      const subdomains = hostname.replace(`.${baseDomain}`, '');
      const parts = subdomains.split('.');
      return parts[parts.length - 1]; 
    }
    
    // 5. Caso de Domínios Customizados (Modo Híbrido com Dicionário)
    if (hostname !== baseDomain && !hostname.endsWith(`.${baseDomain}`)) {
       // CORREÇÃO 2: Expressão regular para limpar o www de forma mais segura
       const cleanHost = hostname.replace(/^www\./, '');
       
       const domainMap = {
          "convenienciasantaisabel.com.br": "csi",
          "csi.com.br": "csi",
          "cowburguer.com.br": "cowburguer",
          "macanudorex.com.br": "macanudorex",
          "ngconveniencia.com.br": "ng",
          "ng.velodelivery.com.br": "ng",
          "rincaofood.com.br": "rincaofood",
       };

       // CORREÇÃO 3: Se o domínio não estiver no mapa, extrai apenas a primeira palavra antes do ".com" 
       // Ex: rincaofood.com.br vira 'rincaofood' no fallback, evitando quebrar o Firebase
       return domainMap[cleanHost] || cleanHost.split('.')[0];
    }

    return 'unknown-store'; 
  } catch (error) {
    console.error("Erro Crítico no domainHelper:", error);
    return 'unknown-store';
  }
};