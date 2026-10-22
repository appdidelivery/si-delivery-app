import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const refresh = async (deep = false) => {
    setError('');
    setChecking(true);
    try {
      const response = await authenticatedFetch('/api/marketing-automation-status?storeId=csi' + (deep ? '&details=1' : ''), {
        method: 'GET', headers: { 'Cache-Control': 'no-cache' }
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Falha no diagnóstico.');
      setStatus(json);
    } catch (e) {
      setError(e.message);
    } finally { setChecking(false); }
  };
  useEffect(() => { void refresh(); }, []);

  return <main className="min-h-screen bg-slate-50 px-4 py-8">
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to="/admin" className="font-bold text-blue-700">← Voltar ao painel</Link>
      <h1 className="text-2xl font-black text-slate-900">Diagnóstico WhatsApp Marketing — CSI</h1>
      <p className="text-sm text-slate-600">Consulta de leitura: não dispara mensagens, não altera automações e não acessa tokens do WhatsApp.</p>
      <>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => refresh(false)} disabled={checking}
              className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white disabled:opacity-50">
              {checking ? 'Consultando...' : 'Atualizar diagnóstico'}
            </button>
            <button type="button" onClick={() => refresh(true)} disabled={checking}
              className="rounded-xl bg-green-700 px-5 py-3 font-bold text-white disabled:opacity-50">
              {checking ? 'Analisando elegibilidade...' : 'Verificar bloqueios e templates (sem enviar)'}
            </button>
          </div>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
          {status?.diagnosticError && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-800">{status.diagnosticError}</p>}
          {status?.readiness && <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="text-xl font-black text-slate-900">Elegibilidade real — sem disparar mensagens</h2>
            <p className="text-sm text-slate-600">
              Contagem por fluxo a partir dos dados disponíveis. Apenas clientes com consentimento válido e
              maiores de 18 anos entram na lista; bloqueios e descadastros continuam excluídos.
            </p>
            {[
              ['Carrinhos abandonados com 30+ minutos', status.readiness.abandoned],
              ['Pós-venda de pedidos concluídos nas últimas 48h', status.readiness.postSale],
              ['Incentivo à segunda compra', status.readiness.secondPurchase],
              ['Retenção 30/60/90 dias', status.readiness.retention]
            ].map(([name, data]) => <div key={name} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="font-bold text-slate-900">{name}</p>
              <p className="mt-1 text-lg font-black text-green-700">Aptos: {data.eligibleNow}</p>
              <p className="text-sm text-slate-600">
                Examinados: {data.examined} · Sem autorização/18+: {data.missingConsentOrAdult} ·
                Bloqueados: {data.blocked} · Já tratados: {data.alreadySent} · Ainda fora da janela: {data.notDue}
              </p>
            </div>)}
            <div className="text-sm text-slate-700">
              <p>Consentimentos expressos válidos recebidos no WhatsApp: <strong>{status.readiness.validWhatsAppConsents}</strong></p>
              <p>Contatos bloqueados ou descadastrados: <strong>{status.readiness.blockedOrOptoutPhones}</strong></p>
              {status.readiness.partialScan && <p className="font-semibold text-amber-800">
                A amostra atingiu o limite de consulta. Os totais podem estar incompletos.
              </p>}
              <p className="mt-2 text-slate-500">{status.readiness.note}</p>
            </div>
          </section>}
          {status?.templateAudit && <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="text-xl font-black text-slate-900">Templates oficiais da Meta</h2>
            <p className="text-sm text-slate-600">{status.templateAudit.source === 'meta'
              ? 'Status consultado na conta WhatsApp Business.'
              : 'Não foi possível confirmar o status diretamente na Meta nesta consulta. É necessário conferir a WABA e as permissões.'}</p>
            <div className="space-y-2">
              {status.templateAudit.templates.map(t => <div key={t.name}
                className="flex flex-wrap justify-between gap-3 border-b border-slate-100 py-2 text-sm">
                <code className="break-all text-slate-800">{t.name}</code>
                <strong className={t.status === 'APPROVED' ? 'text-green-700' : 'text-amber-700'}>
                  {t.status}
                </strong>
              </div>)}
            </div>
            {status.templateAudit.partial && <p className="text-amber-700 text-sm">A conta possui mais modelos do que o limite consultado.</p>}
          </section>}
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
      </>
    </div>
  </main>;
}
