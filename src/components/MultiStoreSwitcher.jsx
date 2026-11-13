import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Building2, ChevronDown, ExternalLink } from 'lucide-react';
import { auth, db } from '../services/firebase';

const PILOT_STORES = [
  { id: 'lovepicados', name: 'Love Picados' },
  { id: 'xisdale', name: 'Xis da Lê' },
];

// Não usar e-mail como prova de autorização. O vínculo é conferido pelo UID
// proprietário ou pelas claims administrativas verificadas do Firebase Auth.
export default function MultiStoreSwitcher({ currentStoreId }) {
  const [authorizedStores, setAuthorizedStores] = useState([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!PILOT_STORES.some(item => item.id === currentStoreId)) return undefined;
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!user) {
        if (active) setAuthorizedStores([]);
        return;
      }
      try {
        const token = await getIdTokenResult(user);
        const isSuperAdmin = token.claims.admin === true || token.claims.superAdmin === true;
        const snapshots = await Promise.all(PILOT_STORES.map(async item => {
          try {
            return { ...item, snapshot: await getDoc(doc(db, 'stores', item.id)) };
          } catch {
            return { ...item, snapshot: null };
          }
        }));
        if (!active) return;
        const accessible = snapshots.filter(item =>
          item.snapshot?.exists() &&
          (isSuperAdmin || item.snapshot.data().ownerUid === user.uid)
        ).map(({ id, name }) => ({ id, name }));
        setAuthorizedStores(accessible);
      } catch {
        if (active) setAuthorizedStores([]);
      }
    });
    return () => { active = false; unsubscribe(); };
  }, [currentStoreId]);

  if (authorizedStores.length < 2) return null;

  return (
    <div className="fixed z-[100] top-3 right-3 max-w-[calc(100vw-1.5rem)]" data-testid="velo-multiloja">
      <div className="rounded-xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur-md overflow-hidden w-56">
        <button type="button" aria-expanded={expanded} aria-controls="velo-store-menu"
          onClick={() => setExpanded(value => !value)}
          className="flex items-center w-full gap-2 px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">
          <Building2 size={17} className="text-blue-600 shrink-0" />
          <span className="truncate flex-1 text-left">Minhas lojas</span>
          <ChevronDown size={16} className={expanded ? 'rotate-180' : ''} />
        </button>
        {expanded && (
          <div id="velo-store-menu" className="border-t border-slate-100 py-1">
            {authorizedStores.map(item => (
              <a key={item.id} href={`https://${item.id}.velodelivery.com.br/admin`}
                aria-current={item.id === currentStoreId ? 'page' : undefined}
                className={`flex items-center gap-2 text-sm px-3 py-2 hover:bg-blue-50 ${item.id === currentStoreId ? 'text-blue-700 bg-blue-50 font-bold' : 'text-slate-700'}`}>
                <span className="flex-1">{item.name}</span>
                {item.id === currentStoreId ? <span className="text-xs">Atual</span> : <ExternalLink size={14} />}
              </a>
            ))}
            <p className="px-3 pt-2 pb-1 text-[11px] leading-4 text-slate-500">
              A troca de subdomínio pode solicitar novo login.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
