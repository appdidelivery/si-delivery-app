import React, { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowUpRight, Instagram, MapPin, MessageCircle, ShoppingBag, Share2, Heart, Sparkles } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { getStoreIdFromHostname } from '../utils/domainHelper';
import SEO from '../components/SEO';

// A página nunca lê os dados de outra loja: o domínio determina o tenant.
// Contatos e imagens vêm do cadastro público em stores/{storeId}.
const BRAND = {
  xisdale: {
    title: 'Xis da Lê',
    tagline: 'Oi, tudo? Bora de Xis!',
    kicker: 'Lanches caprichados com muito sabor',
    accent: '#ff147a',
    secondary: '#ffce38',
    glow: 'rgba(255, 20, 122, .24)',
    initials: 'Lê',
    // Número publicado no cardápio fornecido pela própria cliente.
    fallbackWhatsapp: '51992253536'
  },
  lovepicados: {
    title: 'Love Picados',
    tagline: 'Seu próximo pedido começa aqui.',
    kicker: 'Peça direto pelo nosso cardápio',
    accent: '#e94c78',
    secondary: '#ffd79e',
    glow: 'rgba(233, 76, 120, .22)',
    initials: 'LP'
  }
};

function safeImage(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (/^https:\/\//i.test(trimmed) || /^\/(?!\/)/.test(trimmed)) return trimmed;
  return '';
}

function instagramLink(value) {
  if (typeof value !== 'string') return '';
  const input = value.trim();
  if (!input) return '';
  const handle = input.replace(/^@/, '');
  if (/^[a-zA-Z0-9._]{1,30}$/.test(handle)) return `https://www.instagram.com/${handle}/`;
  try {
    const uri = new URL(input.startsWith('http') ? input : `https://${input}`);
    const hostname = uri.hostname.toLowerCase();
    if (uri.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(hostname)) return '';
    return uri.href;
  } catch { return ''; }
}

function whatsappLink(value) {
  if (!value) return '';
  const input = String(value).trim();
  const fromUrl = input.match(/(?:wa\.me\/|[?&]phone=)([\d+]+)/i);
  let phone = (fromUrl ? fromUrl[1] : input).replace(/\D/g, '');
  if (/^\d{10,11}$/.test(phone)) phone = `55${phone}`;
  if (!/^55\d{10,11}$/.test(phone)) return '';
  return `https://wa.me/${phone}`;
}

function addressText(value) {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  return [
    [value.street || value.logradouro, value.number || value.numero].filter(Boolean).join(', '),
    value.neighborhood || value.bairro,
    value.city || value.cidade,
    value.state || value.uf
  ].filter(Boolean).join(' • ');
}

function BioLink({ href, icon: Icon, title, subtitle, primary = false, color, external = true }) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="group flex items-center gap-4 rounded-[22px] p-4 sm:p-5 transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      style={{
        background: primary ? color : 'rgba(255,255,255,.075)',
        border: primary ? '1px solid rgba(255,255,255,.20)' : '1px solid rgba(255,255,255,.11)',
        boxShadow: primary ? '0 12px 36px rgba(0,0,0,.22)' : 'none'
      }}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: primary ? 'rgba(0,0,0,.17)' : 'rgba(255,255,255,.10)' }}>
        <Icon size={23} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="text-[16px] font-extrabold leading-tight">{title}</div>
        {subtitle && <div className="mt-1 text-xs leading-snug opacity-80">{subtitle}</div>}
      </div>
      <ArrowUpRight size={20} className="shrink-0 opacity-75 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
    </a>
  );
}

export default function StoreLinkBio() {
  const { store, loading } = useStore();
  const slug = getStoreIdFromHostname();
  const brand = BRAND[slug];
  const data = store?.id === slug || store?.slug === slug ? store : null;

  const whatsapp = useMemo(
    () => whatsappLink(data?.whatsapp || data?.contactWhatsapp || data?.whatsappNumber || data?.phone || data?.telefone || brand?.fallbackWhatsapp),
    [data, brand]
  );
  const instagram = useMemo(
    () => instagramLink(data?.instagramUrl || data?.socialLinks?.instagram || data?.instagram || ''),
    [data]
  );
  const address = addressText(data?.address || data?.endereco || data?.location);
  const logo = safeImage(data?.storeLogoUrl || data?.logoUrl || data?.logo || '');
  const cover = safeImage(data?.storeBannerUrl || data?.bannerUrl || '');
  const url = typeof window !== 'undefined' ? window.location.origin : '';
  const orderUrl = `${url}/?utm_source=instagram&utm_medium=link_bio&utm_campaign=${slug}`;
  const mapUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '';

  // Nunca oferecer uma bio de outra unidade no mesmo domínio.
  if (!brand) return <Navigate to="/" replace />;

  const storeName = data?.name || brand.title;
  const subtitle = slug === 'xisdale' ? brand.tagline : (data?.slogan || brand.tagline);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#111018] text-white">
      <SEO title={`${storeName} | Links oficiais`} description={`Cardápio, pedidos, WhatsApp e redes sociais de ${storeName}. ${subtitle}`} image={logo || undefined} />
      <div className="pointer-events-none absolute -top-36 left-1/2 h-[420px] w-[520px] -translate-x-1/2 rounded-full blur-3xl opacity-80" style={{ background: brand.glow }} />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[540px] flex-col px-5 pb-10 pt-12 sm:px-8">
        <div className="absolute right-5 top-7 text-[11px] font-bold uppercase tracking-[.2em] text-white/45">Link oficial</div>
        <header className="relative text-center">
          {cover && <div className="absolute left-0 right-0 top-0 -z-10 h-52 rounded-3xl bg-cover bg-center opacity-20 blur-sm" style={{ backgroundImage: `url("${cover}")` }} />}
          <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white/90 bg-[#29212d] shadow-[0_20px_60px_rgba(0,0,0,.4)]" style={{ outline: `5px solid ${brand.accent}` }}>
            {logo ? <img src={logo} alt={`Logo de ${storeName}`} className="h-full w-full object-contain" /> : <span className="text-4xl font-black" style={{ color: brand.secondary }}>{brand.initials}</span>}
          </div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[.13em] text-white/80">
            <Sparkles size={13} style={{ color: brand.secondary }} aria-hidden="true" /> {brand.kicker}
          </div>
          <h1 className="text-4xl font-black tracking-[-.06em] sm:text-[44px]">{storeName}</h1>
          <p className="mt-3 text-base font-semibold text-white/80">{subtitle}</p>
        </header>

        {loading ? (
          <div className="mt-12 rounded-3xl border border-white/15 bg-white/10 p-8 text-center text-sm text-white/75" role="status">Carregando informações da loja…</div>
        ) : !data ? (
          <div className="mt-12 rounded-3xl border border-white/15 bg-white/10 p-8 text-center">
            <p className="text-lg font-bold">Estamos preparando nossos links.</p>
            <p className="mt-2 text-sm text-white/70">O cadastro desta unidade ainda não está disponível.</p>
          </div>
        ) : (
          <main className="mt-10 space-y-3.5" aria-label="Links da loja">
            <BioLink href={orderUrl} icon={ShoppingBag} title="Ver cardápio e fazer pedido" subtitle="Peça diretamente pela nossa loja online" primary color={brand.accent} external={false} />
            {whatsapp && <BioLink href={whatsapp} icon={MessageCircle} title="Falar no WhatsApp" subtitle="Dúvidas, atendimento e pedidos" />}
            {instagram && <BioLink href={instagram} icon={Instagram} title="Seguir no Instagram" subtitle="Novidades, fotos e bastidores" />}
            {mapUrl && <BioLink href={mapUrl} icon={MapPin} title="Endereço e como chegar" subtitle={address} />}
            <button
              type="button"
              onClick={async () => {
                const shareUrl = `${window.location.origin}/bio`;
                if (navigator.share) {
                  try { await navigator.share({ title: storeName, text: subtitle, url: shareUrl }); } catch { /* Compartilhamento cancelado. */ }
                } else if (navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(shareUrl);
                  window.alert('Link copiado!');
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 px-5 py-4 text-sm font-bold text-white/75 transition hover:bg-white/10"
            >
              <Share2 size={17} aria-hidden="true" /> Compartilhar esta página
            </button>
          </main>
        )}
        <footer className="mt-auto pt-12 text-center">
          <Heart className="mx-auto mb-3" size={17} fill={brand.accent} color={brand.accent} aria-hidden="true" />
          <p className="text-xs font-semibold text-white/45">Peça direto com {storeName}.</p>
          <p className="mt-2 text-[10px] text-white/30">Tecnologia Velo Delivery</p>
        </footer>
      </div>
    </div>
  );
}
