const LINVIX_BASE_URL = 'https://api-main.linvix.com';
const MAX_PAGES = 100;
const PAGE_SIZE = 100;

const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const normalizeCode = (value) => String(value ?? '').trim();

const asArray = (raw) => {
  if (Array.isArray(raw)) return raw;

  const candidates = [
    raw?.result?.content,
    raw?.result?.items,
    raw?.result?.data,
    raw?.content,
    raw?.items,
    raw?.data,
    raw?.result,
  ];

  return candidates.find(Array.isArray) || [];
};

function safeLocations(raw) {
  return asArray(raw)
    .map((item) => ({
      id: normalizeCode(
        item?.id_uuid ??
        item?.uuid ??
        item?.codigo_uuid ??
        item?.id ??
        item?.codigo
      ),
      code: normalizeCode(item?.codigo ?? item?.cod_local ?? item?.codigo_local),
      name: String(
        item?.descricao ??
        item?.nome ??
        item?.localizacao ??
        item?.nome_local ??
        ''
      ).trim(),
      active:
        item?.ativo !== false &&
        !['inativo', 'inactive', 'disabled'].includes(
          normalizeText(item?.status)
        ),
    }))
    .filter((item) => item.active && (item.id || item.name));
}

function extractBalancePage(raw) {
  if (Array.isArray(raw)) {
    return { items: raw, totalPages: 1 };
  }

  const items = asArray(raw);
  const totalPages =
    Number(raw?.result?.totalPages) ||
    Number(raw?.result?.total_paginas) ||
    Number(raw?.result?.paginacao?.total_paginas) ||
    Number(raw?.totalPages) ||
    Number(raw?.total_paginas) ||
    Number(raw?.paginacao?.total_paginas) ||
    0;

  return { items, totalPages };
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

    const error = new Error(
      typeof message === 'string' ? message : JSON.stringify(message)
    );
    error.statusCode = response.status;
    error.linvixBody = data;
    throw error;
  }

  return data;
}

async function getAccessToken(config) {
  const data = await linvixFetch('/v1/public/auth/aplicacao/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      codigo_linvix: config.codigoLinvix,
    }),
  });

  const token =
    data?.result?.access_token ||
    data?.result?.token ||
    data?.access_token ||
    data?.token;

  if (!token) {
    throw new Error(
      'A Linvix aceitou a autenticação, mas não retornou um token de acesso.'
    );
  }

  return token;
}

async function listStockLocations(token) {
  const data = await linvixFetch('/v1/private/estoque-local/listar', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      page: 1,
      limit: 100,
    }),
  });

  return safeLocations(data);
}

async function fetchAllBalances(token) {
  // A documentação pública expõe /saldos como GET sem paginação obrigatória.
  // Fazemos uma única leitura para evitar duplicar saldos caso o servidor ignore page/limit.
  const data = await linvixFetch('/v1/private/estoque-cardex/saldos', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  return extractBalancePage(data).items;
}

async function getPrivateConfig(db, storeId) {
  const snap = await db
    .collection('settings')
    .doc(storeId)
    .collection('private')
    .doc('linvix')
    .get();

  return snap.exists ? snap.data() : null;
}

async function getPublicConfig(db, storeId) {
  const snap = await db.collection('settings').doc(storeId).get();
  return snap.exists ? snap.data()?.integrations?.linvix || null : null;
}

async function savePublicConfig(db, storeId, patch) {
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

function getBalanceLocation(row) {
  return {
    id: normalizeCode(
      row?.estoque_local_uuid ??
      row?.id_estoque_local ??
      row?.codigo_estoque_local ??
      row?.estoque_local?.id_uuid ??
      row?.estoque_local?.uuid ??
      row?.estoque_local?.id
    ),
    code: normalizeCode(
      row?.cod_local ??
      row?.codigo_local ??
      row?.estoque_local?.codigo
    ),
    name: normalizeText(
      row?.localizacao ??
      row?.nome_local ??
      row?.estoque_local?.descricao ??
      row?.estoque_local?.nome
    ),
  };
}

function belongsToLocation(row, selectedLocation) {
  const selectedId = normalizeCode(selectedLocation?.id);
  const selectedCode = normalizeCode(selectedLocation?.code);
  const selectedName = normalizeText(selectedLocation?.name);
  const rowLocation = getBalanceLocation(row);

  if (selectedId && rowLocation.id && selectedId === rowLocation.id) return true;
  if (selectedCode && rowLocation.code && selectedCode === rowLocation.code) return true;
  return !!selectedName && !!rowLocation.name && selectedName === rowLocation.name;
}

function getProductIdentity(row) {
  const barcode = normalizeCode(
    row?.cod_barras ??
    row?.codigo_barras ??
    row?.gtin ??
    row?.ean ??
    row?.produto?.cod_barras ??
    row?.produto?.gtin
  );

  const linvixCode = normalizeCode(
    row?.cod_prod ??
    row?.codigo_produto ??
    row?.produto_codigo ??
    row?.produto?.codigo ??
    row?.produto?.cod_prod
  );

  return {
    barcode,
    linvixCode,
    name: String(
      row?.nome_prod ??
      row?.desc_prod ??
      row?.produto?.nome ??
      row?.produto?.descricao ??
      ''
    ).trim(),
  };
}

function getAvailableStock(row) {
  const raw =
    row?.estoque_disponivel ??
    row?.saldo_disponivel ??
    row?.disponivel ??
    row?.saldo ??
    row?.estoque_atual ??
    row?.quantidade ??
    0;

  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

async function updateProductsFromLocation({
  db,
  admin,
  storeId,
  balances,
  selectedLocation,
}) {
  if (!selectedLocation?.name && !selectedLocation?.id) {
    throw new Error('Selecione o estoque/local da Linvix antes de sincronizar.');
  }

  const rowsForLocation = balances.filter((row) =>
    belongsToLocation(row, selectedLocation)
  );

  if (!rowsForLocation.length) {
    const availableNames = [
      ...new Set(
        balances
          .map((row) => {
            const location =
              row?.localizacao ??
              row?.nome_local ??
              row?.estoque_local?.descricao ??
              row?.estoque_local?.nome;
            return String(location || '').trim();
          })
          .filter(Boolean)
      ),
    ].slice(0, 20);

    const suffix = availableNames.length
      ? ` Locais retornados pela Linvix: ${availableNames.join(', ')}.`
      : '';

    throw new Error(
      `Nenhum saldo foi encontrado para o local "${selectedLocation?.name || selectedLocation?.id}".${suffix}`
    );
  }

  // Um mesmo produto pode aparecer várias vezes por lote/variação.
  // Somamos o estoque disponível porque é o saldo que pode ser vendido online.
  const grouped = new Map();

  for (const row of rowsForLocation) {
    const identity = getProductIdentity(row);
    const key = identity.barcode
      ? `gtin:${identity.barcode}`
      : identity.linvixCode
        ? `linvix:${identity.linvixCode}`
        : '';

    if (!key) continue;

    const previous = grouped.get(key) || {
      ...identity,
      available: 0,
    };

    previous.available += getAvailableStock(row);
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
    const gtin = normalizeCode(product?.gtin ?? product?.ean ?? product?.barcode);
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

    // Nunca publicamos estoque negativo na vitrine.
    const nextStock = Math.max(0, Number(item.available.toFixed(3)));
    const currentStock = Number(match.data?.stock);

    if (
      currentStock !== nextStock ||
      normalizeCode(match.data?.linvixCode) !== item.linvixCode
    ) {
      pendingWrites.push({
        ref: match.doc.ref,
        data: {
          stock: nextStock,
          linvixCode: item.linvixCode || match.data?.linvixCode || '',
          linvixLocationId: selectedLocation?.id || '',
          linvixLocation: selectedLocation?.name || '',
          linvixLastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });
      updatedProducts += 1;
    }
  }

  // Firestore aceita no máximo 500 operações por batch; usamos folga.
  for (let i = 0; i < pendingWrites.length; i += 450) {
    const batch = db.batch();
    pendingWrites.slice(i, i + 450).forEach(({ ref, data }) => {
      batch.update(ref, data);
    });
    await batch.commit();
  }

  return {
    locationId: selectedLocation?.id || '',
    location: selectedLocation?.name || '',
    linvixRows: rowsForLocation.length,
    linvixProducts: grouped.size,
    veloProducts: productsSnap.size,
    matchedProducts,
    updatedProducts,
    unmatchedProducts: unmatched.length,
    unmatchedSample: unmatched.slice(0, 20),
  };
}

export async function syncLinvixStore({ storeId, admin, db }) {
  const [privateConfig, publicConfig] = await Promise.all([
    getPrivateConfig(db, storeId),
    getPublicConfig(db, storeId),
  ]);

  if (!privateConfig) {
    throw new Error('Credenciais Linvix ainda não foram configuradas.');
  }

  if (!publicConfig?.selectedLocation?.name && !publicConfig?.selectedLocation?.id) {
    throw new Error('Selecione o Estoque Local desta unidade antes de sincronizar.');
  }

  const token = await getAccessToken(privateConfig);
  const balances = await fetchAllBalances(token);
  const stats = await updateProductsFromLocation({
    db,
    admin,
    storeId,
    balances,
    selectedLocation: publicConfig.selectedLocation,
  });

  await savePublicConfig(db, storeId, {
    connected: true,
    healthStatus: 'healthy',
    lastSyncStatus: 'success',
    lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
    lastSyncStats: stats,
    lastError: null,
  });

  return stats;
}

export async function handleLinvixRequest({ req, res, admin, db }) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { action, storeId } = req.body || {};

  if (!storeId) {
    return res.status(400).json({ success: false, error: 'storeId é obrigatório.' });
  }

  try {
    if (action === 'status') {
      const [privateConfig, publicConfig] = await Promise.all([
        getPrivateConfig(db, storeId),
        getPublicConfig(db, storeId),
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
          error: 'Informe Código Linvix, Client ID e Client Secret.',
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

      await savePublicConfig(db, storeId, {
        connected: true,
        autoSyncEnabled: false,
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
      const config = await getPrivateConfig(db, storeId);
      if (!config) {
        throw new Error('Credenciais Linvix ainda não foram configuradas.');
      }

      const token = await getAccessToken(config);
      const locations = await listStockLocations(token);

      await savePublicConfig(db, storeId, {
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

      if (!selectedLocation?.name && !selectedLocation?.id) {
        return res.status(400).json({
          success: false,
          error: 'Selecione um Estoque Local da Linvix.',
        });
      }

      await savePublicConfig(db, storeId, {
        selectedLocation: {
          id: selectedLocation.id || '',
          code: selectedLocation.code || '',
          name: selectedLocation.name || '',
        },
      });

      return res.status(200).json({ success: true });
    }

    if (action === 'sync') {
      const stats = await syncLinvixStore({ storeId, admin, db });
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

      await savePublicConfig(db, storeId, {
        connected: false,
        healthStatus: 'offline',
        lastError: null,
      });

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({
      success: false,
      error: 'Ação Linvix inválida.',
    });
  } catch (error) {
    console.error('[LINVIX]', error);

    try {
      const errorPatch = {
        healthStatus: 'degraded',
        lastError: String(error?.message || error).slice(0, 500),
      };

      if (action === 'sync') {
        errorPatch.lastSyncStatus = 'error';
      }

      await savePublicConfig(db, storeId, errorPatch);
    } catch {
      // Não mascara o erro principal se o registro de saúde falhar.
    }

    return res.status(500).json({
      success: false,
      error: error?.message || 'Erro inesperado na integração Linvix.',
    });
  }
}
