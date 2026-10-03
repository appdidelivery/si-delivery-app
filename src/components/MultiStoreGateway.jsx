import React, { useMemo, useState } from 'react';
import { MapPin, Search, Store, ChevronRight, Loader2, LocateFixed, Navigation } from 'lucide-react';

const toNumber = (value) => {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const calculateDistanceKm = (lat1, lng1, lat2, lng2) => {
  const aLat = toNumber(lat1);
  const aLng = toNumber(lng1);
  const bLat = toNumber(lat2);
  const bLng = toNumber(lng2);

  if ([aLat, aLng, bLat, bLng].some((value) => value === null)) return null;

  const R = 6371;
  const dLat = (bLat - aLat) * (Math.PI / 180);
  const dLng = (bLng - aLng) * (Math.PI / 180);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const h =
    sinLat * sinLat +
    Math.cos(aLat * (Math.PI / 180)) *
      Math.cos(bLat * (Math.PI / 180)) *
      sinLng * sinLng;

  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const formatDistance = (distance) => {
  if (!Number.isFinite(distance)) return '';
  if (distance < 1) return `${Math.round(distance * 1000)} m`;
  return `${distance.toFixed(1).replace('.', ',')} km`;
};

export default function MultiStoreGateway({ config, currentStore }) {
  const units = useMemo(
    () => (Array.isArray(config?.units) ? config.units.filter((unit) => unit?.enabled !== false) : []),
    [config]
  );

  // Compatibilidade com a primeira versão experimental que usava "cep".
  const configuredMode = config?.routingMode || 'hybrid';
  const mode = configuredMode === 'cep' ? 'geo' : configuredMode;

  const [address, setAddress] = useState('');
  const [recommendedUnits, setRecommendedUnits] = useState([]);
  const [searched, setSearched] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [redirectingId, setRedirectingId] = useState(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  const remembered = useMemo(() => {
    if (!config?.rememberSelection || typeof window === 'undefined') return null;

    try {
      const savedId = localStorage.getItem(
        `velo:multiloja:${currentStore?.id || currentStore?.slug || 'store'}`
      );
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
      setError('Esta unidade ainda não possui um endereço público configurado.');
      setRedirectingId(null);
      return;
    }

    try {
      const url = new URL(target, window.location.origin);
      const currentSlug = currentStore?.slug || currentStore?.id;

      // Quando a unidade escolhida é a mesma que hospeda o Hub,
      // o parâmetro libera o catálogo e evita um loop no seletor.
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

  const resolveCoordinates = (lat, lng, label = '') => {
    setError('');

    const ranked = units
      .map((unit) => {
        const distanceKm = calculateDistanceKm(lat, lng, unit.lat, unit.lng);
        const radiusKm = toNumber(unit.radiusKm);

        return {
          ...unit,
          distanceKm,
          radiusKm,
          eligible:
            distanceKm !== null &&
            radiusKm !== null &&
            radiusKm > 0 &&
            distanceKm <= radiusKm,
        };
      })
      .filter((unit) => unit.eligible)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    setRecommendedUnits(ranked);
    setResolvedAddress(label);
    setSearched(true);

    if (!ranked.length) {
      setError(
        'Ainda não encontramos uma unidade atendendo este ponto. Confira o endereço ou escolha uma unidade manualmente.'
      );
    }
  };

  const handleAddressSearch = async () => {
    const cleanAddress = address.trim();
    setError('');

    if (cleanAddress.length < 5) {
      setError('Digite rua, número e bairro para localizarmos seu endereço com mais precisão.');
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError('A busca por endereço está indisponível no momento. Use sua localização ou escolha uma unidade.');
      return;
    }

    setLocating(true);

    try {
      const query = cleanAddress.toLowerCase().includes('brasil')
        ? cleanAddress
        : `${cleanAddress}, Brasil`;

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`
      );
      const data = await response.json();

      if (data.status !== 'OK' || !data.results?.[0]) {
        setSearched(false);
        setRecommendedUnits([]);
        setError('Não conseguimos localizar esse endereço. Inclua rua, número, bairro e cidade.');
        return;
      }

      const result = data.results[0];
      resolveCoordinates(
        result.geometry.location.lat,
        result.geometry.location.lng,
        result.formatted_address || cleanAddress
      );
    } catch (geoError) {
      console.warn('Falha ao geocodificar endereço no MultiLojas:', geoError);
      setError('Não foi possível localizar o endereço agora. Tente novamente ou use sua localização.');
    } finally {
      setLocating(false);
    }
  };

  const handleCurrentLocation = () => {
    setError('');

    if (!navigator.geolocation) {
      setError('Seu navegador não disponibilizou localização. Digite seu endereço ou escolha uma unidade.');
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolveCoordinates(
          position.coords.latitude,
          position.coords.longitude,
          'Sua localização atual'
        );
        setLocating(false);
      },
      (geoError) => {
        console.warn('Permissão/localização indisponível no MultiLojas:', geoError);
        setLocating(false);
        setError('Não conseguimos acessar sua localização. Digite o endereço ou escolha uma unidade.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
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
            {config?.subtitle || 'Informe seu endereço e encontraremos a melhor unidade para você.'}
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
                  value={address}
                  onChange={(event) => {
                    setAddress(event.target.value);
                    setError('');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleAddressSearch();
                  }}
                  placeholder="Rua, número, bairro e cidade"
                  autoComplete="street-address"
                  className="flex-1 min-w-0 rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddressSearch}
                  disabled={locating}
                  className="rounded-xl bg-blue-600 text-white px-4 py-3 font-bold hover:bg-blue-700 transition disabled:opacity-60"
                  aria-label="Localizar endereço"
                >
                  {locating ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleCurrentLocation}
                disabled={locating}
                className="mt-3 w-full rounded-xl border border-blue-200 bg-blue-50 text-blue-700 px-4 py-3 font-black flex items-center justify-center gap-2 hover:bg-blue-100 disabled:opacity-60"
              >
                {locating ? <Loader2 className="animate-spin" size={18} /> : <LocateFixed size={18} />}
                Usar minha localização
              </button>

              {searched && resolvedAddress && (
                <p className="text-xs text-slate-500 mt-3 flex items-start gap-1.5">
                  <Navigation size={14} className="shrink-0 mt-0.5" />
                  <span>{resolvedAddress}</span>
                </p>
              )}

              {error && <p className="text-sm text-amber-700 mt-3">{error}</p>}

              {searched && recommendedUnits.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-600 mb-2">
                    Melhor unidade para você
                  </p>

                  <div className="space-y-2">
                    {recommendedUnits.map((unit, index) => (
                      <button
                        key={unit.storeId || unit.name}
                        type="button"
                        onClick={() => goToUnit(unit)}
                        className={
                          index === 0
                            ? 'w-full rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-left flex items-center justify-between'
                            : 'w-full rounded-xl border border-slate-200 bg-white p-4 text-left flex items-center justify-between'
                        }
                      >
                        <div className="min-w-0 pr-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-slate-900">{unit.name}</p>
                            {index === 0 && (
                              <span className="text-[10px] uppercase tracking-wide font-black rounded-full bg-emerald-600 text-white px-2 py-1">
                                Mais próxima
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 mt-1">
                            {formatDistance(unit.distanceKm)} de distância
                            {unit.radiusKm ? ` • atende até ${String(unit.radiusKm).replace('.', ',')} km` : ''}
                          </p>

                          {unit.description && (
                            <p className="text-xs text-slate-500 mt-1">{unit.description}</p>
                          )}
                        </div>

                        {redirectingId === (unit.storeId || unit.frontendUrl || unit.name)
                          ? <Loader2 className="animate-spin text-emerald-600 shrink-0" size={20} />
                          : <ChevronRight className="text-emerald-600 shrink-0" size={20} />}
                      </button>
                    ))}
                  </div>
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
                      {unit.address && <p className="text-xs text-slate-400 mt-1 truncate">{unit.address}</p>}
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
