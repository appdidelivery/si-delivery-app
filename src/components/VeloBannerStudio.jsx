import React, { useMemo, useState } from 'react';

/**
 * Editor local de banners: nenhuma IA externa, nenhum custo por renderização.
 * O produto deve vir do catálogo já filtrado por storeId pelo painel.
 */
export default function VeloBannerStudio({ products = [], store, onExport }) {
  const [productId, setProductId] = useState('');
  const [campaign, setCampaign] = useState('oferta');
  const [template, setTemplate] = useState('varejo');
  const [headline, setHeadline] = useState('');
  const product = useMemo(() => products.find(p => String(p.id) === productId), [products, productId]);
  const themes = {
    varejo: { bg: '#14532d', accent: '#facc15', fg: '#fff' },
    moderno: { bg: '#172554', accent: '#38bdf8', fg: '#fff' },
    vibrante: { bg: '#991b1b', accent: '#fde047', fg: '#fff' },
  };
  const theme = themes[template];
  const labels = { oferta: 'OFERTA ESPECIAL', desconto: 'DESCONTO', lancamento: 'NOVIDADE', combo: 'COMBO' };
  const image = product?.imageUrl || product?.image || '';
  const name = product?.name || 'Selecione um produto';
  const price = Number(product?.promotionalPrice || product?.promoPrice || product?.price || 0);
  const original = Number(product?.price || 0);
  const money = n => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400">
    <rect width="1200" height="400" fill="${theme.bg}"/>
    <circle cx="1120" cy="40" r="240" fill="${theme.accent}" opacity=".16"/>
    <rect x="36" y="34" width="340" height="52" rx="26" fill="${theme.accent}"/>
    <text x="206" y="69" font-size="26" font-weight="800" font-family="Arial" text-anchor="middle" fill="#111827">${escapeXml(headline || labels[campaign])}</text>
    <text x="42" y="157" font-size="44" font-weight="800" font-family="Arial" fill="${theme.fg}">${escapeXml(name.slice(0, 33))}</text>
    <text x="42" y="230" font-size="22" font-family="Arial" fill="${theme.fg}">${escapeXml(store?.name || '')}</text>
    ${original > price && campaign !== 'lancamento' ? `<text x="42" y="280" font-size="24" font-family="Arial" fill="#e2e8f0" text-decoration="line-through">${escapeXml(money(original))}</text>` : ''}
    <text x="42" y="355" font-size="72" font-weight="900" font-family="Arial" fill="${theme.accent}">${escapeXml(price ? money(price) : '')}</text>
    ${image && /^https:\/\//.test(image) ? `<image x="800" y="35" width="350" height="330" preserveAspectRatio="xMidYMid meet" href="${escapeXml(image)}"/>` : ''}
  </svg>`;
  const preview = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  function exportSvg() {
    if (!product) return;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'velo-banner-' + productId + '.svg';
    a.click();
    URL.revokeObjectURL(url);
    onExport?.({ productId, campaign, template, format: '1200x400' });
  }
  return <section className="space-y-4 rounded-2xl border bg-white p-5">
    <h2 className="text-xl font-bold">Estúdio de banners Velo</h2>
    <p className="text-sm text-slate-600">Prévia gratuita com dados reais do catálogo. Revise os preços antes de publicar.</p>
    <label className="block">Produto
      <select className="mt-1 w-full rounded border p-2" value={productId} onChange={e => setProductId(e.target.value)}>
        <option value="">Selecione um produto</option>
        {products.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
      </select>
    </label>
    <div className="grid gap-3 sm:grid-cols-2">
      <label>Campanha<select className="mt-1 w-full rounded border p-2" value={campaign} onChange={e => setCampaign(e.target.value)}>
        {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label>Modelo<select className="mt-1 w-full rounded border p-2" value={template} onChange={e => setTemplate(e.target.value)}>
        <option value="varejo">Varejo</option><option value="moderno">Moderno</option><option value="vibrante">Vibrante</option>
      </select></label>
    </div>
    <label className="block">Chamada opcional<input className="mt-1 w-full rounded border p-2" maxLength={30} value={headline} onChange={e => setHeadline(e.target.value)} placeholder={labels[campaign]}/></label>
    <img src={preview} alt="Prévia do banner 1200 por 400" className="w-full rounded-lg" />
    <button type="button" disabled={!product} onClick={exportSvg} className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50">Baixar arte SVG</button>
  </section>;
}
function escapeXml(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c])); }
