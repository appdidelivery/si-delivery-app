import admin from 'firebase-admin';

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
const LINVIX_BASE_URL = 'https://api-main.linvix.com';
const MAX_PAGES = 100;
const PAGE_SIZE = 50;

const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const normalizeCode = (value) => String(value ?? '').trim();

function safeLocations(raw) {
  const items = Array.isArray(raw)
    ? raw
    : raw?.result || raw?.content || raw?.items || [];

  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      id: item.id_uuid || item.uuid || item.codigo_uuid || item.codigo || item.descricao || item.nome || '',
      code: item.codigo || '',
      name: item.descricao || item.nome || item.localizacao || '',
      active: item.ativo !== false,
    }))
    .filter((item) => item.id || item.name);
}

function extractBalancePage(raw) {
  if (Array.isArray(raw)) {
    return { items: raw, totalPages: 1 };
  }

  const items = raw?.content || raw?.result || raw?.items || [];
  const totalPages =
    Number(raw?.totalPages) ||
    Number(raw?.total_paginas) ||
    Number(raw?.paginacao?.total_paginas) ||
    0;

  return {
    items: Array.isArray(items) ? items : [],
    totalPages,
  };
}

async function linvixFetch(path, options = {}) {
  const response = await fetch(`${LINVIX_BASE_URL}${path}`, options);
  const text = await response.text();

  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error?.message ||
      data?.error ||
      data?.detail ||
      `Linvix respondeu HTTP ${response.status}`;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }

  return data;
}

async function getAccessToken(config) {
  const data = await linvixFetch('/v1/public/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      emitente: config.codigoLinvix,
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  const token =
    data?.result?.access_token ||
    data?.access_token ||
    data?.token ||
    data?.result?.token;

  if (!token) {
    throw new Error('A Linvix autenticou a requisição, mas não retornou access_token.');
  }

  return token;
}

async function listStockLocations(token) {
  const data = await linvixFetch('/v1/private/estoque-local/listar', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filter: { ativo: true },
      paginacao: { pagina: 0, itens_por_pagina: 100 },
    }),
  });

  return safeLocations(data);
}

async function fetchAllBalances(token) {
  const all = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const data = await linvixFetch(
      `/v1/private/estoque-cardex/saldos?page=${page}&size=${PAGE_SIZE}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    const { items, totalPages } = extractBalancePage(data);
    all.push(...items);

    if (!items.length) break;
    if (totalPages && page >= totalPages) break;
    if (!totalPages && items.length < PAGE_SIZE) break;
  }

  return all;
}

async function getPrivateConfig(storeId) {
  const snap = await db
    .collection('settings')
    .doc(storeId)
    .collection('private')
    .doc('linvix')
    .get();

  return snap.exists ? snap.data() : null;
}

async function getPublicConfig(storeId) {
  const snap = await db.collection('settings').doc(storeId).get();
  return snap.exists ? snap.data()?.integrations?.linvix || null : null;
}

async function savePublicConfig(storeId, patch) {
  const ref = db.collection('settings').doc(storeId);
  const snap = await ref.get();
  const settings = snap.exists ? snap.data() : {};
  const integrations = settings?.integrations || {};
  const current = integrations?.linvix || {};

  await ref.set(
    {
      integrations: {
        ...integrations,
        linvix: {
          ...current,
          ...patch,
        },
      },
    },
    { merge: true }
  );
}

async function updateProductsFromLocation(storeId, balances, selectedLocation) {
  const locationName = selectedLocation?.name || '';
  const normalizedLocation = normalizeText(locationName);

  if (!normalizedLocation) {
    throw new Error('Selecione o estoque/local da Linvix antes de sincronizar.');
  }

  const rowsForLocation = balances.filter(
    (row) => normalizeText(row?.localizacao) === normalizedLocation
  );

  if (!rowsForLocation.length) {
    const availableNames = [
      ...new Set(
        balances
          .map((row) => String(row?.localizacao || '').trim())
          .filter(Boolean)
      ),
    ].slice(0, 20);

    const suffix = availableNames.length
      ? ` Locais retornados pela Linvix: ${availableNames.join(', ')}.`
      : '';

    throw new Error(
      `Nenhum saldo foi encontrado para o local "${locationName}".${suffix}`
    );
  }

  // Alguns produtos podem aparecer mais de uma vez (lote/variação).
  // Somamos apenas o saldo DISPONÍVEL, que é o que pode ser vendido no delivery.
  const grouped = new Map();

  for (const row of rowsForLocation) {
    const barcode = normalizeCode(row?.cod_barras);
    const linvixCode = normalizeCode(row?.cod_prod ?? row?.codigo_produto);
    const key = barcode ? `gtin:${barcode}` : `linvix:${linvixCode}`;

    if (!barcode && !linvixCode) continue;

    const previous = grouped.get(key) || {
      barcode,
      linvixCode,
      name: row?.nome_prod || row?.desc_prod || '',
      available: 0,
    };

    previous.available += Number(
      row?.estoque_disponivel ?? row?.saldo_disponivel ?? row?.estoque_atual ?? 0
    ) || 0;

    grouped.set(key, previous);
  }

  const productsSnap = await db
    .collection('products')
    .where('storeId', '==', storeId)
    .get();

  const byGtin = new Map();
  const byLinvixCode = new Map();

  productsSnap.docs.forEach((productDoc) => {
    const product = productDoc.data();
    const gtin = normalizeCode(product?.gtin);
    const linvixCode = normalizeCode(product?.linvixCode);

    if (gtin) byGtin.set(gtin, { doc: productDoc, data: product });
    if (linvixCode) byLinvixCode.set(linvixCode, { doc: productDoc, data: product });
  });

  const pendingWrites = [];
  const unmatched = [];
  let matchedProducts = 0;
  let updatedProducts = 0;

  for (const item of grouped.values()) {
    const match =
      (item.barcode && byGtin.get(item.barcode)) ||
      (item.linvixCode && byLinvixCode.get(item.linvixCode));

    if (!match) {
      unmatched.push({
        linvixCode: item.linvixCode,
        barcode: item.barcode,
        name: item.name,
      });
      continue;
    }

    matchedProducts += 1;
    const nextStock = Number(item.available.toFixed(3));
    const currentStock = Number(match.data?.stock);

    if (currentStock !== nextStock || normalizeCode(match.data?.linvixCode) !== item.linvixCode) {
      pendingWrites.push({
        ref: match.doc.ref,
        data: {
          stock: nextStock,
          linvixCode: item.linvixCode || match.data?.linvixCode || '',
          linvixLocation: locationName,
          linvixLastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });
      updatedProducts += 1;
    }
  }

  // Limite do batch é 500 operações. Mantemos folga.
  for (let i = 0; i < pendingWrites.length; i += 450) {
    const batch = db.batch();
    pendingWrites.slice(i, i + 450).forEach(({ ref, data }) => {
      batch.update(ref, data);
    });
    await batch.commit();
  }

  return {
    location: locationName,
    linvixRows: rowsForLocation.length,
    linvixProducts: grouped.size,
    veloProducts: productsSnap.size,
    matchedProducts,
    updatedProducts,
    unmatchedProducts: unmatched.length,
    unmatchedSample: unmatched.slice(0, 20),
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Acesso negado: Token ausente.' });
  }

  try {
    const idToken = authHeader.split('Bearer ')[1];
    await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Acesso negado: Token inválido ou expirado.',
    });
  }

  const { action, storeId } = req.body || {};

  if (!storeId) {
    return res.status(400).json({ success: false, error: 'storeId é obrigatório.' });
  }

  try {
    if (action === 'status') {
      const [privateConfig, publicConfig] = await Promise.all([
        getPrivateConfig(storeId),
        getPublicConfig(storeId),
      ]);

      return res.status(200).json({
        success: true,
        connected: !!(
          privateConfig?.clientId &&
          privateConfig?.clientSecret &&
          privateConfig?.codigoLinvix
        ),
        config: publicConfig || {},
      });
    }

    if (action === 'connect') {
      const clientId = String(req.body?.clientId || '').trim();
      const clientSecret = String(req.body?.clientSecret || '').trim();
      const codigoLinvix = String(req.body?.codigoLinvix || '').trim();

      if (!clientId || !clientSecret || !codigoLinvix) {
        return res.status(400).json({
          success: false,
          error: 'Informe Código Linvix/Emitente, Client ID e Client Secret.',
        });
      }

      const credentials = { clientId, clientSecret, codigoLinvix };
      const token = await getAccessToken(credentials);
      const locations = await listStockLocations(token);

      await db
        .collection('settings')
        .doc(storeId)
        .collection('private')
        .doc('linvix')
        .set(
          {
            ...credentials,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      await savePublicConfig(storeId, {
        connected: true,
        codigoLinvix,
        availableLocations: locations,
        connectionCheckedAt: admin.firestore.FieldValue.serverTimestamp(),
        healthStatus: 'healthy',
        lastError: null,
      });

      return res.status(200).json({
        success: true,
        connected: true,
        locations,
      });
    }

    if (action === 'refreshLocations') {
      const config = await getPrivateConfig(storeId);
      if (!config) throw new Error('Credenciais Linvix ainda não foram configuradas.');

      const token = await getAccessToken(config);
      const locations = await listStockLocations(token);

      await savePublicConfig(storeId, {
        connected: true,
        availableLocations: locations,
        connectionCheckedAt: admin.firestore.FieldValue.serverTimestamp(),
        healthStatus: 'healthy',
        lastError: null,
      });

      return res.status(200).json({ success: true, locations });
    }

    if (action === 'saveLocation') {
      const selectedLocation = req.body?.selectedLocation;
      if (!selectedLocation?.name) {
        return res.status(400).json({
          success: false,
          error: 'Selecione um Estoque Local da Linvix.',
        });
      }

      await savePublicConfig(storeId, {
        selectedLocation: {
          id: selectedLocation.id || '',
          code: selectedLocation.code || '',
          name: selectedLocation.name,
        },
      });

      return res.status(200).json({ success: true });
    }

    if (action === 'sync') {
      const [config, publicConfig] = await Promise.all([
        getPrivateConfig(storeId),
        getPublicConfig(storeId),
      ]);

      if (!config) throw new Error('Credenciais Linvix ainda não foram configuradas.');
      if (!publicConfig?.selectedLocation?.name) {
        throw new Error('Selecione o Estoque Local desta unidade antes de sincronizar.');
      }

      const token = await getAccessToken(config);
      const balances = await fetchAllBalances(token);
      const stats = await updateProductsFromLocation(
        storeId,
        balances,
        publicConfig.selectedLocation
      );

      await savePublicConfig(storeId, {
        connected: true,
        healthStatus: 'healthy',
        lastSyncStatus: 'success',
        lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSyncStats: stats,
        lastError: null,
      });

      return res.status(200).json({ success: true, stats });
    }

    if (action === 'disconnect') {
      await db
        .collection('settings')
        .doc(storeId)
        .collection('private')
        .doc('linvix')
        .delete()
        .catch(() => {});

      await savePublicConfig(storeId, {
        connected: false,
        healthStatus: 'offline',
        lastError: null,
      });

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ success: false, error: 'Ação Linvix inválida.' });
  } catch (error) {
    console.error('[LINVIX]', error);

    try {
      const errorPatch = {
        healthStatus: 'degraded',
        lastError: String(error?.message || error).slice(0, 500),
      };
      if (action === 'sync') errorPatch.lastSyncStatus = 'error';
      await savePublicConfig(storeId, errorPatch);
    } catch {
      // Não mascara o erro principal se o log no Firestore falhar.
    }

    return res.status(500).json({
      success: false,
      error: error?.message || 'Erro inesperado na integração Linvix.',
    });
  }
}
