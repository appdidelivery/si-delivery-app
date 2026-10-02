const DOMAIN_MAP = {
  'convenienciasantaisabel.com.br': 'csi',
  'csi.com.br': 'csi',
  'encantolilas.app.br': 'encantolilas',
  'macanudorex.com.br': 'macanudorex',
  'ngconveniencia.com.br': 'ng',
  'filial.convenienciasantaisabel.com.br': 'filialsantaisabel',
  'coelhoscuca.com.br': 'coelhoscuca',
};

function resolveStoreId(cleanHost) {
  const baseDomain = 'velodelivery.com.br';

  if (cleanHost.endsWith('.vercel.app')) return cleanHost.split('.')[0];
  if (cleanHost === baseDomain || cleanHost === 'www.velodelivery.com.br') return 'main-app';

  if (cleanHost.endsWith('.' + baseDomain)) {
    const parts = cleanHost.replace('.' + baseDomain, '').split('.');
    return parts[parts.length - 1];
  }

  return DOMAIN_MAP[cleanHost] || cleanHost.split('.')[0] || 'csi';
}

function valueToJs(value) {
  if (!value || typeof value !== 'object') return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('mapValue' in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([key, child]) => [key, valueToJs(child)])
    );
  }
  return undefined;
}

function fieldsToJs(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, valueToJs(value)])
  );
}

function absoluteUrl(value, origin) {
  if (!value) return '';
  const str = String(value).trim();
  if (/^https?:\/\//i.test(str)) return str;
  return origin + (str.startsWith('/') ? '' : '/') + str;
}

function cloudinaryIcon(url, size) {
  if (!url || !url.includes('cloudinary.com') || !url.includes('/upload/')) return url;
  return url.replace('/upload/', '/upload/c_pad,w_' + size + ',h_' + size + ',b_white,f_png,q_auto/');
}

export default async function handler(req, res) {
  const hostHeader = req.headers['x-forwarded-host'] || req.headers.host || '';
  const host = String(hostHeader).split(',')[0].trim().split(':')[0];
  const cleanHost = host.toLowerCase().replace(/^www\./, '');
  const origin = 'https://' + host;
  const storeId = resolveStoreId(cleanHost);

  let name = 'Velo Delivery';
  let shortName = 'Velo';
  let logo = 'https://app.velodelivery.com.br/logo-square.png';
  let themeColor = '#2563eb';

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    'zetesteapp';
  const apiKey =
    process.env.FIREBASE_API_KEY ||
    process.env.VITE_FIREBASE_API_KEY ||
    '';
  const authParam = apiKey ? '?key=' + apiKey : '';

  try {
    const url = 'https://firestore.googleapis.com/v1/projects/' + projectId +
      '/databases/(default)/documents/stores/' + storeId + authParam;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });

    if (response.ok) {
      const data = await response.json();
      const store = fieldsToJs((data && data.fields) || {});

      name = store.name || name;
      shortName = String(store.shortName || store.name || shortName).slice(0, 30);
      logo = absoluteUrl(store.storeLogoUrl || store.logoUrl || store.logo || logo, origin);
      themeColor = store.primaryColor || store.themeColor || store.customColor || themeColor;
    }
  } catch {
  }

  const icon192 = cloudinaryIcon(logo, 192);
  const icon512 = cloudinaryIcon(logo, 512);
  const isCloudinary = logo.includes('cloudinary.com');

  const manifest = {
    id: origin + '/',
    name,
    short_name: shortName,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: themeColor,
    orientation: 'portrait',
    icons: isCloudinary
      ? [
          { src: icon192, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ]
      : [
          { src: logo, sizes: 'any', purpose: 'any' },
        ],
  };

  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.setHeader('Vary', 'Host');
  return res.status(200).json(manifest);
}
