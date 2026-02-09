// api/robots.js
export default function handler(req, res) {
  const host = req.headers.host; // Ex: csi.velodelivery.com.br, lojadobeto.velodelivery.com.br, velodelivery.com.br

  // Extrai o subdomínio. Ex: "csi", "lojadobeto", "www" (para o domínio principal se configurado)
  const parts = host.split('.');
  const subdomain = parts.length > 2 && parts[0] !== 'www' ? parts[0] : null;

  res.setHeader('Content-Type', 'text/plain');

  // REGRA 1: Para o subdomínio de administração (csi)
  if (subdomain === 'csi') {
    res.send('User-agent: *\nDisallow: /'); // Não indexar nada
    return;
  }

  // REGRA 2: Para o domínio principal (velodelivery.com.br) - ASSUMIMOS QUE É UMA LANDING PAGE SEPARADA
  // Se este `SI-DELIVERY-APP` NÃO SERVE a landing page principal (velodelivery.com.br),
  // então esta parte não é necessária aqui, pois a landing page terá seu próprio robots.txt estático.
  // SE ESTE MESMO PROJETO (SI-DELIVERY-APP) SERVIR TAMBÉM A LANDING PAGE PRINCIPAL,
  // VOCÊ PRECISARIA DE UMA LÓGICA AQUI PARA "velodelivery.com.br"
  // Por enquanto, vou assumir que o domínio principal tem seu próprio deploy/robots.txt
  // e que este projeto (SI-DELIVERY-APP) só se importa com csi e os subdomínios dos clientes.

  // REGRA 3: Para as lojas dos clientes (qualquer outro subdomínio)
  // Permitir tudo e apontar para o sitemap dinâmico específico da loja
  res.send(`User-agent: *\nAllow: /\nSitemap: https://${host}/sitemap.xml`);
}