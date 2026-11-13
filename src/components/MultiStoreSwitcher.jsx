import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Building2, ChevronDown, Loader2 } from 'lucide-react';
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
  const [stores, setStores] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');
  const isPilot = Object.hasOwn(STORES, currentStoreId);

  useEffect(() => {
    if (!isPilot) return undefined;
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!user) { if (active) setStores([]); return; }
      try {
        const token = await user.getIdToken();
        const response = await invoke('list', token);
        if (active) setStores(response.stores.filter(id => Object.hasOwn(STORES, id)));
      } catch {
        if (active) setStores([]);
      }
    });
    return () => { active = false; unsubscribe(); };
  }, [currentStoreId, isPilot]);

  const navigateTo = async target => {
    if (target === currentStoreId || switching) return;
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

  if (!isPilot || stores.length < 2) return null;

  return (
    <div className="fixed z-[100] top-3 right-3 max-w-[calc(100vw-1.5rem)]" data-testid="velo-multiloja">
      <div className="rounded-xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur-md overflow-hidden w-56">
        <button type="button" aria-expanded={expanded} aria-controls="velo-store-menu"
          onClick={() => setExpanded(value => !value)}
          className="flex items-center w-full gap-2 px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">
          <Building2 size={17} className="text-blue-600 shrink-0" />
          <span className="truncate flex-1 text-left">Minhas lojas</span>
          {switching ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={16} className={expanded ? 'rotate-180' : ''} />}
        </button>
        {expanded && <div id="velo-store-menu" className="border-t border-slate-100 py-1">
          {stores.map(id => (
            <button type="button" key={id} disabled={switching} onClick={() => navigateTo(id)}
              aria-current={id === currentStoreId ? 'page' : undefined}
              className={`flex items-center gap-2 w-full text-sm text-left px-3 py-2 hover:bg-blue-50 disabled:opacity-60 ${id === currentStoreId ? 'text-blue-700 bg-blue-50 font-bold' : 'text-slate-700'}`}>
              <span className="flex-1">{STORES[id]}</span>
              {id === currentStoreId && <span className="text-xs">Atual</span>}
            </button>
          ))}
          {error && <p role="alert" className="px-3 py-2 text-xs text-red-600">{error}</p>}
        </div>}
      </div>
    </div>
  );
}
