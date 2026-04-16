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
  const [driverId, setDriverId] = useState('driver_' + Math.floor(Math.random() * 1000)); 

  useEffect(() => {
    if (!orderId) {
      alert("Faltam os dados do pedido.");
      navigate('/');
      return;
    }
    
    const checkOrder = async () => {
      try {
        console.log(`=== FORÇANDO LEITURA DO PEDIDO ${orderId} ===`);
        
        // A SOLUÇÃO: Puxa o documento pela raiz absoluta, ignorando amarras de tenant.
        const docRef = doc(db, "orders", orderId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const currentStatus = docSnap.data().status;
          console.log("Pedido encontrado! Status:", currentStatus);
          
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
            console.error("FIREBASE DIZ: Documento não existe na raiz de 'orders'.");
            alert("Pedido não encontrado no banco de dados principal.");
        }
      } catch (error) {
        console.error("ERRO DE LEITURA FIREBASE:", error);
      }
    };
    checkOrder();
  }, [orderId, navigate]);

  const startDelivery = async () => {
    setStatus('delivering');
    
    try {
      await updateDoc(doc(db, "orders", orderId), { status: 'delivery' });

      // BLOQUEIO ANTI-ERRO NO NAVEGADOR (WEB)
      // Como estamos a testar no Chrome (Mac), o plugin de GPS vai falhar e explodir a tela.
      // Adicionamos um Try/Catch aqui para ele apenas avisar no console e não quebrar o React.
      try {
          const id = await BackgroundGeolocation.addWatcher(
            {
              backgroundMessage: "Rastreio Velo Delivery Ativo",
              backgroundTitle: "Modo Entregador",
              requestPermissions: true,
              stale: false,
              distanceFilter: 10 
            },
            (location, error) => {
              if (error) return console.error(error);
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
          console.warn("GPS ignorado: Você está testando na Web. O Rastreio só funciona no App Instalado (APK).");
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
      alert("✅ Entrega finalizada!");
    } catch (error) {
      console.error("Erro ao finalizar:", error);
    }
  };

  if (status === 'loading') return <div className="p-10 text-center font-bold text-slate-500 mt-20">Carregando...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-6 text-white font-sans">
      <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center border border-slate-700">
        <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
           🏍️
        </div>
        <h2 className="text-2xl font-black mb-1">Pedido #{orderId.substring(0,5).toUpperCase()}</h2>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">Velo Delivery Driver</p>
        
        {status === 'pending' && (
          <button onClick={startDelivery} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest py-5 rounded-2xl shadow-lg shadow-blue-900/50 transition-all active:scale-95">
            Iniciar Rota
          </button>
        )}

        {status === 'delivering' && (
          <div className="space-y-6">
            <div className="bg-green-500/20 border border-green-500/30 text-green-300 p-4 rounded-xl animate-pulse">
              <p className="font-black uppercase tracking-widest mb-1">🟢 Rota Ativa</p>
              <p className="text-[10px] font-bold">Pode bloquear a tela.</p>
            </div>
            <button onClick={finishDelivery} className="w-full bg-green-500 hover:bg-green-400 text-white font-black uppercase tracking-widest py-5 rounded-2xl shadow-lg shadow-green-900/50 transition-all active:scale-95">
              Marcar como Entregue
            </button>
          </div>
        )}

        {status === 'delivered' && (
          <div className="bg-slate-700 p-6 rounded-2xl">
            <p className="text-white font-black uppercase tracking-widest mb-2">🎉 Finalizada!</p>
          </div>
        )}
      </div>
    </div>
  );
}