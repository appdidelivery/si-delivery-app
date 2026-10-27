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
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [wabaInput, setWabaInput] = useState('');
  const [wabaBusy, setWabaBusy] = useState(false);
  const [wabaResult, setWabaResult] = useState(null);
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
  const inviteRecent = async () => {
    if (checking || inviting) return;
    if (!window.confirm('Enviar um convite com botões Aceito / Não aceito somente a clientes que escreveram para a Santa Isabel nas últimas 24 horas e ainda não responderam? Máximo 20 convites por execução. Nenhuma campanha promocional será enviada.')) return;
    setInviting(true);
    setInviteResult(null);
    setError('');
    try {
      const response = await authenticatedFetch('/api/whatsapp-send', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({action:'csi_consent_invite',storeId:'csi',maxRecipients:20})
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha no convite de consentimento.');
      setInviteResult(data);
      await refresh(true);
    } catch(e) {
      setError(e.message);
    } finally { setInviting(false); }
  };
  const linkWaba = async () => {
    if (wabaBusy || !/^[0-9]{6,30}$/.test(wabaInput.trim())) {
      setError('Informe o WABA ID numérico, encontrado nas Configurações da Meta.');
      return;
    }
    if (!window.confirm('Verificar na Meta se a WABA informada contém o número da Santa Isabel? Apenas o identificador será salvo após validação; token e telefone permanecem inalterados.')) return;
    setWabaBusy(true);
    setError('');
    setWabaResult(null);
    try {
      const resp = await authenticatedFetch('/api/csi-whatsapp-waba-link', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({wabaId:wabaInput.trim()})
      });
      const data = await resp.json();
      if (!resp.ok || !data.verified) throw new Error(data.error || 'Não foi possível validar a WABA.');
      setWabaResult(data.message);
      setWabaInput('');
      await refresh(true);
    } catch(err) { setError(err.message); }
    finally { setWabaBusy(false); }
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
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 space-y-3">
            <h2 className="font-black text-blue-950 text-lg">Pedir autorização de promoções pelo WhatsApp</h2>
            <p className="text-sm text-blue-950">Envia dois botões: <strong>Sou 18+ e aceito</strong> ou <strong>Não aceito</strong>. Apenas para contatos que escreveram à loja nas últimas 24 horas, sem autorização anterior e sem bloqueio. A escolha será registrada automaticamente. Não é um disparo de ofertas.</p>
            <button type="button" disabled={inviting || checking} onClick={inviteRecent}
              className="rounded-xl bg-blue-700 px-5 py-3 text-white font-bold disabled:opacity-50">
              {inviting ? 'Enviando convites...' : 'Enviar convites para conversas abertas (até 20)'}
            </button>
            {inviteResult && <div role="status" className="text-sm text-blue-950">
              <p><strong>Aceitos pela Meta: {inviteResult.sent || 0}</strong> · Recusados: {inviteResult.failed || 0} · Ignorados por regras: {inviteResult.skipped || 0}</p>
              <p>Conversas recentes encontradas: {inviteResult.recentConversations || 0}. Aceitação pela Meta não garante entrega ao celular; confirme os recibos no atendimento.</p>
              {inviteResult.truncated && <p className="font-bold text-amber-800">A consulta atingiu o limite de registros.</p>}
              {inviteResult.errors?.length > 0 && <p className="text-amber-800">Ocorreram erros de API. Consulte os logs de produção para detalhes.</p>}
            </div>}
          </section>
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
                Examinados: {data.examined} · Sem telefone válido: {data.missingPhone} · Sem autorização/18+: {data.missingConsentOrAdult} ·
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
          {status?.receiptError && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-800">{status.receiptError}</p>}
          {status?.receiptAudit && <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="text-xl font-black text-slate-900">Entrega dos convites (últimas 48h)</h2>
            <p className="text-sm text-slate-600">Estatísticas dos convites de autorização enviados pelo canal oficial. O aceite da API não significa entrega.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ['Aceitos pela API',status.receiptAudit.accepted],
                ['Entregues',status.receiptAudit.delivered],
                ['Lidos',status.receiptAudit.read],
                ['Não entregues / falhas',status.receiptAudit.failed],
                ['Enviados sem recibo de entrega',status.receiptAudit.pendingDelivery],
                ['Sem ID de rastreamento',status.receiptAudit.withoutMessageId]
              ].map(([name,value])=><div key={name} className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-600">{name}</p>
                <p className="text-xl font-black text-slate-900">{value}</p>
              </div>)}
            </div>
            <p className="text-sm text-slate-600">Entregues e lidos são contados separadamente: a Meta pode registrar o status final como apenas “lido”. O painel nunca envia mensagens ao consultar estes dados.</p>
            {status.receiptAudit.partialScan && <p className="font-semibold text-amber-800 text-sm">A consulta atingiu o limite de registros e pode estar incompleta.</p>}
          </section>}
          {status?.templateAudit && <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="text-xl font-black text-slate-900">Templates oficiais da Meta</h2>
            {status.templateAudit.source === 'waba_not_available' && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-sm font-bold text-amber-950">Falta identificar a conta WhatsApp Business (WABA) da Santa Isabel.</p>
              <p className="text-sm text-amber-900">Em Meta Business Suite → Configurações → Contas → Contas do WhatsApp, copie o ID da conta que contém o número já ativo. Não use o ID do telefone nem o ID do aplicativo.</p>
              <div className="flex flex-wrap items-center gap-2">
                <input aria-label="ID da conta WhatsApp Business (WABA)" type="text"
                  inputMode="numeric" pattern="[0-9]*" value={wabaInput}
                  onChange={event=>setWabaInput(event.target.value.replace(/[^0-9]/g,''))}
                  placeholder="WABA ID — somente números"
                  className="min-w-0 flex-1 rounded-xl border border-amber-300 bg-white px-3 py-3 text-sm text-slate-900" />
                <button onClick={linkWaba} disabled={wabaBusy || !/^[0-9]{6,30}$/.test(wabaInput)}
                  className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
                  {wabaBusy?'Validando na Meta...':'Verificar e vincular WABA'}
                </button>
              </div>
              <p className="text-xs text-amber-900">O sistema valida se a WABA realmente contém o Phone Number ID já conectado antes de salvar. Não altera o token, mensagens nem a Cloud API.</p>
            </div>}
            {wabaResult && <p role="status" className="rounded-xl bg-green-50 p-3 text-green-800 text-sm">{wabaResult}</p>}
            <p className="text-sm text-slate-600">{status.templateAudit.source === 'meta'
              ? 'Status consultado na conta WhatsApp Business.'
              : status.templateAudit.source === 'waba_not_available'
                ? 'O identificador da WABA não está cadastrado na integração nativa. Consulte o ID da conta em Meta Business Suite > Contas do WhatsApp e vincule-o à configuração existente; não altere o token nem o número ativo.'
                : 'A Meta não confirmou os modelos nesta consulta. Verifique as permissões whatsapp_business_management e os modelos em WhatsApp Manager.'}</p>
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
              detail={status.journeys.nicheMatch === false
                ? 'O cron exige classificação da loja como bebidas; essa condição não foi confirmada. Revisar o cadastro da loja.'
                : status.journeys.explicitlyEnabled
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
