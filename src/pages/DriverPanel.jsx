import React, { useState, useEffect } from 'react';
import { registerPlugin } from '@capacitor/core';
import { getDatabase, ref, set, remove } from "firebase/database";
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useParams, useNavigate } from 'react-router-dom';

const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

export default function DriverPanel() {
  const { storeId, orderId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); 
  const [watcherId, setWatcherId] = useState(null);
  const [driverId, setDriverId] = useState(localStorage.getItem('driver_id') || 'driver_' + Math.random().toString(36).substr(2, 9));
  const [driverName, setDriverName] = useState(localStorage.getItem('driver_name') || '');
  
  const [orderData, setOrderData] = useState(null); // Guarda os dados do cliente
  const [currentPos, setCurrentPos] = useState(null); // Mostra o GPS na tela

  useEffect(() => {
    if (!orderId) {
      alert("Faltam os dados do pedido.");
      navigate('/');
      return;
    }
    
    const checkOrder = async () => {
      try {
        const docRef = doc(db, "orders", orderId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setOrderData(data); // Salva para usarmos no WhatsApp
          
          const currentStatus = data.status;
          
          if (currentStatus !== 'canceled' && currentStatus !== 'completed') {
              setStatus('pending'); 
          } else if (currentStatus === 'delivery') {
              setStatus('delivering');
          } else if (currentStatus === 'completed') {
              setStatus('delivered');
          } else {
             alert("Status inválido para entrega: " + currentStatus);
             navigate('/');
          }
        } else {
            alert("Pedido não encontrado no banco de dados principal.");
        }
      } catch (error) {
        console.error("ERRO DE LEITURA FIREBASE:", error);
      }
    };
    checkOrder();
  }, [orderId, navigate]);

  // --- MOTOR DE WHATSAPP DO MOTOBOY (CORRIGIDO PARA O APK) ---
  const notifyCustomer = async (newStatus) => {
    if (!orderData || !orderData.customerPhone) return;
    
    const phone = String(orderData.customerPhone).replace(/\D/g, '');
    const cleanPhone = phone.startsWith('55') ? phone : `55${phone}`;
    
    // 🚨 CORREÇÃO 1: No celular, window.location.host é "localhost". Temos que forçar o domínio da API!
    const dominioReal = 'convenienciasantaisabel.com.br'; // Se for outro domínio, altere aqui
    const trackingLink = `https://${dominioReal}/track/${orderId}`;
    
    let msg = "";
    if (newStatus === 'delivery') {
        msg = `🏍️ *SAIU PARA ENTREGA!* \n\nOlá ${orderData.customerName.split(' ')[0]}, o motoboy *${driverName}* já está a caminho com o seu pedido #${orderId.slice(-5).toUpperCase()}.\n\n📍 *Acompanhe a moto ao vivo no mapa:* \n${trackingLink}`;
    } else if (newStatus === 'completed') {
        msg = `✅ *PEDIDO ENTREGUE!* \n\nConfirmamos a entrega. Muito obrigado pela preferência, ${orderData.customerName.split(' ')[0]}! ❤️ \n\n🎁 *Ganhe Prêmios e Descontos!*\nAcesse nosso app e entre no Clube VIP para ganhar pontos:\n👉 https://${dominioReal}`;
    }

    if (msg) {
        try {
            // 🚨 CORREÇÃO 2: Caminho absoluto (O APK não entende caminhos relativos como '/api')
            const apiUrl = `https://${dominioReal}/api/whatsapp-send`;
            
            await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat_reply',
                    storeId: storeId,
                    toPhone: cleanPhone,
                    dynamicParams: { text: msg }
                })
            });
        } catch (e) {
            console.error("Erro ao notificar WhatsApp", e);
        }
    }
  };

  const startDelivery = async () => {
    setStatus('delivering');
    
    try {
      await updateDoc(doc(db, "orders", orderId), { status: 'delivery' });
      await notifyCustomer('delivery'); // Dispara o ZAP com o Link do Mapa

      try {
          const id = await BackgroundGeolocation.addWatcher(
            {
              backgroundMessage: "Rastreio Velo Delivery Ativo",
              backgroundTitle: "Modo Entregador",
              requestPermissions: true,
              stale: false,
              distanceFilter: 2 // Diminuído para 2 metros (Atualiza mais rápido)
            },
            (location, error) => {
              if (error) return console.error(error);
              
              // Mostra na tela do motoboy que o GPS tá vivo
              setCurrentPos({ lat: location.latitude, lng: location.longitude });
              
              const realtimeDb = getDatabase();
              set(ref(realtimeDb, `tracking/${storeId}/${orderId}`), {
                lat: location.latitude,
                lng: location.longitude,
                driverId: driverId,
                timestamp: Date.now()
              });
            }
          );
          setWatcherId(id);
      } catch (gpsError) {
          console.warn("GPS ignorado: Você está testando na Web.");
      }

    } catch (error) {
      console.error("Falha ao atualizar pedido:", error);
      setStatus('pending');
    }
  };

  const finishDelivery = async () => {
    setStatus('delivered');
    try {
      if (watcherId) {
        try { await BackgroundGeolocation.removeWatcher({ id: watcherId }); } catch(e){}
        setWatcherId(null);
      }
      const realtimeDb = getDatabase();
      await remove(ref(realtimeDb, `tracking/${storeId}/${orderId}`));
      await updateDoc(doc(db, "orders", orderId), { status: 'completed' });
      
      await notifyCustomer('completed'); // Dispara o Zap de Sucesso
      
      alert("✅ Entrega finalizada!");
    } catch (error) {
      console.error("Erro ao finalizar:", error);
    }
  };

  if (status === 'loading') return <div className="p-10 text-center font-bold text-slate-500 mt-20">Carregando...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-6 text-white font-sans">
      <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center border border-slate-700">
        
        {!driverName ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl">
               👤
            </div>
            <h2 className="text-xl font-black uppercase tracking-tighter">Quem está entregando?</h2>
            <p className="text-slate-400 text-xs font-bold leading-tight">Insira o seu nome ou placa para identificação no painel da loja.</p>
            
            <input 
              type="text" 
              placeholder="Ex: João da Silva" 
              className="w-full p-5 bg-slate-900 border border-slate-700 rounded-2xl text-white font-black outline-none focus:ring-2 ring-blue-500 transition-all text-center uppercase"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  const name = e.target.value.trim().toUpperCase();
                  localStorage.setItem('driver_name', name);
                  localStorage.setItem('driver_id', driverId);
                  setDriverName(name);
                }
              }}
            />
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest animate-pulse">Pressione ENTER para salvar</p>
          </div>
        ) : (
          <div className="animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
               🏍️
            </div>
            <h2 className="text-2xl font-black mb-1 leading-none uppercase italic">Pedido #{orderId.substring(0,5).toUpperCase()}</h2>
            <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-8">Entregador: {driverName}</p>
            
            {status === 'pending' && (
              <button onClick={startDelivery} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest py-5 rounded-2xl shadow-lg shadow-blue-900/50 transition-all active:scale-95">
                Iniciar Rota
              </button>
            )}

            {status === 'delivering' && (
              <div className="space-y-6">
                <div className="bg-green-500/20 border border-green-500/30 text-green-300 p-4 rounded-xl">
                  <p className="font-black uppercase tracking-widest mb-1 animate-pulse">🟢 Rota Ativa</p>
                  <p className="text-[10px] font-bold mb-2">Transmitindo localização para o cliente...</p>
                  
                  {/* PROVA DE VIDA DO GPS NA TELA */}
                  {currentPos ? (
                      <p className="text-[8px] font-mono text-green-400 bg-green-900/30 py-1 rounded">Lat: {currentPos.lat.toFixed(4)} | Lng: {currentPos.lng.toFixed(4)}</p>
                  ) : (
                      <p className="text-[8px] font-mono text-orange-400 bg-orange-900/30 py-1 rounded animate-pulse">Buscando satélite...</p>
                  )}
                </div>
                <button onClick={finishDelivery} className="w-full bg-green-500 hover:bg-green-400 text-white font-black uppercase tracking-widest py-5 rounded-2xl shadow-lg shadow-green-900/50 transition-all active:scale-95">
                  Marcar como Entregue
                </button>
              </div>
            )}

            {status === 'delivered' && (
              <div className="bg-slate-700 p-6 rounded-2xl">
                <p className="text-white font-black uppercase tracking-widest mb-2 italic">✨ Entrega Finalizada!</p>
                <p className="text-slate-400 text-[10px]">O cliente foi notificado.</p>
              </div>
            )}

            <button 
              onClick={() => { localStorage.removeItem('driver_name'); setDriverName(''); }}
              className="mt-8 text-[9px] text-slate-600 font-bold uppercase hover:text-slate-400 transition-colors"
            >
              Trocar de Entregador
            </button>
          </div>
        )}
      </div>
    </div>
  );
}