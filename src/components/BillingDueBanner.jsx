import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';

/** Aviso visível no painel da loja: mostra somente faturas do tenant ativo. */
export default function BillingDueBanner() {
  const { store } = useStore();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !store) return null;

  const invoices = Array.isArray(store.faturasHistorico) ? store.faturasHistorico : [];
  const pending = invoices
    .filter(invoice => String(invoice?.status || '').toUpperCase() === 'PENDENTE' && invoice?.dueDate)
    .map(invoice => ({ ...invoice, dueTime: new Date(invoice.dueDate).getTime() }))
    .filter(invoice => Number.isFinite(invoice.dueTime))
    .sort((a, b) => a.dueTime - b.dueTime);
  if (!pending.length) return null;

  const invoice = pending[0];
  const isOverdue = invoice.dueTime < Date.now();
  const dueLabel = new Date(invoice.dueDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  return (
    <aside role="status" aria-live="polite" className="fixed bottom-4 left-4 right-4 z-[90] max-w-xl rounded-xl border border-amber-400/70 bg-amber-50 p-4 shadow-2xl text-slate-900">
      <div className="flex gap-3 items-start justify-between">
        <div>
          <p className="font-bold text-sm">{isOverdue ? 'Mensalidade Velo Delivery vencida' : 'Mensalidade Velo Delivery a vencer'}</p>
          <p className="text-sm mt-1">
            {invoice.amount} · Vencimento: <strong>{dueLabel}</strong>.
            {isOverdue ? ' Confira a regularização da fatura.' : ' Consulte a fatura na área de assinatura do painel.'}
          </p>
        </div>
        <button type="button" onClick={() => setDismissed(true)} aria-label="Fechar aviso de fatura" className="p-1 text-xl leading-none text-slate-600 hover:text-slate-900">×</button>
      </div>
    </aside>
  );
}
