import React, { useEffect, useId, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Building2, Check, ChevronDown, Loader2 } from 'lucide-react';
import { auth } from '../services/firebase';

const STORES = {
  lovepicados: 'Love Picados',
  xisdale: 'Xis da Lê',
};

async function invoke(action, token, target) {
  const response = await fetch('/api/multistore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ action, ...(target ? { target } : {}) }),
    cache: 'no-store'
  });
  if (!response.ok) throw new Error('Não foi possível verificar o acesso multiloja.');
  return response.json();
}

export default function MultiStoreSwitcher({ currentStoreId }) {
  const menuId = useId();
  const [stores, setStores] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');
  // O storeId pode ser um ID legado diferente do slug. A origem visual
  // usa o hostname; a autorização de acesso continua exclusivamente no servidor.
  const hostSlug = window.location.hostname.toLowerCase().split('.')[0];
  const activeStoreId = Object.hasOwn(STORES, hostSlug) ? hostSlug : currentStoreId;
  const isPilot = Object.hasOwn(STORES, activeStoreId);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!isPilot) return undefined;
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!user) {
        if (active) { setStores([]); setAuthReady(false); }
        return;
      }
      if (active) setAuthReady(true);
      try {
        const token = await user.getIdToken();
        const response = await invoke('list', token);
        if (active) setStores(response.stores.filter(id => Object.hasOwn(STORES, id)));
      } catch {
        if (active) setStores([]);
      }
    });
    return () => { active = false; unsubscribe(); };
  }, [activeStoreId, isPilot]);

  const navigateTo = async target => {
    if (target === activeStoreId || switching) return;
    setError('');
    setSwitching(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Entre novamente na sua conta para alternar de loja.');
      const response = await invoke('issue', await user.getIdToken(), target);
      const destination = new URL(response.url);
      if (destination.protocol !== 'https:' || destination.hostname !== `${target}.velodelivery.com.br` ||
          destination.pathname !== '/admin' || !destination.hash.startsWith('#multistore-ticket=')) {
        throw new Error('Destino inválido');
      }
      window.location.assign(destination.href);
    } catch {
      setError('Não foi possível trocar de loja. Tente novamente.');
      setSwitching(false);
    }
  };

  if (!isPilot || !authReady) return null;


  return (
    <section className="w-full" data-testid="velo-multiloja" aria-label="Gestão de lojas">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[9px] uppercase tracking-[0.15em] font-black text-slate-400">Gestão multiloja</span>
        <span className="text-[9px] font-bold text-blue-600">{stores.length} {stores.length === 1 ? 'loja' : 'lojas'}</span>
      </div>

      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={menuId}
        onClick={() => setExpanded(value => !value)}
        className="group w-full flex items-center gap-2.5 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3 text-left shadow-sm transition-colors hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
          <Building2 size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[9px] font-black uppercase tracking-wider text-blue-600">Alternar loja</span>
          <span className="block truncate text-[12px] font-black text-slate-900">{STORES[activeStoreId]}</span>
        </span>
        {switching ? <Loader2 size={17} className="shrink-0 animate-spin text-blue-600" /> : (
          <ChevronDown size={17} className={`shrink-0 text-blue-600 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        )}
      </button>

      {expanded && (
        <div id={menuId} className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <p className="border-b border-slate-100 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-400">
            Escolha a unidade
          </p>
          {stores.length < 2 && (
            <p role="status" className="px-3 py-3 text-[11px] leading-relaxed text-slate-600">
              Vínculo multiloja em verificação. A conta precisa de permissão para as duas lojas.
            </p>
          )}
          {stores.map(id => (
            <button
              type="button"
              key={id}
              disabled={switching || id === activeStoreId}
              onClick={() => navigateTo(id)}
              aria-current={id === activeStoreId ? 'page' : undefined}
              className={`flex w-full items-center gap-2 border-b border-slate-50 px-3 py-3 text-left text-[12px] font-bold transition-colors last:border-b-0 hover:bg-blue-50 disabled:cursor-default ${id === activeStoreId ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
            >
              <span className="min-w-0 flex-1 truncate">{STORES[id]}</span>
              {id === activeStoreId && <Check size={16} className="shrink-0 text-blue-600" />}
            </button>
          ))}
          {error && <p role="alert" className="border-t border-red-100 px-3 py-2 text-[11px] text-red-600">{error}</p>}
        </div>
      )}
    </section>
  );
}
