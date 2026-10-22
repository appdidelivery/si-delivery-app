import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { doc, getDoc } from 'firebase/firestore';
import { MapPin, ArrowUpRight, ShoppingBasket, Store } from 'lucide-react';
import { db } from '../services/firebase';

const UNITS = [
  {
    id: 'mercadomonteverde',
    shortName: 'Unidade Monte Verde',
    name: 'Mercado & Padaria Monte Verde',
    address: 'R. da Içara, 202 - Monte Verde, Florianópolis - SC',
    url: 'https://monteverde.mercadomv.com.br',
  },
  {
    id: 'mercadomonteverdesacogrande',
    shortName: 'Unidade Saco Grande',
    name: 'MV Padaria & Mercado',
    address: 'Rod. Virgílio Várzea, 972 - Saco Grande, Florianópolis - SC',
    url: 'https://sacogrande.mercadomv.com.br',
  },
];

export default function MarketMVSelector() {
  const [stores, setStores] = useState(UNITS);

  // Mantém o manifesto da unidade compartilhada com a marca MV, sem
  // alterar o PWA das demais lojas que usam o mesmo deploy.
  useEffect(() => {
    const manifest = document.getElementById('manifest-tag');
    const favicon = document.getElementById('dynamic-favicon');
    const appleIcon = document.getElementById('dynamic-apple-icon');
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    const original = {
      manifest: manifest?.getAttribute('href'),
      favicon: favicon?.getAttribute('href'),
      appleIcon: appleIcon?.getAttribute('href'),
      appleTitle: appleTitle?.getAttribute('content'),
    };
    if (manifest) manifest.setAttribute('href', '/mercadomv-manifest.json');
    if (favicon) favicon.setAttribute('href', '/mercadomv-icon.svg');
    if (appleIcon) appleIcon.setAttribute('href', '/mercadomv-icon.svg');
    if (appleTitle) appleTitle.setAttribute('content', 'Mercado MV');
    return () => {
      if (manifest && original.manifest !== null) manifest.setAttribute('href', original.manifest);
      if (favicon && original.favicon !== null) favicon.setAttribute('href', original.favicon);
      if (appleIcon && original.appleIcon !== null) appleIcon.setAttribute('href', original.appleIcon);
      if (appleTitle && original.appleTitle !== null) appleTitle.setAttribute('content', original.appleTitle);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all(UNITS.map(async (unit) => {
      try {
        const snapshot = await getDoc(doc(db, 'stores', unit.id));
        if (!snapshot.exists()) return unit;
        const data = snapshot.data();
        return {
          ...unit,
          name: data.name || unit.name,
          address: typeof data.address === 'string' ? data.address : unit.address,
          logo: data.storeLogoUrl || data.logoUrl || '',
        };
      } catch {
        return unit;
      }
    })).then(updated => {
      if (alive) setStores(updated);
    });
    return () => { alive = false; };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 text-slate-900">
      <Helmet>
        <title>Mercado MV | Escolha sua unidade</title>
        <meta name="description" content="Compre online no Mercado MV. Escolha a unidade Monte Verde ou Saco Grande em Florianópolis e confira produtos, preços e entregas." />
        <meta property="og:title" content="Mercado MV | Escolha sua unidade" />
        <meta property="og:description" content="Duas unidades em Florianópolis. Escolha a sua e faça seu pedido online." />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href="https://www.mercadomv.com.br/" />
      </Helmet>
      <div className="mx-auto max-w-5xl px-5 py-12 sm:py-20">
        <header className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-700 text-white shadow-lg">
            <ShoppingBasket size={40} aria-hidden="true" />
          </div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">Mercado MV</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Escolha sua unidade
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Duas unidades em Florianópolis para você fazer seu pedido com praticidade.
            Selecione onde deseja comprar.
          </p>
        </header>

        <section className="mt-10 grid gap-5 md:grid-cols-2" aria-label="Unidades Mercado MV">
          {stores.map(unit => (
            <a key={unit.id} href={unit.url}
              className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-400 hover:shadow-xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-emerald-500"
              aria-label={`Comprar na ${unit.shortName}`}>
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-100 text-emerald-700">
                  {unit.logo
                    ? <img src={unit.logo} alt="" className="h-full w-full object-cover" />
                    : <Store size={32} aria-hidden="true" />}
                </div>
                <div>
                  <span className="text-sm font-bold text-emerald-700">{unit.shortName}</span>
                  <h2 className="mt-1 text-xl font-bold">{unit.name}</h2>
                </div>
              </div>
              <p className="mt-6 flex min-h-14 items-start gap-2 text-sm text-slate-600">
                <MapPin size={18} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>{unit.address}</span>
              </p>
              <span className="mt-auto flex items-center justify-between rounded-2xl bg-emerald-700 px-5 py-3 font-semibold text-white transition group-hover:bg-emerald-800">
                Comprar nesta unidade <ArrowUpRight size={20} aria-hidden="true" />
              </span>
            </a>
          ))}
        </section>
        <footer className="mt-12 text-center text-sm text-slate-500">
          Cada unidade tem seu próprio catálogo, disponibilidade e pedidos.
        </footer>
      </div>
    </main>
  );
}
