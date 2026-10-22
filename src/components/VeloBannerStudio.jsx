import React, { useEffect, useRef, useState } from 'react';

const PALETTES = {
  varejo: ['#115e35', '#facc15', '#064e3b'],
  moderno: ['#0f172a', '#38bdf8', '#1e3a8a'],
  vibrante: ['#991b1b', '#facc15', '#ef4444'],
};
const LABELS = { oferta: 'OFERTA ESPECIAL', desconto: 'SUPER DESCONTO', lancamento: 'NOVIDADE NA LOJA', combo: 'COMBO ESPECIAL' };
const money = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const firstUrl = (...values) => values.find(v => typeof v === 'string' && /^https:\/\//i.test(v)) || '';
function loadImage(url) {
  return new Promise(resolve => {
    if (!url) return resolve(null);
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}
function rounded(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}
function fitText(ctx, text, maxWidth, initialSize, minSize = 25) {
  let size = initialSize;
  while (size > minSize) {
    ctx.font = `900 ${size}px Arial, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}
function contain(ctx, img, x, y, w, h) {
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale, dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
export default function VeloBannerStudio({ products = [], store, onExport }) {
  const [productId, setProductId] = useState('');
  const [campaign, setCampaign] = useState('oferta');
  const [template, setTemplate] = useState('vibrante');
  const [headline, setHeadline] = useState('');
  const [warning, setWarning] = useState('');
  const [ready, setReady] = useState(false);
  const canvasRef = useRef(null);
  const product = products.find(p => String(p.id) === productId);
  const imageUrl = firstUrl(product?.imageUrl, product?.image, product?.photoUrl, product?.images?.[0]?.url, product?.images?.[0]);
  const logoUrl = firstUrl(store?.storeLogoUrl, store?.logoUrl, store?.logo);
  const original = Number(product?.price || 0);
  const promo = Number(product?.promotionalPrice || product?.promoPrice || 0);
  const hasPromo = promo > 0 && original > promo;
  const price = hasPromo ? promo : original;
  const percentage = hasPromo ? Math.round((1 - promo / original) * 100) : 0;
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setWarning('');
    async function draw() {
      const [photo, logo] = await Promise.all([loadImage(imageUrl), loadImage(logoUrl)]);
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const [bg, accent, secondary] = PALETTES[template];
      const w = 1200, h = 400;
      ctx.clearRect(0, 0, w, h);
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, bg); grad.addColorStop(1, secondary);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = accent; ctx.globalAlpha = 0.11;
      ctx.beginPath(); ctx.arc(650, 30, 230, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(1100, 370, 220, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      rounded(ctx, 32, 30, 310, 60, 16, accent);
      ctx.fillStyle = '#101010'; ctx.font = '900 29px Arial';
      ctx.textAlign = 'center'; ctx.fillText((headline || LABELS[campaign]).slice(0, 28), 187, 70, 292);
      ctx.textAlign = 'left';
      const name = String(product?.name || 'Selecione um produto').slice(0, 55);
      const size = fitText(ctx, name, 430, 49);
      ctx.font = `900 ${size}px Arial`; ctx.fillStyle = '#fff';
      ctx.fillText(name, 35, 157, 430);
      if (hasPromo && campaign !== 'lancamento') {
        ctx.fillStyle = '#f1f5f9'; ctx.font = '25px Arial';
        ctx.fillText('DE ' + money(original), 38, 225);
        const tw = ctx.measureText('DE ' + money(original)).width;
        ctx.strokeStyle = '#f87171'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(38, 217); ctx.lineTo(38 + tw, 217); ctx.stroke();
        rounded(ctx, 35, 238, 205, 45, 10, accent);
        ctx.fillStyle = '#111827'; ctx.font = '900 24px Arial';
        ctx.fillText(percentage + '% DE DESCONTO', 46, 269, 188);
      }
      ctx.fillStyle = accent; ctx.font = '900 70px Arial';
      ctx.fillText(price > 0 ? money(price) : 'Consulte o preço', 34, 360, 475);
      // Área dedicada à fotografia real do catálogo, sem reconstrução de embalagem por IA.
      rounded(ctx, 530, 22, 370, 356, 22, 'rgba(255,255,255,0.94)');
      if (photo) contain(ctx, photo, 550, 36, 330, 324);
      else {
        ctx.fillStyle = '#475569'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center';
        ctx.fillText('Foto indisponível', 715, 202); ctx.textAlign = 'left';
      }
      rounded(ctx, 926, 24, 250, 352, 20, 'rgba(0,0,0,0.45)');
      if (logo) contain(ctx, logo, 947, 38, 208, 112);
      else {
        ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
        ctx.fillText(String(store?.name || 'Sua loja'), 1051, 98, 205); ctx.textAlign = 'left';
      }
      ctx.fillStyle = '#fff'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center';
      ctx.fillText('PEÇA PELO APP', 1051, 223, 220);
      ctx.font = '20px Arial'; ctx.fillText('RECEBA EM CASA', 1051, 255, 220);
      ctx.fillStyle = accent; ctx.font = 'bold 21px Arial';
      ctx.fillText('OFERTAS DA SUA LOJA', 1051, 332, 220);
      ctx.textAlign = 'left';
      const missing = [];
      if (product && !photo) missing.push('A foto do produto não pôde ser carregada.');
      if (logoUrl && !logo) missing.push('A logo oficial não pôde ser carregada.');
      if (!logoUrl) missing.push('A loja não possui logo cadastrada.');
      if (missing.length) setWarning(missing.join(' ') + ' Confira permissões CORS das imagens.');
      setReady(true);
    }
    draw();
    return () => { cancelled = true; };
  }, [product, campaign, template, headline, imageUrl, logoUrl, store?.name, hasPromo, original, price, percentage]);
  function download() {
    if (!product || !ready || warning) return;
    canvasRef.current.toBlob(blob => {
      if (!blob) return setWarning('Não foi possível exportar o PNG.');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `velo-banner-${productId}.png`;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      onExport?.({ productId, campaign, template, format: '1200x400' });
    }, 'image/png');
  }
  return <section className="space-y-4 rounded-2xl border bg-white p-5">
    <h2 className="text-xl font-bold">Estúdio de banners Velo</h2>
    <p className="text-sm text-slate-600">Arte completa com foto original do produto, logo oficial da loja e preço do catálogo.</p>
    <label className="block">Produto
      <select className="mt-1 w-full rounded border p-2" value={productId} onChange={e => setProductId(e.target.value)}>
        <option value="">Selecione um produto</option>
        {products.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
      </select>
    </label>
    <div className="grid gap-3 sm:grid-cols-2">
      <label>Campanha<select className="mt-1 w-full rounded border p-2" value={campaign} onChange={e => setCampaign(e.target.value)}>
        {Object.entries(LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label>Modelo<select className="mt-1 w-full rounded border p-2" value={template} onChange={e => setTemplate(e.target.value)}>
        <option value="varejo">Varejo</option><option value="moderno">Moderno</option><option value="vibrante">Vibrante</option>
      </select></label>
    </div>
    <label className="block">Chamada opcional<input className="mt-1 w-full rounded border p-2" maxLength={28} value={headline} onChange={e => setHeadline(e.target.value)} placeholder={LABELS[campaign]}/></label>
    <canvas ref={canvasRef} width={1200} height={400} aria-label="Prévia da arte completa" className="w-full rounded-lg"/>
    {warning && <p role="alert" className="text-sm text-amber-700">{warning}</p>}
    <button type="button" disabled={!product || !ready || Boolean(warning)} onClick={download} className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50">Baixar banner PNG</button>
    <p className="text-xs text-slate-500">Arte montada com imagens oficiais. Desconto calculado somente quando existe preço promocional menor que o preço original.</p>
  </section>;
}
