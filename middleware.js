export const config = {
  matcher: ['/((?!api|_vercel|assets|.*\\..*).*)'],
};

const DOMAIN_MAP = {
  'convenienciasantaisabel.com.br': 'csi',
  'csi.com.br': 'csi',
  'encantolilas.app.br': 'encantolilas',
  'macanudorex.com.br': 'macanudorex',
  'ngconveniencia.com.br': 'ng',
  'filial.convenienciasantaisabel.com.br': 'filialsantaisabel',
  'coelhoscuca.com.br': 'coelhoscuca',
};

function fsValue(v) {
  if (!v || typeof v !== 'object') return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return Boolean(v.booleanValue);
  if ('geoPointValue' in v) return {
    latitude: Number(v.geoPointValue.latitude),
    longitude: Number(v.geoPointValue.longitude),
  };
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fsValue);
  if ('mapValue' in v) return Object.fromEntries(
    Object.entries(v.mapValue.fields || {}).map(([k, child]) => [k, fsValue(child)])
  );
  return undefined;
}

function fieldsToJs(fields) {
  return Object.fromEntries(
    Object.entries(fields || {}).map(([k, v]) => [k, fsValue(v)])
  );
}

function resolveStoreId(host) {
  if (DOMAIN_MAP[host]) return DOMAIN_MAP[host];
  if (host.endsWith('.vercel.app')) return host.split('.')[0];
  if (host === 'velodelivery.com.br' || host === 'www.velodelivery.com.br') return 'main-app';
  if (host.endsWith('.velodelivery.com.br')) return host.replace('.velodelivery.com.br', '').split('.').pop();
  return host.split('.')[0] || 'csi';
}

function absoluteUrl(value, origin) {
  if (!value) return '';
  const s = String(value).trim();
  if (/^https?:\/\//i.test(s)) return s;
  return origin + (s.startsWith('/') ? '' : '/') + s;
}

function cloudinary(url, transform) {
  if (!url || !url.includes('cloudinary.com') || !url.includes('/upload/')) return url;
  return url.replace('/upload/', '/upload/' + transform + '/');
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 -]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function phone(raw) {
  let n = String(raw || '').replace(/\D/g, '');
  if (!n) return '';
  if (!n.startsWith('55')) n = '55' + n;
  return '+' + n;
}

function businessType(store) {
  const raw = String(store.seoCategory || store.storeNiche || store.category || '')
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const map = [
    ['burger', 'FastFoodRestaurant'], ['hamburg', 'FastFoodRestaurant'],
    ['pizza', 'Restaurant'], ['restaur', 'Restaurant'], ['sushi', 'Restaurant'],
    ['acai', 'IceCreamShop'], ['sorvete', 'IceCreamShop'], ['sweet', 'IceCreamShop'],
    ['padaria', 'Bakery'], ['bakery', 'Bakery'], ['cafeteria', 'CafeOrCoffeeShop'],
    ['bar', 'BarOrPub'], ['bebida', 'LiquorStore'], ['adega', 'LiquorStore'],
    ['convenien', 'ConvenienceStore'], ['mercado', 'GroceryStore'], ['market', 'GroceryStore'],
  ];
  for (const pair of map) if (raw.includes(pair[0])) return pair[1];
  return 'LocalBusiness';
}

function addressSchema(store) {
  const out = { '@type': 'PostalAddress', addressCountry: 'BR' };
  const a = store.address;
  if (a && typeof a === 'object' && !Array.isArray(a)) {
    const street = a.streetAddress || a.street || a.rua || a.logradouro || '';
    const number = a.number || a.numero || '';
    const city = a.addressLocality || a.city || a.cidade || '';
    const state = a.addressRegion || a.state || a.estado || a.uf || '';
    const cep = a.postalCode || a.zipCode || a.cep || '';
    if (street || number) out.streetAddress = [street, number].filter(Boolean).join(', ');
    if (city) out.addressLocality = city;
    if (state) out.addressRegion = state;
    if (cep) out.postalCode = String(cep);
  } else if (typeof a === 'string' && a.trim()) {
    out.streetAddress = a.trim();
    const cep = a.match(/\d{5}-?\d{3}/);
    const uf = a.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/);
    const city = a.match(/,\s*([^,-]+)\s*-\s*[A-Z]{2}\b/);
    if (cep) out.postalCode = cep[0];
    if (uf) out.addressRegion = uf[0];
    if (city && city[1]) out.addressLocality = city[1].trim();
  }
  return out;
}

async function fetchProducts(projectId, apiKey, storeId) {
  const auth = apiKey ? '?key=' + apiKey : '';
  const endpoint = 'https://firestore.googleapis.com/v1/projects/' + projectId +
    '/databases/(default)/documents:runQuery' + auth;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'products' }],
      where: { fieldFilter: {
        field: { fieldPath: 'storeId' },
        op: 'EQUAL',
        value: { stringValue: storeId },
      }},
      limit: { value: 50 },
    },
  };
  try {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) return [];
    const rows = await r.json();
    return rows.filter(x => x && x.document && x.document.fields).map(x => ({
      id: x.document.name.split('/').pop(),
      ...fieldsToJs(x.document.fields),
    })).filter(x => x.isActive !== false && x.name);
  } catch {
    return [];
  }
}

function menuSchema(name, origin, products, logo) {
  const items = products.map(p => {
    const price = Number(p.promotionalPrice || p.promoPrice || p.price || 0);
    const url = origin + '/p/' + (slugify(p.name) || p.id);
    const item = {
      '@type': 'MenuItem',
      '@id': url + '#menu-item',
      name: p.name,
      url,
      image: absoluteUrl(p.imageUrl || p.fotoUrl || logo, origin) || undefined,
      description: p.description || undefined,
    };
    if (Number.isFinite(price) && price > 0) item.offers = {
      '@type': 'Offer',
      url,
      priceCurrency: 'BRL',
      price: price.toFixed(2),
      availability: p.stock == null || Number(p.stock) > 0
        ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    };
    return item;
  });
  if (!items.length) return null;
  return {
    '@type': 'Menu',
    '@id': origin + '/#menu',
    name: 'Cardápio - ' + name,
    url: origin + '/',
    hasMenuSection: [{
      '@type': 'MenuSection',
      name: 'Cardápio',
      hasMenuItem: items,
    }],
  };
}

export default async function middleware(request) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.includes('.')) return fetch(request);

  const rawHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const host = rawHost.split(',')[0].trim().split(':')[0];
  const cleanHost = host.toLowerCase().replace(/^www\./, '');

  if (cleanHost === 'cowburguer.com.br' || cleanHost === 'cowburguer.velodelivery.com.br') {
    return Response.redirect('https://www.velodelivery.com.br', 301);
  }

  const previewStore = cleanHost.endsWith('.vercel.app') ? url.searchParams.get('store') : '';
  const storeId = previewStore || resolveStoreId(cleanHost);
  const origin = url.protocol + '//' + host;
  const canonical = origin + (url.pathname || '/');

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'zetesteapp';
  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '';
  const auth = apiKey ? '?key=' + apiKey : '';

  let store = {};
  let name = storeId.charAt(0).toUpperCase() + storeId.slice(1);
  let description = 'Faça seu pedido online com praticidade e segurança.';
  let logo = 'https://app.velodelivery.com.br/logo-square.png';
  let products = [];

  try {
    const endpoint = 'https://firestore.googleapis.com/v1/projects/' + projectId +
      '/databases/(default)/documents/stores/' + storeId + auth;
    const r = await fetch(endpoint, { headers: { Accept: 'application/json' } });
    if (r.ok) {
      const data = await r.json();
      store = fieldsToJs(data.fields || {});
      name = store.name || name;
      description = store.slogan || store.aboutText || store.message || store.description || description;
      logo = absoluteUrl(store.storeLogoUrl || store.logoUrl || store.logo || logo, origin);
      products = await fetchProducts(projectId, apiKey, storeId);
    }
  } catch {}

  const type = businessType(store);
  const foodTypes = new Set(['Restaurant','FastFoodRestaurant','IceCreamShop','Bakery','CafeOrCoffeeShop','BarOrPub']);
  const isFood = foodTypes.has(type);
  const favicon = cloudinary(logo, 'c_pad,w_96,h_96,b_white,f_png,q_auto');
  const socialImage = cloudinary(logo, 'c_pad,w_1200,h_630,b_white,f_jpg,q_auto');

  let title = name + ' | Delivery';
  let pageDescription = description;
  let pageImage = socialImage || logo;
  let ogType = 'website';
  let schema;

  const productSlug = url.pathname.startsWith('/p/')
    ? decodeURIComponent(url.pathname.slice(3).replace(/\/$/, '')) : '';
  const product = productSlug
    ? products.find(p => p.id === productSlug || slugify(p.name) === productSlug)
    : null;

  if (product) {
    const rawPrice = Number(product.promotionalPrice || product.promoPrice || product.price || 0);
    const productImage = absoluteUrl(product.imageUrl || product.fotoUrl || logo, origin);
    title = product.name + ' | ' + name;
    pageDescription = product.description || ('Peça ' + product.name + ' online na ' + name + '.');
    pageImage = productImage || pageImage;
    ogType = 'product';
    schema = {
      '@context': 'https://schema.org',
      '@type': isFood ? ['Product', 'MenuItem'] : 'Product',
      '@id': canonical + '#product',
      name: product.name,
      description: pageDescription,
      url: canonical,
      image: productImage ? [productImage] : undefined,
      sku: product.sku || product.id,
      brand: { '@type': 'Brand', name: product.brand || name },
    };
    if (Number.isFinite(rawPrice) && rawPrice > 0) schema.offers = {
      '@type': 'Offer',
      url: canonical,
      priceCurrency: 'BRL',
      price: rawPrice.toFixed(2),
      availability: product.stock == null || Number(product.stock) > 0
        ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    };
  } else {
    const local = {
      '@type': type,
      '@id': origin + '/#business',
      name,
      url: origin + '/',
      image: logo ? [logo] : undefined,
      logo: logo || undefined,
      description,
    };

    const tel = phone(store.phone || store.whatsapp);
    if (tel) local.telephone = tel;
    if (store.priceRange) local.priceRange = String(store.priceRange);

    const address = addressSchema(store);
    if (address.streetAddress || address.addressLocality || address.postalCode) local.address = address;

    const geo = store.geo || store.location || {};
    const lat = Number(store.latitude ?? store.lat ?? geo.latitude);
    const lng = Number(store.longitude ?? store.lng ?? store.lon ?? geo.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      local.geo = { '@type': 'GeoCoordinates', latitude: lat, longitude: lng };
    }

    const cuisine = String(store.servesCuisine || store.seoCategory || store.storeNiche || '').trim();
    if (isFood && cuisine) local.servesCuisine = cuisine;

    const rating = Number(store.rating_aggregate || store.ratingValue || 0);
    const reviews = Number(store.rating_count || store.reviewCount || 0);
    if (rating > 0 && rating <= 5 && reviews > 0) {
      local.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: rating.toFixed(1),
        reviewCount: String(Math.trunc(reviews)),
      };
    }

    const menu = isFood ? menuSchema(name, origin, products, logo) : null;
    if (menu) {
      local.menu = origin + '/';
      local.hasMenu = { '@id': origin + '/#menu' };
    }

    const graph = [local];
    if (menu) graph.push(menu);
    schema = { '@context': 'https://schema.org', '@graph': graph };
  }

  let html;
  try {
    const r = await fetch(new URL('/index.html', request.url));
    if (!r.ok) return fetch(request);
    html = await r.text();
  } catch {
    return fetch(request);
  }

  html = html.replace(/<title[^>]*>.*?<\/title>/gis, '');
  html = html.replace(/<meta\s+name=["']description["'][^>]*>/gis, '');
  html = html.replace(/<meta\s+(?:property|name)=["']og:[^>]*>/gis, '');
  html = html.replace(/<meta\s+(?:property|name)=["']twitter:[^>]*>/gis, '');
  html = html.replace(/<meta\s+name=["']theme-color["'][^>]*>/gis, '');
  html = html.replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gis, '');
  html = html.replace(/<link\b[^>]*\brel=["'](?:icon|shortcut icon|apple-touch-icon|apple-touch-icon-precomposed|mask-icon)["'][^>]*>/gis, '');
  html = html.replace(/<link\b[^>]*\brel=["']manifest["'][^>]*>/gis, '');

  const theme = store.primaryColor || store.themeColor || store.customColor || '#2563eb';
  const head = [
    '<title>' + escapeHtml(title) + '</title>',
    '<meta name="description" content="' + escapeHtml(pageDescription) + '" />',
    '<link rel="canonical" href="' + escapeHtml(canonical) + '" />',
    '<link rel="icon" type="image/png" sizes="96x96" href="' + escapeHtml(favicon) + '" />',
    '<link rel="apple-touch-icon" href="' + escapeHtml(favicon) + '" />',
    '<link rel="manifest" href="/manifest.json" />',
    '<meta name="theme-color" content="' + escapeHtml(theme) + '" />',
    '<meta property="og:title" content="' + escapeHtml(title) + '" />',
    '<meta property="og:description" content="' + escapeHtml(pageDescription) + '" />',
    '<meta property="og:image" content="' + escapeHtml(pageImage) + '" />',
    '<meta property="og:image:alt" content="Logo de ' + escapeHtml(name) + '" />',
    '<meta property="og:type" content="' + ogType + '" />',
    '<meta property="og:url" content="' + escapeHtml(canonical) + '" />',
    '<meta property="og:site_name" content="' + escapeHtml(name) + '" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    '<meta name="twitter:title" content="' + escapeHtml(title) + '" />',
    '<meta name="twitter:description" content="' + escapeHtml(pageDescription) + '" />',
    '<meta name="twitter:image" content="' + escapeHtml(pageImage) + '" />',
    '<script id="velo-server-schema" type="application/ld+json">' +
      JSON.stringify(schema).replace(/</g, '\\u003c') + '</script>',
  ].join('\n');

  html = html.replace('<head>', '<head>\n' + head);

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'Vary': 'Host',
      'X-Store-Id': storeId,
      'X-SEO-Debug': 'tenant-dynamic-v2',
    },
  });
}
