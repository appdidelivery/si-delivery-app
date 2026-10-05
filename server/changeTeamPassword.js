export async function handleChangeTeamPassword({ req, res, admin, db }) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  }

  try {
    const callerEmail = String(req.user?.email || '').toLowerCase();
    if (!callerEmail) {
      return res.status(401).json({ success: false, error: 'Acesso negado: identidade autenticada sem e-mail.' });
    }

    const { storeId, email, newPassword, name } = req.body || {};

    if (!storeId || !email || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros de configuração incompletos (Falta loja, email ou senha).',
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, error: 'A senha deve ter no mínimo 6 caracteres.' });
    }

    let isAuthorized = false;
    const adminEmails = new Set([
      'appdedelivery@gmail.com',
      'appdidelivery@gmail.com',
      'projetosdiego.l@gmail.com',
    ]);

    if (adminEmails.has(callerEmail)) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      const storeRef = await db.collection('stores').doc(storeId).get();
      if (storeRef.exists) {
        const storeData = storeRef.data() || {};
        const ownerEmail = String(storeData.ownerEmail || storeData.email || '').toLowerCase();
        if (ownerEmail && ownerEmail === callerEmail) isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      const teamQuery = await db.collection('team')
        .where('storeId', '==', storeId)
        .where('email', '==', callerEmail)
        .limit(1)
        .get();

      if (!teamQuery.empty) {
        const callerData = teamQuery.docs[0].data() || {};
        if (callerData.permissions?.team === true) isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      console.warn(`[SECURITY] ${callerEmail} tentou alterar senha da equipe em ${storeId} sem permissão.`);
      return res.status(403).json({
        success: false,
        error: 'Acesso bloqueado: Você não tem privilégios de gerência nesta loja para alterar senhas.',
      });
    }

    let targetUid;
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      targetUid = userRecord.uid;
      await admin.auth().updateUser(targetUid, {
        password: newPassword,
        displayName: name || userRecord.displayName,
      });
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        const newUser = await admin.auth().createUser({
          email,
          password: newPassword,
          displayName: name || 'Membro da Equipe',
        });
        targetUid = newUser.uid;
      } else {
        throw error;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Conta configurada com segurança.',
      uid: targetUid,
    });
  } catch (error) {
    console.error('[change-team-password]', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao processar a segurança da requisição.',
    });
  }
}
