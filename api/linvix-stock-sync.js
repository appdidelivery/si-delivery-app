import admin from 'firebase-admin';
import { syncLinvixStore } from '../lib/linvix.js';

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

function isAuthorized(req) {
  const expected = process.env.LINVIX_SYNC_SECRET || process.env.CRON_SECRET;
  if (!expected) return { ok: false, reason: 'missing-secret' };

  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  return {
    ok: authHeader === `Bearer ${expected}`,
    reason: authHeader ? 'invalid-secret' : 'missing-header',
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  }

  const auth = isAuthorized(req);
  if (!auth.ok) {
    if (auth.reason === 'missing-secret') {
      console.error('[LINVIX CRON] CRON_SECRET/LINVIX_SYNC_SECRET não configurado.');
      return res.status(503).json({
        success: false,
        error: 'Sincronização automática ainda não configurada no servidor.',
      });
    }

    return res.status(401).json({ success: false, error: 'Não autorizado.' });
  }

  try {
    // Evita exigir índice composto e mantém compatibilidade com os tenants legados.
    const settingsSnap = await db.collection('settings').get();
    const stores = settingsSnap.docs
      .map((doc) => ({
        storeId: doc.id,
        linvix: doc.data()?.integrations?.linvix || null,
      }))
      .filter(({ linvix }) =>
        linvix?.connected === true &&
        linvix?.autoSyncEnabled !== false &&
        (linvix?.selectedLocation?.id || linvix?.selectedLocation?.name)
      );

    const results = [];

    // Sequencial de propósito: reduz rajadas na API Linvix e mantém previsibilidade.
    for (const store of stores) {
      try {
        const stats = await syncLinvixStore({
          storeId: store.storeId,
          admin,
          db,
        });

        results.push({
          storeId: store.storeId,
          success: true,
          stats: {
            location: stats.location,
            matchedProducts: stats.matchedProducts,
            updatedProducts: stats.updatedProducts,
            unmatchedProducts: stats.unmatchedProducts,
          },
        });
      } catch (error) {
        console.error(`[LINVIX CRON] Falha em ${store.storeId}:`, error);
        results.push({
          storeId: store.storeId,
          success: false,
          error: String(error?.message || error).slice(0, 300),
        });
      }
    }

    const failed = results.filter((item) => !item.success).length;

    return res.status(failed ? 207 : 200).json({
      success: failed === 0,
      processed: results.length,
      failed,
      results,
    });
  } catch (error) {
    console.error('[LINVIX CRON] Erro geral:', error);
    return res.status(500).json({
      success: false,
      error: 'Falha ao executar a sincronização automática Linvix.',
    });
  }
}
