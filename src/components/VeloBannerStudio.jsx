import React, { useCallback, useEffect, useRef, useState } from 'react';
import { auth } from '../services/firebase';
import { effectivePromoPrice } from '../lib/promotions';

const CAMPAIGNS = {
  oferta: 'Oferta especial',
  desconto: 'Desconto especial',
  lancamento: 'Lançamento',
  combo: 'Combo especial'
};
const LOOKS = { varejo: 'Varejo premium', moderno: 'Moderno', vibrante: 'Vibrante' };
const PALETTES = {
  varejo: {accent:'#ffe13b',chip:'#ffe13b'},
  moderno: {accent:'#74d9ff',chip:'#9df0ff'},
  vibrante: {accent:'#ffd83d',chip:'#ffd83d'}
};
const money = value => Number(value || 0).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
function loadImage(src) {
  return new Promise((resolve,reject)=>{
    const image = new Image();
    image.onload = ()=>resolve(image);
    image.onerror = ()=>reject(new Error('Uma das imagens não pôde ser carregada para compor a arte.'));
    image.src = src;
  });
}
function cover(ctx,image,w,h) {
  const desired=w/h, ratio=image.width/image.height;
  const sw=ratio>desired?image.height*desired:image.width;
  const sh=ratio>desired?image.height:image.width/desired;
  ctx.drawImage(image,(image.width-sw)/2,(image.height-sh)/2,sw,sh,0,0,w,h);
}
function contain(ctx,image,x,y,w,h) {
  const scale=Math.min(w/image.width,h/image.height);
  const dw=image.width*scale,dh=image.height*scale;
  ctx.drawImage(image,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
}
function rounded(ctx,x,y,w,h,r,fill) {
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
}
function priceText(ctx,price,x,y,maxWidth) {
  const raw=money(price);
  let font=83;
  while(font>48) {
    ctx.font='900 '+font+'px Arial, sans-serif';
    if(ctx.measureText(raw).width<=maxWidth)break;
    font-=3;
  }
  ctx.fillText(raw,x,y,maxWidth);
}
function lines(ctx,text,maxWidth,maxLines=2) {
  const words=String(text||'').split(/\s+/).filter(Boolean);
  const result=[];
  let current='';
  for(const word of words) {
    const candidate=current?current+' '+word:word;
    if(ctx.measureText(candidate).width<=maxWidth||!current)current=candidate;
    else {result.push(current);current=word;}
  }
  if(current)result.push(current);
  if(result.length>maxLines) {
    const reduced=result.slice(0,maxLines);
    reduced[maxLines-1]=reduced[maxLines-1].slice(0,36).trim()+'…';
    return reduced;
  }
  return result;
}
function renderBanner(canvas,images,art) {
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Seu navegador não conseguiu abrir o editor de imagens.');
  const w=1200,h=400,colors=PALETTES[art.template]||PALETTES.vibrante;
  ctx.clearRect(0,0,w,h);
  cover(ctx,images.scene,w,h);
  // Harmoniza a imagem gerada com textos verdadeiros sem cobrir o cenário temático.
  const overlay=ctx.createLinearGradient(0,0,800,0);
  overlay.addColorStop(0,'rgba(7,13,24,.88)');
  overlay.addColorStop(.64,'rgba(7,13,24,.57)');
  overlay.addColorStop(1,'rgba(7,13,24,0)');
  ctx.fillStyle=overlay;ctx.fillRect(0,0,w,h);
  const f=art.facts;
  const badge=(art.headline && !/^\s*\d+\s*%\s*$/.test(art.headline)) ?
    art.headline : CAMPAIGNS[art.campaign].toLocaleUpperCase('pt-BR');
  ctx.save();
  ctx.font='900 23px Arial, sans-serif';
  const badgeWidth=Math.min(464,Math.max(190,ctx.measureText(badge).width+48));
  rounded(ctx,38,28,badgeWidth,49,12,colors.chip);
  ctx.textAlign='center';ctx.fillStyle='#17202c';
  ctx.fillText(badge.slice(0,40),38+badgeWidth/2,60,badgeWidth-26);
  ctx.restore();
  // Nome em duas linhas: sempre extraído do catálogo, nunca desenhado pelo modelo.
  let font=53;
  ctx.textAlign='left';
  while(font>36) {
    ctx.font='900 '+font+'px Arial, sans-serif';
    if(lines(ctx,f.name,500,2).every(l=>ctx.measureText(l).width<=500))break;
    font-=3;
  }
  ctx.font='900 '+font+'px Arial, sans-serif';
  ctx.fillStyle='#ffffff';ctx.shadowColor='rgba(0,0,0,.30)';ctx.shadowBlur=12;
  const titleLines=lines(ctx,f.name,500,2);
  titleLines.forEach((line,i)=>ctx.fillText(line,42,135+i*56,500));
  ctx.shadowBlur=0;
  const priceY=titleLines.length>1?344:310;
  if(f.hasPromo&&art.campaign!=='lancamento') {
    ctx.font='bold 23px Arial, sans-serif';ctx.fillStyle='#e2e8f0';
    const was='De '+money(f.original);
    ctx.fillText(was,43,priceY-92);
    const tw=ctx.measureText(was).width;
    ctx.beginPath();ctx.strokeStyle='#fb7185';ctx.lineWidth=3;
    ctx.moveTo(43,priceY-100);ctx.lineTo(43+tw,priceY-100);ctx.stroke();
    rounded(ctx,43+tw+20,priceY-119,144,32,8,colors.chip);
    ctx.fillStyle='#17202c';ctx.font='900 18px Arial, sans-serif';
    ctx.fillText(f.percentage+'% OFF',57+tw+20,priceY-96,120);
  }
  ctx.font='900 78px Arial, sans-serif';ctx.fillStyle=colors.accent;
  ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=18;
  priceText(ctx,f.sellingPrice,39,priceY+14,530);
  ctx.shadowBlur=0;
  ctx.font='bold 17px Arial, sans-serif';ctx.fillStyle='#fff';
  ctx.fillText('PEÇA AGORA • RECEBA EM CASA',43,382,490);
  // Palco do produto: sombra suave, embalagem sempre da fotografia original do catálogo.
  ctx.save();
  ctx.shadowColor='rgba(0,0,0,.50)';ctx.shadowBlur=30;
  ctx.shadowOffsetY=13;
  contain(ctx,images.product,650,42,350,320);
  ctx.restore();
  // Marca da loja: imagem original, escala preservada e sem logo fabricada pela IA.
  rounded(ctx,1020,28,156,102,19,'rgba(255,255,255,.94)');
  contain(ctx,images.logo,1032,35,130,88);
  ctx.font='bold 16px Arial, sans-serif';ctx.textAlign='right';ctx.fillStyle='rgba(255,255,255,.94)';
  ctx.shadowColor='rgba(0,0,0,.65)';ctx.shadowBlur=8;
  ctx.fillText(String(art.storeName||'').slice(0,32),1167,163,240);
  ctx.restore?.();
}
export default function VeloBannerStudio({products=[],store}) {
  const [productId,setProductId]=useState('');
  const [campaign,setCampaign]=useState('oferta');
  const [template,setTemplate]=useState('vibrante');
  const [headline,setHeadline]=useState('');
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [remaining,setRemaining]=useState(null);
  const [diagnostic,setDiagnostic]=useState(null);
  const [checkingConnection,setCheckingConnection]=useState(false);
  const [art,setArt]=useState(null);
  const [rendered,setRendered]=useState(false);
  const canvasRef=useRef(null);
  const product=products.find(p=>String(p.id)===productId);
  const promo=product?effectivePromoPrice(product):0;
  const original=Number(product?.catalogBasePrice??product?.price??0);
  const discountValid=original>0&&promo>0&&promo<original;
  const misleadingPriceCall=/\d[\d.,]*\s*(?:reais?|r\$)|r\$\s*\d/i.test(headline);
  const misleadingPercentCall=/\d+\s*%/.test(headline)&&!discountValid;
  const filteredHeadline=misleadingPriceCall||misleadingPercentCall?'':headline;
  const callApi=useCallback(async(body)=>{
    const user=auth.currentUser;
    if(!user)throw new Error('Entre novamente no painel de gestão.');
    const token=await user.getIdToken();
    const response=await fetch('/api/banner-ai',{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
      body:JSON.stringify({storeId:store.id,...body})
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||'Falha na comunicação com a IA.');
    return payload;
  },[store?.id]);
  useEffect(()=>{
    let live=true;
    if(!store?.id)return;
    callApi({action:'quota'}).then(x=>{if(live)setRemaining(x.remaining);}).catch(()=>{});
    return ()=>{live=false;};
  },[callApi,store?.id]);
  useEffect(()=>{
    if(!art)return;
    let live=true;
    setRendered(false);
    Promise.all([loadImage(art.scene),loadImage(art.productPhoto),loadImage(art.logo)])
      .then(([scene,product,logo])=>{
        if(!live||!canvasRef.current)return;
        renderBanner(canvasRef.current,{scene,product,logo},art);
        setRendered(true);
      })
      .catch(e=>{if(live)setError(e.message);});
    return ()=>{live=false;};
  },[art]);
  function change(setter,value) {
    setter(value);
    setArt(null);setRendered(false);setError('');setMessage('');
  }
  async function generate() {
    if(!product||busy)return;
    setError('');setMessage('');setArt(null);setRendered(false);
    try {
      setBusy('Carregando as fotos oficiais do catálogo...');
      const [photo,logo]=await Promise.all([
        callApi({action:'asset',kind:'product',productId}),
        callApi({action:'asset',kind:'logo',productId})
      ]);
      setBusy('A IA está criando um anúncio exclusivo para este produto...');
      const result=await callApi({action:'generate',productId,campaign,template,headline:filteredHeadline.trim()});
      if(!result.image||!result.facts)throw new Error('A geração não devolveu os dados completos.');
      setArt({scene:result.image,productPhoto:photo.dataUrl,logo:logo.dataUrl,
        facts:result.facts,storeName:store.name,productId,campaign,template,headline:filteredHeadline});
      setRemaining(result.remaining);
      setMessage('Criativo gerado! Confira a arte antes de baixar ou publicar.');
    }catch(e){setError(e.message||'Falha ao gerar o banner.');}
    finally{setBusy('');}
  }
  async function checkConnection() {
    setCheckingConnection(true);
    setDiagnostic(null);
    try {
      const result=await callApi({action:'diagnostics'});
      setDiagnostic(result);
    } catch(e) {
      setDiagnostic({error:e.message});
    } finally {setCheckingConnection(false);}
  }
  function download() {
    if(!rendered||!canvasRef.current)return;
    canvasRef.current.toBlob(blob=>{
      if(!blob){setError('Não foi possível preparar o arquivo.');return;}
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;a.download='banner-velo-'+art.productId+'.jpg';a.click();
      window.setTimeout(()=>URL.revokeObjectURL(url),2000);
    },'image/jpeg',.94);
  }
  async function publish() {
    if(!art||!rendered||busy)return;
    if(!window.confirm('Publicar esta arte no carrossel de banners da loja agora?'))return;
    setError('');setMessage('');
    try {
      setBusy('Publicando a imagem no módulo de banners...');
      const imageData=canvasRef.current.toDataURL('image/jpeg',.90);
      const response=await callApi({action:'publish',productId:art.productId,campaign:art.campaign,
        template:art.template,imageData});
      setMessage('Banner publicado com sucesso! Ele já está cadastrado no módulo de banners da loja.');
      if(response?.imageUrl)setMessage('Banner publicado com sucesso no carrossel da loja.');
    }catch(e){setError(e.message||'Não foi possível publicar. A arte permanece disponível para baixar.');}
    finally{setBusy('');}
  }
  return <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-7">
    <div className="space-y-1">
      <h2 className="text-2xl font-extrabold text-slate-900">Criativos com IA • Velo</h2>
      <p className="text-sm text-slate-600">Escolha um produto e gere a arte publicitária completa. A IA cria o cenário exclusivo; a Velo aplica a foto, a logo e os valores reais do catálogo.</p>
      {remaining!==null&&<p className="text-sm font-semibold text-indigo-700">Gerações disponíveis hoje: {remaining} de 3</p>}
    </div>
    <label className="block text-sm font-semibold text-slate-700">Produto
      <select className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900" value={productId} onChange={e=>change(setProductId,e.target.value)}>
        <option value="">Selecione um produto do catálogo</option>
        {products.map(p=><option key={p.id} value={String(p.id)}>{p.name}</option>)}
      </select>
    </label>
    {product&&<div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
      <span>Preço cadastrado: <strong>{money(discountValid?promo:original)}</strong></span>
      {discountValid?<span className="font-bold text-emerald-700">{Math.round((1-promo/original)*100)}% de desconto confirmado</span>:<span>Sem desconto ativo cadastrado</span>}
    </div>}
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold text-slate-700">Campanha
        <select className="mt-2 w-full rounded-xl border border-slate-300 p-3" value={campaign} onChange={e=>change(setCampaign,e.target.value)}>
          {Object.entries(CAMPAIGNS).map(([key,label])=><option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold text-slate-700">Estilo da arte
        <select className="mt-2 w-full rounded-xl border border-slate-300 p-3" value={template} onChange={e=>change(setTemplate,e.target.value)}>
          {Object.entries(LOOKS).map(([key,label])=><option key={key} value={key}>{label}</option>)}
        </select>
      </label>
    </div>
    <label className="block text-sm font-semibold text-slate-700">Chamada opcional
      <input className="mt-2 w-full rounded-xl border border-slate-300 p-3" maxLength={38} value={headline} onChange={e=>change(setHeadline,e.target.value)} placeholder="Ex.: Refresque seu dia!"/>
    </label>
    {(misleadingPriceCall||misleadingPercentCall)&&<p className="text-sm text-amber-700">A chamada com valor ou porcentagem será ignorada: o banner exibirá apenas o preço e descontos confirmados no cadastro.</p>}
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={!product||Boolean(busy)||remaining===0}
        onClick={generate} className="rounded-xl bg-indigo-700 px-6 py-3 font-bold text-white shadow-sm hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50">
        {busy||'✨ Gerar banner completo com IA'}
      </button>
      <span className="text-xs text-slate-500">Formato Velo: 1200 × 400 px • A visualização não consome crédito.</span>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={checkConnection} disabled={checkingConnection}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
        {checkingConnection?'Verificando conexão...':'🔍 Conferir a organização da chave (grátis)'}
      </button>
      <a href="https://platform.openai.com/settings/organization/general" target="_blank" rel="noopener noreferrer"
        className="text-xs font-semibold text-indigo-700 underline">Ver minha organização na OpenAI ↗</a>
    </div>
    {diagnostic&&<div role="status" className="space-y-1 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm text-slate-700">
      {diagnostic.error?<p>{diagnostic.error}</p>:<>
        <p>Chave OpenAI na organização selecionada: <strong>{diagnostic.keyValid?'Autorizada':'Não autorizada'}</strong></p>
        {diagnostic.configuredOrganization&&<p>Organização definida para o faturamento da Velo: <strong>{diagnostic.configuredOrganization}</strong></p>}
        {diagnostic.organization&&<p>Organização confirmada pela OpenAI: <strong>{diagnostic.organization}</strong></p>}
        {diagnostic.apiError&&<p className="font-semibold text-red-700">Resposta da OpenAI: {diagnostic.apiError}</p>}
        {diagnostic.organizations?.length>0&&diagnostic.organizations.map(item=><p key={item.id}>{item.name||'Organização'}: <strong>{item.id}</strong></p>)}
        {!diagnostic.organization&&!diagnostic.organizations?.length&&<p>Não foi possível identificar a organização na resposta da API.</p>}
        <p>{diagnostic.help||'Compare este ID com a organização que recebeu os créditos. Nenhuma imagem é gerada nesse diagnóstico.'}</p>
      </>}
    </div>}
    {error&&<div role="alert" className="space-y-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
      <p>{error}</p>
      {error.toLowerCase().includes('créditos')&&<div className="flex flex-wrap items-center gap-3">
        <a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noopener noreferrer" className="inline-block font-bold underline">
          Consultar saldo da API OpenAI ↗
        </a>
        <button type="button" onClick={checkConnection} disabled={checkingConnection}
          className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-800 disabled:opacity-50">
          {checkingConnection?'Conferindo chave...':'Verificar a conta da chave (grátis)'}
        </button>
      </div>}
      {diagnostic&&<div className="space-y-1 rounded-lg bg-white p-3 text-sm text-slate-700">
        {diagnostic.error?<p>{diagnostic.error}</p>:<>
          <p>Chave OpenAI: <strong>{diagnostic.keyValid?'Válida':'Não validada'}</strong></p>
          {diagnostic.organization?<p>Organização que atende a chamada: <strong>{diagnostic.organization}</strong></p>:<p>O cabeçalho da resposta não informou a organização utilizada.</p>}
          {diagnostic.organizations?.length>0&&<div><p className="font-semibold">Organizações vinculadas à chave:</p>
            {diagnostic.organizations.map(item=><p key={item.id}>{item.name||'Organização'}: <strong>{item.id}</strong></p>)}
          </div>}
          {diagnostic.project&&<p>Projeto da chamada: {diagnostic.project}</p>}
          <p>Compare a organização indicada com a exibida no <a href="https://platform.openai.com/settings/organization/general" target="_blank" rel="noopener noreferrer" className="underline">painel da OpenAI</a>. Nenhuma geração é cobrada nessa verificação.</p>
        </>}
      </div>}
    </div>}
    {message&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}
    {art?<div className="space-y-4">
      <p className="text-sm font-bold text-slate-900">Sua arte gerada para {art.facts.name}</p>
      <canvas ref={canvasRef} width={1200} height={400}
        aria-label="Banner publicitário final com cenário de IA, foto real do produto, logo da loja e preço validado"
        className="w-full rounded-xl border border-slate-200 shadow-lg"/>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={!rendered||Boolean(busy)} onClick={download}
          className="rounded-xl bg-slate-800 px-5 py-3 font-bold text-white disabled:opacity-50">Baixar banner JPG</button>
        <button type="button" disabled={!rendered||Boolean(busy)} onClick={publish}
          className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white disabled:opacity-50">Publicar no carrossel da loja</button>
      </div>
    </div>:<div className="flex min-h-32 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
      A arte final com IA aparecerá aqui depois de gerar. Nenhum banner padrão será usado como resultado.
    </div>}
    <p className="text-xs text-slate-500">Limite de 3 gerações por loja por dia. Download e publicação de uma arte já gerada não descontam outra geração. Confirme os preços antes de publicar.</p>
  </section>;
}
