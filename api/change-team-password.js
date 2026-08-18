import admin from 'firebase-admin';

// 🛡️ Inicialização segura do Firebase Admin
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
    // 🛡️ BLINDAGEM 1: Proteção de Método
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método não permitido.' });
    }

    try {
        // ========================================================================
        // 🛡️ BLINDAGEM A2: MINI-CATRACA DE AUTENTICAÇÃO (PROTEÇÃO DA VULNERABILIDADE A1)
        // ========================================================================
        const authHeader = req.headers.authorization || req.headers.Authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.warn(`🚨 [SECURITY A1] Tentativa de criar/alterar senha sem Token detectada.`);
            return res.status(401).json({ success: false, error: 'Acesso negado: Token de autenticação ausente.' });
        }

        let decodedToken;
        try {
            const idToken = authHeader.split('Bearer ')[1];
            // O Firebase Admin verifica criptograficamente a autenticidade do usuário
            decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (err) {
            console.error(`🚨 [SECURITY A1] Token Inválido na Gestão de Equipe:`, err.message);
            return res.status(401).json({ success: false, error: 'Acesso negado: Token inválido ou expirado.' });
        }
        // ========================================================================

        const callerEmail = decodedToken.email;
        const { storeId, email, newPassword, name } = req.body;

        if (!storeId || !email || !newPassword) {
            return res.status(400).json({ success: false, error: 'Parâmetros de configuração incompletos (Falta loja, email ou senha).' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'A senha deve ter no mínimo 6 caracteres.' });
        }

        // 🛡️ BLINDAGEM 3: Validação de Autoridade / IDOR (Cross-Tenant Security)
        let isAuthorized = false;
        
        // 3.1: Super Admins (Engenharia da Velo) têm acesso bypass (Modifique se quiser)
        const adminEmails = ['appdedelivery@gmail.com', 'appdidelivery@gmail.com', 'projetosdiego.l@gmail.com'];
        if (adminEmails.includes(callerEmail?.toLowerCase())) {
            isAuthorized = true;
        }

        // 3.2: Verifica se o chamador é Dono da Loja (Owner)
        if (!isAuthorized) {
            const storeRef = await db.collection('stores').doc(storeId).get();
            if (storeRef.exists) {
                const storeData = storeRef.data();
                if (storeData.ownerEmail === callerEmail || storeData.email === callerEmail) {
                    isAuthorized = true;
                }
            }
        }

        // 3.3: Verifica se o chamador é um Gerente com permissão explícita de 'team'
        if (!isAuthorized) {
            const teamQuery = await db.collection('team')
                .where('storeId', '==', storeId)
                .where('email', '==', callerEmail)
                .get();

            if (!teamQuery.empty) {
                const callerData = teamQuery.docs[0].data();
                if (callerData.permissions && callerData.permissions.team === true) {
                    isAuthorized = true;
                }
            }
        }

        if (!isAuthorized) {
            console.warn(`[SECURITY CRITICAL] Usuário ${callerEmail} tentou alterar senhas na loja ${storeId} sem permissão.`);
            return res.status(403).json({ success: false, error: 'Acesso bloqueado: Você não tem privilégios de gerência nesta loja para alterar senhas.' });
        }

        // 🚀 EXECUÇÃO MESTRA: Se passou pelas 3 blindagens, pode criar/atualizar a conta
        let targetUid;
        try {
            const userRecord = await admin.auth().getUserByEmail(email);
            targetUid = userRecord.uid;
            
            // Conta existe -> Atualiza senha e nome
            await admin.auth().updateUser(targetUid, {
                password: newPassword,
                displayName: name || userRecord.displayName
            });
            console.log(`✅ [Equipe] Senha do usuário ${email} alterada com sucesso na loja ${storeId}.`);
            
        } catch (error) {
            // Conta não existe -> Cria do zero
            if (error.code === 'auth/user-not-found') {
                const newUser = await admin.auth().createUser({
                    email: email,
                    password: newPassword,
                    displayName: name || 'Membro da Equipe',
                });
                targetUid = newUser.uid;
                console.log(`✅ [Equipe] Novo funcionário ${email} criado com sucesso na loja ${storeId}.`);
            } else {
                throw error; 
            }
        }

        return res.status(200).json({ success: true, message: 'Conta configurada com segurança.' });

    } catch (error) {
        console.error('[INTERNAL SERVER ERROR]:', error);
        return res.status(500).json({ success: false, error: 'Erro interno ao processar a segurança da requisição.' });
    }
}