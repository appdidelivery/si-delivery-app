import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { authenticatedFetch } from '../utils/apiAuth';

function Metric({ title, enabled, detail }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-bold text-slate-900">{title}</h2>
      <span className={enabled ? 'font-bold text-green-700' : 'font-bold text-amber-700'}>
        {enabled ? 'Configurada' : 'Desligada/pendente'}
      </span>
    </div>
    <p className="mt-2 text-sm text-slate-600">{detail}</p>
  </div>;
}

export default function MarketingAutomationStatus() {
  const { store, loading } = useStore();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const storeId = store?.id;
  const refresh = async () => {
    setError('');
    setChecking(true);
    try {
      const response = await authenticatedFetch('/api/marketing-automation-status?storeId=csi', {
        method: 'GET', headers: { 'Cache-Control': 'no-cache' }
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Falha no diagnóstico.');
      setStatus(json);
    } catch (e) {
      setError(e.message);
    } finally { setChecking(false); }
  };
  useEffect(() => { if (storeId === 'csi') void refresh(); }, [storeId]);

  return <main className="min-h-screen bg-slate-50 px-4 py-8">
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to="/admin" className="font-bold text-blue-700">← Voltar ao painel</Link>
      <h1 className="text-2xl font-black text-slate-900">Diagnóstico WhatsApp Marketing — CSI</h1>
      <p className="text-sm text-slate-600">Consulta de leitura: não dispara mensagens, não altera automações e não acessa tokens do WhatsApp.</p>
      {loading ? <p>Identificando loja...</p> : storeId !== 'csi'
        ? <p className="rounded-xl bg-amber-50 p-5 text-amber-800">Entre pelo painel da Conveniência Santa Isabel.</p>
        : <>
          <button type="button" onClick={refresh} disabled={checking}
            className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white disabled:opacity-50">
            {checking ? 'Consultando...' : 'Atualizar diagnóstico'}
          </button>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
          {status && <div className="space-y-3">
            <Metric title="Cloud API nativa" enabled={status.nativeCloudApi === 'credentials_present'}
              detail="Presença de identificação e credencial da Meta; não confirma entrega." />
            <Metric title="Carrinho abandonado / pós-venda / segunda compra"
              enabled={status.journeys.codeEnabled}
              detail={status.journeys.explicitlyEnabled
                ? 'Habilitação explícita no Firestore.'
                : status.journeys.disabled ? 'Desabilitada no Firestore.' : 'Sem flag explícita: o código atual habilita por padrão quando há credenciais.'} />
            <Metric title="Retenção 30/60/90 e ocasiões"
              enabled={status.retention.codeEnabled}
              detail={status.retention.explicitlyEnabled
                ? 'Habilitação explícita no Firestore.'
                : status.retention.disabled ? 'Desabilitada no Firestore.' : 'Sem flag explícita: depende da elegibilidade dos clientes e horários.'} />
            <Metric title="Alertas futebol" enabled={status.football.explicitlyEnabled && status.football.policyCleared && status.football.templateConfigured}
              detail="Exigem autorização específica, revisão de política e template aprovado." />
            <div className="rounded-2xl bg-white p-5">
              <p className="font-bold">Tentativas de marketing registradas hoje: {status.attemptsToday}</p>
              <p className="mt-2 text-sm text-slate-600">Dia {status.localDate}. A Meta pode aceitar uma mensagem sem entregá-la; confirme status de entrega no histórico.</p>
            </div>
          </div>}
        </>}
    </div>
  </main>;
}
