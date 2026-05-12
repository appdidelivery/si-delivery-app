import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  // Blindagem: Permitir apenas método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { cart, storeId, customerPhone, total } = req.body;

    // 1. Busca credenciais da loja (Multi-tenant)
    const storeRef = doc(db, 'stores', storeId);
    const storeSnap = await getDoc(storeRef);

    if (!storeSnap.exists()) {
      return res.status(404).json({ error: 'Loja não encontrada no Velo Delivery' });
    }

    const storeData = storeSnap.data();
    const accessToken = storeData.mpAccessToken; 

    if (!accessToken) {
      return res.status(400).json({ error: 'O lojista não possui o Mercado Pago configurado.' });
    }

    // 2. Monta o payload no padrão do Mercado Pago
    const items = cart.map(item => ({
      title: item.name,
      unit_price: Number(item.price),
      quantity: Number(item.quantity),
      currency_id: 'BRL'
    }));

    const externalReferenceId = `${storeId}-${Date.now()}`;

    const preferenceData = {
      items,
      payer: {
        phone: { number: customerPhone || 'Não informado' }
      },
      back_urls: {
        success: `https://velo.delivery/wpp/${storeId}?status=success&ref=${externalReferenceId}`,
        failure: `https://velo.delivery/wpp/${storeId}?status=failure`,
        pending: `https://velo.delivery/wpp/${storeId}?status=pending`
      },
      auto_return: 'approved',
      external_reference: externalReferenceId 
    };

    // 3. Comunicação direta e segura com a API do Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferenceData)
    });

    const mpResult = await mpResponse.json();

    if (!mpResponse.ok) {
      throw new Error(mpResult.message || 'Erro ao gerar link de pagamento no MP');
    }

    // 4. Salva o pedido inicial no Firebase para o painel do lojista (Aguardando Pagamento)
    await addDoc(collection(db, 'orders'), {
      storeId,
      customerPhone: customerPhone || 'Não informado',
      items: cart,
      total,
      status: 'aguardando_pagamento',
      paymentProvider: 'mercado_pago',
      externalReference: externalReferenceId,
      createdAt: new Date().toISOString()
    });

    // 5. Retorna o Link de Pagamento (init_point)
    return res.status(200).json({ init_point: mpResult.init_point });

  } catch (error) {
    console.error('Erro no VeloPay MP:', error);
    return res.status(500).json({ error: 'Erro interno ao processar transação' });
  }
}