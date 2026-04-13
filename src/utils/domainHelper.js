export const getStoreIdFromHostname = () => {
  const hostname = window.location.hostname;
  const baseDomain = 'velodelivery.com.br'; // Seu domínio principal

  // 1. Caso de desenvolvimento local ou Codespaces (SaaS Dinâmico)
  if (hostname.includes('app.github.dev') || hostname.includes('localhost')) {
    // Busca o parâmetro 'store' na URL (Ex: ...github.dev/?store=bar-do-joao)
    const urlParams = new URLSearchParams(window.location.search);
    const debugStore = urlParams.get('store');
    
    // Se você passar ?store= na URL, ele assume esse ID. 
    // Se não passar nada, ele mantém 'loja-teste' como padrão para você trabalhar.
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

  // 3. Caso do seu domínio principal (Landing Page da Velo Delivery)
  if (hostname === baseDomain || hostname === `www.${baseDomain}`) {
    // Aqui retornamos 'main-platform' para que a Home saiba exibir a sua página de vendas
    return 'main-app'; 
  }

  // 4. Caso de subdomínios (A mágica do SaaS: cliente.velodelivery.com.br)
  if (hostname.endsWith(`.${baseDomain}`)) {
    const subdomains = hostname.replace(`.${baseDomain}`, '');
    const parts = subdomains.split('.');
    // Pega o slug exato (ex: 'csi', 'mamedes', 'aurea')
    return parts[parts.length - 1]; 
  }
  
  // 5. Caso de Domínios Customizados (Modo Híbrido com Dicionário)
  if (hostname !== baseDomain && !hostname.endsWith(`.${baseDomain}`)) {
     const cleanHost = hostname.replace('www.', '');
     
     // Dicionário (De/Para): Traduz o domínio para o ID original da loja.
     // Isso impede que os produtos sumam, pois no Firebase eles estão salvos com o slug antigo.
     // Quando um cliente novo comprar um domínio, basta adicionar uma linha aqui.
     const domainMap = {
        "convenienciasantaisabel.com.br": "csi",
        "csi.com.br": "csi",
        "cowburguer.com.br": "cowburguer",
        "ngconveniencia.com.br": "ng"
     };

     return domainMap[cleanHost] || cleanHost;
  }

  return 'unknown-store'; 
};