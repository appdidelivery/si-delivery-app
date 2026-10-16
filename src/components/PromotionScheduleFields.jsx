import React from 'react';
import { promotionStartIso, promotionEndIso, promotionDateInput, presetPromotionRange, promotionStatus } from '../lib/promotions';

export default function PromotionScheduleFields({ product, onChange }) {
  const range = {
    promotionStartAt: product?.promotionStartAt || '',
    promotionEndAt: product?.promotionEndAt || ''
  };
  const status = promotionStatus(product);
  const statusLabel = {
    none: 'Sem oferta ativa',
    active: range.promotionStartAt ? 'Oferta ativa dentro do período' : 'Oferta sem data de término',
    scheduled: 'Oferta agendada para começar',
    expired: 'Prazo encerrado — preço normal aplicado automaticamente',
    invalid: 'Agendamento incompleto ou inválido'
  }[status];
  const update = values => onChange(values);
  return (
    <section className="mt-4 rounded-2xl border border-orange-200 bg-orange-50/50 p-4 space-y-3" aria-label="Agendamento do preço promocional">
      <div>
        <h4 className="text-sm font-black text-orange-900">📅 Validade do preço promocional</h4>
        <p className="mt-1 text-xs text-orange-800">
          Escolha a vigência da oferta. Fora desse período a vitrine, o carrinho e os pedidos usam o preço normal.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          ['today','Somente hoje'],
          ['week','7 dias'],
          ['weekend','Fim de semana'],
          ['none','Sem data']
        ].map(([value, label]) => (
          <button key={value} type="button" onClick={() => update(presetPromotionRange(value))}
            className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-bold text-orange-900 hover:bg-orange-100 focus:outline-orange-500">
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-700">
          Começa em (Brasília)
          <input type="date" className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" value={promotionDateInput(range.promotionStartAt)}
            onChange={e => update({ promotionStartAt: promotionStartIso(e.target.value) })} />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Último dia da oferta (Brasília)
          <input type="date" className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" value={promotionDateInput(range.promotionEndAt,true)}
            onChange={e => update({ promotionEndAt: promotionEndIso(e.target.value) })} />
        </label>
      </div>
      <p className="text-xs font-semibold text-orange-800" role="status">{statusLabel}. O término considera todo o último dia selecionado.</p>
      <p className="text-xs text-slate-500">Para desativar a oferta, zere o preço promocional. Produtos antigos sem datas continuam com as promoções atuais.</p>
    </section>
  );
}
