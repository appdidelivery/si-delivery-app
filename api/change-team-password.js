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

    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({ error: 'E-mail e nova senha são obrigatórios.' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' });
    }

    try {
        // 1. Busca o usuário secreto no Auth usando o e-mail dele
        const userRecord = await admin.auth().getUserByEmail(email);

        // 2. Força a atualização da senha no sistema
        await admin.auth().updateUser(userRecord.uid, {
            password: newPassword,
        });

        res.status(200).json({ success: true, message: 'Senha atualizada com sucesso!' });
    } catch (error) {
        console.error('Erro na alteração de senha:', error);
        
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({ error: 'Usuário não encontrado. Ele precisa criar a conta primeiro.' });
        }
        
        res.status(500).json({ error: 'Erro interno ao atualizar a senha no servidor.' });
    }
}