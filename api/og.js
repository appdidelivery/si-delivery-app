export default async function handler(req, res) {
  // 1. Descobre qual loja o WhatsApp está tentando ler
  const host = req.headers.host || '';
  
  // Se for localhost (seu Mac), usa 'ng' para teste. Se for produção, pega o subdomínio.
  let subdomain = 'ng';
  if (!host.includes('localhost')) {
    subdomain = host.split('.')[0];
  }

  // 2. Acesse o Firebase direto (muito mais rápido para robôs)
  // ⚠️ ATENÇÃO: Troque 'SEU_PROJECT_ID_AQUI' pelo ID real do seu Firebase
  const projectId = 'zetesteapp'; 
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores/${subdomain}`;

  try {
    const dbResponse = await fetch(firestoreUrl);
    if (dbResponse.ok) {
      const data = await dbResponse.json();
      
      // Busca o campo logoUrl que vimos no seu print
      const logoUrl = data.fields?.logoUrl?.stringValue;

      if (logoUrl) {
        // Envia o robô do WhatsApp direto para a logo do cliente!
        return res.redirect(302, logoUrl);
      }
    }
  } catch (error) {
    console.error('Erro ao buscar a logo da loja:', error);
  }

  // 3. Plano B: Se a loja não tiver logo ou der erro, mostra o banner padrão da Velo App
  return res.redirect(302, 'https://appdidelivery.github.io/si-delivery-app/banner-padrao.jpg'); // Pode trocar por aquele link da landing page que você usou!
}