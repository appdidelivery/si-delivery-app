import React, { useMemo, useState } from 'react';
import { MapPin, Search, Store, ChevronRight, Loader2 } from 'lucide-react';

const normalizeCep = (value = '') => String(value).replace(/\D/g, '').slice(0, 8);

const formatCep = (value = '') => {
  const digits = normalizeCep(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const cepToNumber = (value) => {
  const digits = normalizeCep(value);
  return digits.length === 8 ? Number(digits) : null;
};

const unitMatchesCep = (unit, cep) => {
  const numericCep = cepToNumber(cep);
  if (numericCep === null) return false;

  const ranges = Array.isArray(unit.cepRanges) && unit.cepRanges.length
    ? unit.cepRanges
    : (unit.cepStart || unit.cepEnd)
      ? [{ start: unit.cepStart, end: unit.cepEnd }]
      : [];

  if (!ranges.length) return false;

  return ranges.some((range) => {
    const start = cepToNumber(range?.start);
    const end = cepToNumber(range?.end);
    if (start === null || end === null) return false;
    return numericCep >= Math.min(start, end) && numericCep <= Math.max(start, end);
  });
};

export default function MultiStoreGateway({ config, currentStore }) {
  const units = useMemo(
    () => (Array.isArray(config?.units) ? config.units.filter((unit) => unit?.enabled !== false) : []),
    [config]
  );

  const mode = config?.routingMode || 'hybrid';
  const [cep, setCep] = useState('');
  const [recommendedUnits, setRecommendedUnits] = useState([]);
  const [searched, setSearched] = useState(false);
  const [redirectingId, setRedirectingId] = useState(null);
  const [error, setError] = useState('');

  const remembered = useMemo(() => {
    if (!config?.rememberSelection || typeof window === 'undefined') return null;
    try {
      const savedId = localStorage.getItem(`velo:multiloja:${currentStore?.id || currentStore?.slug || 'store'}`);
      return units.find((unit) => unit.storeId === savedId) || null;
    } catch {
      return null;
    }
  }, [config?.rememberSelection, currentStore?.id, currentStore?.slug, units]);

  const goToUnit = (unit) => {
    if (!unit) return;
    setRedirectingId(unit.storeId || unit.frontendUrl || unit.name);

    try {
      if (config?.rememberSelection && unit.storeId) {
        localStorage.setItem(
          `velo:multiloja:${currentStore?.id || currentStore?.slug || 'store'}`,
          unit.storeId
        );
      }
    } catch {
      // O redirecionamento deve continuar mesmo se o navegador bloquear localStorage.
    }

    const fallbackSlug = unit.storeId || unit.slug;
    let target = unit.frontendUrl?.trim();

    if (!target && fallbackSlug) {
      target = `https://${fallbackSlug}.velodelivery.com.br`;
    }

    if (!target) {
      setError('Esta unidade ainda não possui um endereço de loja configurado.');
      setRedirectingId(null);
      return;
    }

    try {
      const url = new URL(target, window.location.origin);
      const currentSlug = currentStore?.slug || currentStore?.id;

      // Quando a unidade selecionada é a mesma que hospeda o Hub,
      // usamos um parâmetro de bypass para abrir o catálogo e evitar loop no seletor.
      if (
        url.origin === window.location.origin &&
        fallbackSlug &&
        currentSlug &&
        fallbackSlug === currentSlug &&
        !url.searchParams.get('loja')
      ) {
        url.searchParams.set('loja', fallbackSlug);
      }

      window.location.assign(url.toString());
    } catch {
      window.location.assign(target);
    }
  };

  const handleCepSearch = () => {
    setError('');
    const cleanCep = normalizeCep(cep);

    if (cleanCep.length !== 8) {
      setError('Digite um CEP válido com 8 números.');
      return;
    }

    const matches = units.filter((unit) => unitMatchesCep(unit, cleanCep));
    setRecommendedUnits(matches);
    setSearched(true);

    if (matches.length === 1 && mode === 'cep') {
      goToUnit(matches[0]);
    }
  };

  const showManualList = mode === 'manual' || mode === 'hybrid';

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      <main className="w-full max-w-lg min-h-screen bg-white shadow-xl">
        <header className="px-6 pt-8 pb-6 border-b border-slate-100 text-center">
          {currentStore?.logoUrl || currentStore?.storeLogoUrl ? (
            <img
              src={currentStore.logoUrl || currentStore.storeLogoUrl}
              alt={config?.networkName || currentStore?.name || 'Loja'}
              className="w-20 h-20 rounded-2xl object-contain mx-auto mb-4 border border-slate-100 bg-white"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-4">
              <Store size={30} />
            </div>
          )}
          <h1 className="text-2xl font-black text-slate-900">
            {config?.networkName || currentStore?.name || 'Escolha sua loja'}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            {config?.subtitle || 'Informe seu CEP ou escolha a unidade onde deseja comprar.'}
          </p>
        </header>

        <section className="p-6 space-y-6">
          {remembered && (
            <button
              type="button"
              onClick={() => goToUnit(remembered)}
              className="w-full rounded-2xl border border-blue-100 bg-blue-50 p-4 text-left flex items-center justify-between hover:bg-blue-100 transition"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Última unidade</p>
                <p className="font-black text-slate-900 mt-1">{remembered.name}</p>
              </div>
              <ChevronRight className="text-blue-600" />
            </button>
          )}

          {mode !== 'manual' && (
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={18} className="text-blue-600" />
                <h2 className="font-black text-slate-900">Onde você quer receber?</h2>
              </div>

              <div className="flex gap-2">
                <input
                  value={formatCep(cep)}
                  onChange={(event) => {
                    setCep(event.target.value);
                    setError('');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleCepSearch();
                  }}
                  inputMode="numeric"
                  placeholder="Digite seu CEP"
                  className="flex-1 min-w-0 rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleCepSearch}
                  className="rounded-xl bg-blue-600 text-white px-4 py-3 font-bold hover:bg-blue-700 transition"
                  aria-label="Buscar unidade pelo CEP"
                >
                  <Search size={20} />
                </button>
              </div>

              {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

              {searched && !error && (
                <div className="mt-4">
                  {recommendedUnits.length > 0 ? (
                    <>
                      <p className="text-xs font-bold uppercase tracking-wide text-emerald-600 mb-2">
                        {recommendedUnits.length === 1 ? 'Unidade encontrada' : 'Unidades que atendem seu CEP'}
                      </p>
                      <div className="space-y-2">
                        {recommendedUnits.map((unit) => (
                          <button
                            key={unit.storeId || unit.name}
                            type="button"
                            onClick={() => goToUnit(unit)}
                            className="w-full rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left flex items-center justify-between"
                          >
                            <div>
                              <p className="font-black text-slate-900">{unit.name}</p>
                              {unit.description && <p className="text-xs text-slate-500 mt-1">{unit.description}</p>}
                            </div>
                            {redirectingId === (unit.storeId || unit.frontendUrl || unit.name)
                              ? <Loader2 className="animate-spin text-emerald-600" size={20} />
                              : <ChevronRight className="text-emerald-600" size={20} />}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-600">
                      {mode === 'cep'
                        ? 'Não encontramos uma unidade configurada para este CEP. Confira o CEP e tente novamente.'
                        : 'Não encontramos uma unidade automática para este CEP. Você pode escolher uma loja abaixo.'}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {showManualList && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">
                {mode === 'manual' ? 'Escolha uma unidade' : 'Ou escolha manualmente'}
              </p>

              <div className="space-y-3">
                {units.map((unit) => (
                  <button
                    key={unit.storeId || unit.name}
                    type="button"
                    onClick={() => goToUnit(unit)}
                    className="w-full rounded-2xl border border-slate-200 p-4 text-left flex items-center justify-between hover:border-blue-300 hover:bg-slate-50 transition"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-black text-slate-900 truncate">{unit.name || unit.storeId}</p>
                      {unit.description && <p className="text-sm text-slate-500 mt-1">{unit.description}</p>}
                    </div>
                    {redirectingId === (unit.storeId || unit.frontendUrl || unit.name)
                      ? <Loader2 className="animate-spin text-blue-600 shrink-0" size={20} />
                      : <ChevronRight className="text-slate-400 shrink-0" size={20} />}
                  </button>
                ))}
              </div>

              {!units.length && (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                  Nenhuma unidade foi configurada ainda.
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
