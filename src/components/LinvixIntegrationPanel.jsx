import React, { useEffect, useMemo, useState } from 'react';
import { Database, RefreshCw, Save, CheckCircle, AlertTriangle, Link2, Unplug, Loader2 } from 'lucide-react';
import { authenticatedFetch } from '../utils/apiAuth';

const initialCredentials = {
  codigoLinvix: '',
  clientId: '',
  clientSecret: '',
};

const locationKey = (location) => String(location?.id || location?.code || location?.name || '');

const formatTimestamp = (value) => {
  if (!value) return 'Ainda não sincronizado';
  if (value?.toDate) return value.toDate().toLocaleString('pt-BR');
  if (value?._seconds) return new Date(value._seconds * 1000).toLocaleString('pt-BR');
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString('pt-BR');
  }
  return 'Sincronização registrada';
};

export default function LinvixIntegrationPanel({ storeId, settings }) {
  const saved = settings?.integrations?.linvix || {};
  const [credentials, setCredentials] = useState(initialCredentials);
  const [connected, setConnected] = useState(!!saved.connected);
  const [locations, setLocations] = useState(saved.availableLocations || []);
  const [selectedLocationId, setSelectedLocationId] = useState(locationKey(saved.selectedLocation));
  const [status, setStatus] = useState(saved);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null);
  const [catalogAudit, setCatalogAudit] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ordersPreview, setOrdersPreview] = useState(null);

  const selectedLocation = useMemo(
    () =>
      locations.find((location) => locationKey(location) === String(selectedLocationId)) ||
      (selectedLocationId && locationKey(saved.selectedLocation) === String(selectedLocationId) ? saved.selectedLocation : null),
    [locations, selectedLocationId, saved.selectedLocation]
  );

  useEffect(() => {
    setConnected(!!saved.connected);
    setLocations(saved.availableLocations || []);
    setStatus(saved);
    setSelectedLocationId(locationKey(saved.selectedLocation));
  }, [saved.connected, saved.availableLocations, saved.selectedLocation, saved.lastSyncAt]);

  const callLinvix = async (action, payload = {}) => {
    const response = await authenticatedFetch('/api/linvix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, storeId, ...payload }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Falha na integração Linvix.');
    }
    return data;
  };

  const runCatalogAudit = async () => {
    setBusy('preflight');
    setMessage(null);
    try {
      const result = await callLinvix('preflight');
      setCatalogAudit(result);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy('');
    }
  };

  useEffect(() => {
    if (!storeId) return;
    // A auditoria não usa a API Linvix e funciona antes de receber credenciais.
    let live = true;
    callLinvix('preflight').then((data) => {
      if (live) setCatalogAudit(data);
    }).catch(() => {});
    return () => { live = false; };
  }, [storeId]);

  const inspectOrders = async () => {
    setBusy('orders');
    setMessage(null);
    try {
      const data = await callLinvix('previewOrders');
      setOrdersPreview(data.preview);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy('');
    }
  };

  const connect = async () => {
    if (!credentials.codigoLinvix || !credentials.clientId || !credentials.clientSecret) {
      return setMessage({ type: 'error', text: 'Preencha Código Linvix/Emitente, Client ID e Client Secret.' });
    }

    setBusy('connect');
    setMessage(null);
    try {
      const data = await callLinvix('connect', credentials);
      setConnected(true);
      setLocations(data.locations || []);
      setSelectedLocationId('');
      setPreview(null);
      setCatalogAudit(null);
      setStatus((prev) => ({
        ...prev,
        connected: true,
        autoSyncEnabled: false,
        selectedLocation: null,
        lastSyncStats: null,
        lastSyncStatus: 'pending',
        healthStatus: 'healthy',
      }));
      setCredentials(initialCredentials);
      setMessage({
        type: 'success',
        text: `Conexão validada. ${(data.locations || []).length} estoque(s) local(is) encontrado(s).`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy('');
    }
  };

  const refreshLocations = async () => {
    setBusy('locations');
    setMessage(null);
    try {
      const data = await callLinvix('refreshLocations');
      setLocations(data.locations || []);
      setMessage({ type: 'success', text: 'Locais de estoque atualizados pela Linvix.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy('');
    }
  };

  const saveLocation = async () => {
    const location = locations.find(
      (item) => locationKey(item) === String(selectedLocationId)
    );

    if (!location) {
      return setMessage({ type: 'error', text: 'Selecione o estoque correspondente a esta unidade.' });
    }

    setBusy('saveLocation');
    setMessage(null);
    try {
      const data = await callLinvix('saveLocation', { selectedLocation: location });
      setPreview(null);
      setStatus((prev) => ({
        ...prev,
        selectedLocation: data.selectedLocation || location,
        lastSyncStats: null,
        lastSyncStatus: 'pending',
        autoSyncEnabled: false,
      }));
      setMessage({
        type: 'success',
        text: `Unidade vinculada ao estoque "${location.name}".`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy('');
    }
  };

  const previewSync = async () => {
    setBusy('preview');
    setMessage(null);
    try {
      const data = await callLinvix('previewSync');
      setPreview({ ...data.stats, expiresAt: Date.now() + 30 * 60 * 1000 });
      setMessage({
        type: data.stats?.unmatchedProducts ? 'warning' : 'success',
        text: 'Simulação concluída sem alterações no estoque. Revise os números antes de sincronizar.',
      });
    } catch (error) {
      setPreview(null);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy('');
    }
  };

  const syncNow = async () => {
    setBusy('sync');
    setMessage(null);
    try {
      const data = await callLinvix('sync');
      setPreview(null);
      setStatus((prev) => ({
        ...prev,
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: 'success',
        lastSyncStats: data.stats,
        healthStatus: 'healthy',
      }));

      setMessage({
        type: data.stats?.unmatchedProducts ? 'warning' : 'success',
        text: `Sincronização concluída: ${data.stats?.matchedProducts || 0} produtos encontrados e ${data.stats?.updatedProducts || 0} saldos atualizados.`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy('');
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Desconectar a Linvix desta unidade? O estoque da Velo deixará de receber atualizações do ERP.')) {
      return;
    }

    setBusy('disconnect');
    setMessage(null);
    try {
      await callLinvix('disconnect');
      setConnected(false);
      setLocations([]);
      setSelectedLocationId('');
      setStatus({ connected: false });
      setPreview(null);
      setCatalogAudit(null);
      setMessage({ type: 'success', text: 'Integração Linvix desconectada.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy('');
    }
  };

  const healthClass =
    status?.healthStatus === 'degraded'
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : connected
        ? 'bg-green-100 text-green-700 border-green-200'
        : 'bg-slate-100 text-slate-500 border-slate-200';

  return (
    <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col gap-6 hover:shadow-lg transition-all lg:col-span-2">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-4 bg-indigo-50 rounded-2xl">
            <Database className="text-indigo-600" size={40} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Linvix ERP</h3>
              <span className={`px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${healthClass}`}>
                {status?.healthStatus === 'degraded' ? 'Atenção' : connected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2 font-medium max-w-xl">
              Sincroniza o saldo disponível do Estoque Local da Linvix com esta unidade da Velo Delivery.
              Para o Mercado Monte Verde, configure cada painel individualmente e selecione o estoque exclusivo daquela unidade. Antes de gravar novos saldos, execute a simulação.
            </p>
          </div>
        </div>

        {connected && (
          <button
            type="button"
            onClick={disconnect}
            disabled={!!busy}
            className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 flex items-center gap-1 disabled:opacity-50"
          >
            <Unplug size={14} /> Desconectar
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col gap-3">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-700">Auditoria do catálogo desta loja</p>
            <p className="text-xs text-slate-500">Executada no Firebase, sem consumir chamadas à Linvix.</p>
          </div>
          <button type="button" onClick={runCatalogAudit} disabled={!!busy || !storeId}
            className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 font-black text-xs disabled:opacity-50">
            {busy === 'preflight' ? 'Verificando...' : 'Verificar cadastro'}
          </button>
        </div>
        {catalogAudit && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div><strong className="block text-base text-slate-800">{catalogAudit.catalog?.totalProducts ?? 0}</strong>Produtos da loja</div>
            <div><strong className="block text-base text-slate-800">{catalogAudit.catalog?.withBarcode ?? 0}</strong>Com EAN/GTIN</div>
            <div><strong className="block text-base text-slate-800">{catalogAudit.catalog?.withoutIdentifier ?? 0}</strong>Sem identificador</div>
            <div><strong className="block text-base text-slate-800">{(catalogAudit.catalog?.duplicatedBarcodes || 0) + (catalogAudit.catalog?.duplicatedLinvixCodes || 0)}</strong>Códigos duplicados</div>
            <p className="col-span-2 md:col-span-4 text-slate-600">
              {catalogAudit.credentialsConfigured ? 'Credenciais configuradas.' : 'Aguardando credenciais Linvix do cliente.'}
              {' '}O diagnóstico é individual por loja e não altera estoques.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col gap-3">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-700">Preparação de pedidos para o ERP</p>
            <p className="text-xs text-slate-500">Auditoria somente leitura. Não transmite pedidos nem movimenta estoque.</p>
          </div>
          <button type="button" onClick={inspectOrders} disabled={!!busy || !storeId}
            className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 font-black text-xs disabled:opacity-50">
            {busy === 'orders' ? 'Analisando...' : 'Analisar pedidos'}
          </button>
        </div>
        {ordersPreview && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div><strong className="block text-base text-slate-800">{ordersPreview.scanned || 0}</strong>Pedidos analisados</div>
              <div><strong className="block text-base text-slate-800">{ordersPreview.mappingCandidates || 0}</strong>Candidatos ao mapeamento</div>
              <div><strong className="block text-base text-slate-800">{ordersPreview.needReview || 0}</strong>Revisão necessária</div>
              <div><strong className="block text-base text-slate-800">{ordersPreview.ignored || 0}</strong>Não elegíveis</div>
            </div>
            <p className="text-xs text-amber-700 font-bold">
              {ordersPreview.paymentUnconfirmed || 0} com pagamento não confirmado,
              {' '}{ordersPreview.missingErpCodes || 0} com códigos ERP ausentes e
              {' '}{ordersPreview.incompleteItems || 0} com dados de itens incompletos.
              {ordersPreview.truncated && ' Resultado limitado aos primeiros 200 pedidos retornados.'}
            </p>
            <p className="text-xs text-slate-600">
              Exportação desativada até validar o esquema de pedidos e a baixa de estoque na Linvix.
              Esta análise não altera os pedidos existentes.
            </p>
          </>
        )}
      </div>

      {!connected ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={credentials.codigoLinvix}
            onChange={(e) => setCredentials((prev) => ({ ...prev, codigoLinvix: e.target.value.trim() }))}
            placeholder="Código Linvix / Emitente"
            className="p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500"
          />
          <input
            type="text"
            value={credentials.clientId}
            onChange={(e) => setCredentials((prev) => ({ ...prev, clientId: e.target.value.trim() }))}
            placeholder="Client ID"
            className="p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500"
          />
          <input
            type="password"
            value={credentials.clientSecret}
            onChange={(e) => setCredentials((prev) => ({ ...prev, clientSecret: e.target.value.trim() }))}
            placeholder="Client Secret"
            className="p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500"
          />
          <button
            type="button"
            onClick={connect}
            disabled={!!busy}
            className="md:col-span-3 py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy === 'connect' ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
            Conectar e localizar estoques
          </button>
          <p className="md:col-span-3 text-[10px] text-slate-400 font-bold">
            As credenciais são gravadas apenas no backend privado da Velo. O Client Secret não fica exposto no painel.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Estoque Linvix desta unidade
              </label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500"
              >
                <option value="">Selecione o Estoque Local...</option>
                {locations.map((location) => (
                  <option key={locationKey(location)} value={locationKey(location)}>
                    {location.name}{location.code ? ` — ${location.code}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={refreshLocations}
              disabled={!!busy}
              className="px-5 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy === 'locations' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Atualizar locais
            </button>

            <button
              type="button"
              onClick={saveLocation}
              disabled={!!busy || !selectedLocationId}
              className="px-5 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy === 'saveLocation' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Salvar vínculo
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase text-slate-400">Local vinculado</p>
              <p className="text-sm font-black text-slate-700 mt-1 truncate">
                {status?.selectedLocation?.name || selectedLocation?.name || 'Pendente'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase text-slate-400">Última sincronização</p>
              <p className="text-xs font-bold text-slate-700 mt-1">
                {formatTimestamp(status?.lastSyncAt)}
              </p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase text-slate-400">Produtos encontrados</p>
              <p className="text-xl font-black text-slate-800 mt-1">
                {status?.lastSyncStats?.matchedProducts ?? '—'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase text-slate-400">Sem correspondência</p>
              <p className="text-xl font-black text-slate-800 mt-1">
                {status?.lastSyncStats?.unmatchedProducts ?? '—'}
              </p>
            </div>
          </div>

          <div className={`flex items-start gap-3 p-4 rounded-2xl border ${
            status?.autoSyncEnabled === true
              ? 'bg-green-50 border-green-100 text-green-700'
              : 'bg-amber-50 border-amber-100 text-amber-700'
          }`}>
            {status?.autoSyncEnabled === true ? (
              <CheckCircle size={16} className="shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest">
                Automação: {status?.autoSyncEnabled === true ? 'Ativa' : 'Aguardando homologação'}
              </p>
              <p className="text-[10px] font-bold mt-1 leading-relaxed">
                {status?.autoSyncEnabled === true
                  ? 'O estoque desta unidade está habilitado para sincronização automática com a Linvix.'
                  : 'Primeiro validamos o saldo desta unidade e o fluxo de pedidos/baixa no ERP. Até lá, use a sincronização manual para homologação.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={previewSync}
            disabled={!!busy || !(status?.selectedLocation?.name || status?.selectedLocation?.id || selectedLocation?.name)}
            className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50"
          >
            {busy === 'preview' ? 'Simulando...' : 'Simular sincronização (sem alterar estoque)'}
          </button>
          {preview && (
            <div className="rounded-2xl p-4 border border-indigo-200 bg-indigo-50 text-xs text-slate-700">
              <p className="font-black uppercase mb-2">Resultado da simulação — só leitura</p>
              <p>{preview.matchedProducts} produtos correspondentes • {preview.updatedProducts} saldos seriam atualizados • {preview.unmatchedProducts} sem correspondência.</p>
              <p className="mt-2">A autorização para sincronização real expira em 30 minutos.</p>
            </div>
          )}
          <button
            type="button"
            onClick={syncNow}
            disabled={!!busy || !preview || preview.expiresAt < Date.now() || !(status?.selectedLocation?.name || selectedLocation?.name)}
            className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy === 'sync' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Sincronizar estoque agora
          </button>

          <div className="flex items-start gap-2 text-[10px] font-bold text-slate-500 bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
            <CheckCircle size={15} className="text-indigo-600 shrink-0 mt-0.5" />
            A Velo usa o <strong>estoque disponível</strong> retornado pela Linvix. O vínculo de produtos é feito primeiro pelo código de barras/GTIN; produtos sem correspondência ficam sinalizados para ajuste.
          </div>
        </div>
      )}

      {message && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-start gap-2 ${
            message.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-100'
              : message.type === 'warning'
                ? 'bg-amber-50 text-amber-700 border-amber-100'
                : 'bg-green-50 text-green-700 border-green-100'
          }`}
        >
          {message.type === 'error' || message.type === 'warning' ? (
            <AlertTriangle size={16} className="shrink-0" />
          ) : (
            <CheckCircle size={16} className="shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {status?.lastError && !message && (
        <div className="p-4 rounded-2xl border bg-amber-50 text-amber-700 border-amber-100 text-xs font-bold flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{status.lastError}</span>
        </div>
      )}
    </div>
  );
}
