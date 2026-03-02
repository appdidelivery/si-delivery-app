import admin from 'firebase-admin';

// Inicialização do Firebase Admin (igual ao do Stripe Webhook)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
        }),
    });
}
const db = admin.firestore();

// Mesma função de gerar SLUG do frontend (para o link bater 100% igual)
const generateSlug = (text) => {
    return text.toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^a-z0-9 -]/g, '') 
        .replace(/\s+/g, '-') 
        .replace(/-+/g, '-') 
        .replace(/^-+/, '').replace(/-+$/, ''); 
};

export default async function handler(req, res) {
    // 1. Mágica do Subdomínio: Lê a loja direto da URL (ex: csi ou confrariadopeixe)
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    let storeId = host.split('.')[0]; 

    // Fallback: se estiver testando no localhost, ele tenta pegar da URL ou usa 'csi'
    if (host.includes('localhost') || !storeId) {
        storeId = req.query.store || 'csi';
    }

    if (!storeId) return res.status(400).send('Loja não informada.');

    try {
        const storeDoc = await db.collection('stores').doc(storeId).get();
        if (!storeDoc.exists) return res.status(404).send('Loja não encontrada.');
        const storeData = storeDoc.data();

        // Busca os produtos que têm estoque
        const productsSnapshot = await db.collection('products')
                                       .where('storeId', '==', storeId)
                                       .where('stock', '>', 0)
                                       .get();

        // Monta o cabeçalho do XML RSS 2.0 (Padrão Google Merchant)
        let xml = `<?xml version="1.0" encoding="UTF-8" ?>
        <rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
        <channel>
            <title><![CDATA[${storeData.name}]]></title>
            <link>https://${host}</link>
            <description><![CDATA[Catálogo de produtos da ${storeData.name}]]></description>
        `;

        productsSnapshot.forEach(doc => {
            const p = doc.data();
            
            // 2. Geração da URL exata do produto (A Nova Mágica de SEO)
            const slug = generateSlug(p.name);
            const productLink = `https://${host}/p/${slug}`;

            xml += `
            <item>
                <g:id>${doc.id}</g:id>
                <g:title><![CDATA[${p.name}]]></g:title>
                <g:description><![CDATA[${p.description || p.name}]]></g:description>
                <g:link>${productLink}</g:link>
                <g:image_link>${p.imageUrl}</g:image_link>
                <g:condition>new</g:condition>
                <g:availability>in_stock</g:availability>
                <g:price>${Number(p.price).toFixed(2)} BRL</g:price>
                ${p.promotionalPrice > 0 ? `<g:sale_price>${Number(p.promotionalPrice).toFixed(2)} BRL</g:sale_price>` : ''}
                <g:brand>Bebidas</g:brand>
            </item>`;
        });

        xml += `</channel></rss>`;

        // Envia a resposta dizendo ao navegador/robô que é um arquivo XML
        res.setHeader('Content-Type', 'text/xml; charset=utf-8');
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // Cache no Vercel para não travar o banco
        res.status(200).send(xml);

    } catch (error) {
        console.error("Erro no feed:", error);
        res.status(500).send('Erro interno do servidor.');
    }
}