import admin from 'firebase-admin';

// Inicializa o Firebase Admin com as credenciais do seu projeto
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

export default async function handler(req, res) {
    // Só aceita requisições via POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    const { email, newPassword, name } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({ error: 'E-mail e nova senha são obrigatórios.' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' });
    }

    try {
        // Tenta buscar o usuário existente
        try {
            const userRecord = await admin.auth().getUserByEmail(email);
            
            // Se achou, apenas atualiza a senha
            await admin.auth().updateUser(userRecord.uid, {
                password: newPassword,
            });
            
            return res.status(200).json({ success: true, message: 'Senha atualizada com sucesso!' });
            
        } catch (authError) {
            // SE O USUÁRIO NÃO EXISTIR, CRIA ELE AGORA!
            if (authError.code === 'auth/user-not-found') {
                await admin.auth().createUser({
                    email: email,
                    password: newPassword,
                    displayName: name || 'Equipe Velo',
                });
                
                return res.status(200).json({ success: true, message: 'Conta criada e senha definida com sucesso!' });
            } else {
                throw authError; // Se for outro erro, repassa para o catch principal
            }
        }
    } catch (error) {
        console.error('Erro na alteração/criação de senha:', error);
        res.status(500).json({ error: 'Erro interno ao processar a senha no servidor.' });
    }
}