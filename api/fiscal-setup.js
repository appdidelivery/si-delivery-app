const admin = require('firebase-admin');

// Inicializa o Firebase Admin (Cofre do Backend)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        })
    });
}

const db = admin.firestore();

module.exports = async (req, res) => {
    // Bloqueia qualquer requisição que não seja POST
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { storeId, fiscalData, certBase64 } = req.body;

    if (!storeId || !fiscalData) {
        return res.status(400).json({ error: 'Dados incompletos fornecidos pelo painel.' });
    }

    try {
        // 1. BLINDAGEM: Remove a senha do objeto principal para não vazar pro frontend
        const safeFiscalData = { ...fiscalData };
        delete safeFiscalData.certPassword;

        // Salva os dados públicos da matriz (NCM, CNPJ, etc)
        await db.collection('settings').doc(storeId).set({
            fiscal: safeFiscalData
        }, { merge: true });

        // 2. COFRE: Se enviou o certificado ou a senha, salva na subcoleção PRIVADA
        if (certBase64 || fiscalData.certPassword) {
            const privateData = {};
            if (certBase64) privateData.certBase64 = certBase64;
            if (fiscalData.certPassword) privateData.certPassword = fiscalData.certPassword;
            privateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

            await db.collection('settings').doc(storeId)
                .collection('private').doc('fiscal_cert')
                .set(privateData, { merge: true });
            
            // Coloca um aviso no frontend de que o certificado está instalado, sem expor os dados
            await db.collection('settings').doc(storeId).set({
                fiscal: { certStatus: 'uploaded' }
            }, { merge: true });
        }

        // TODO (Fase 4): Aqui faremos o POST para a API da Focus NFe criando a subconta da loja.

        return res.status(200).json({ success: true, message: 'Dados fiscais blindados e salvos.' });
    } catch (error) {
        console.error("Erro Crítico no Fiscal Setup:", error);
        return res.status(500).json({ error: error.message });
    }
};