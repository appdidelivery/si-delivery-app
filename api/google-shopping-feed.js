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

export default async function handler(req, res) {
    const { store } = req.query; // Pega o ID da loja da URL

    if (!store) return res.status(400).send('Loja não informada.');

    try {
        const storeDoc = await db.collection('stores').doc(store).get();
        if (!storeDoc.exists) return res.status(404).send('Loja não encontrada.');
        const storeData = storeDoc.data();

        // Busca os produtos que têm estoque
        const productsSnapshot = await db.collection('products')
                                       .where('storeId', '==', store)
                                       .where('stock', '>', 0)
                                       .get();

        // Monta o cabeçalho do XML RSS 2.0 (Padrão Google Merchant)
        let xml = `<?xml version="1.0" encoding="UTF-8" ?>
        <rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
        <channel>
            <title>${storeData.name}</title>
            <link>https://${store}.velodelivery.com.br</link>
            <description>Catálogo de produtos da ${storeData.name}</description>
        `;

        productsSnapshot.forEach(doc => {
            const p = doc.data();
            const productPrice = p.promotionalPrice > 0 ? p.promotionalPrice : p.price;
            
            // Gera um slug amigável (ex: "heineken-lata")
            const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const productLink = `https://${store}.velodelivery.com.br/p/${doc.id}/${slug}`;

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
        res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate'); // Cache no CDN da Vercel
        res.status(200).send(xml);

    } catch (error) {
        res.status(500).send('Erro interno do servidor.');
    }
}