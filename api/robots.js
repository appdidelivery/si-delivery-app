export default function handler(req, res) {
  // Extrai o host atual perfeitamente (ex: csi.velodelivery.com.br)
  const host = req.headers.host;

  // Header de Cache para Vercel Edge (Robots.txt muda pouco, cache de 24h é excelente)
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
  res.setHeader('Content-Type', 'text/plain');

  // A regra abaixo diz:
  // 1. Qualquer bot (User-agent: *) é bem-vindo.
  // 2. Eles podem rastrear o site inteiro (Allow: /).
  // 3. Onde eles encontram o seu Sitemap exato para ESSE subdomínio.
  let robotsTxt = `User-agent: *\n`;
  robotsTxt += `Allow: /\n\n`;
  robotsTxt += `Sitemap: https://${host}/sitemap.xml\n`;

  res.status(200).send(robotsTxt);
}