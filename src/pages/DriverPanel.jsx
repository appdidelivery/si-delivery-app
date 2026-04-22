import React, { useState, useEffect, useCallback } from 'react';
import { registerPlugin } from '@capacitor/core';
import { getDatabase, ref, set, remove } from "firebase/database";
import { doc, updateDoc, getDoc, setDoc, increment, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';
import { MapPin, Package, Phone, Navigation, CheckCircle, User, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';

const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');
const dominioReal = 'convenienciasantaisabel.com.br';

export default function DriverPanel() {
  const { storeId, orderId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); 
  const [watcherId, setWatcherId] = useState(null);
  const [driverName, setDriverName] = useState(localStorage.getItem('driver_name') || '');
  const [orderData, setOrderData] = useState(null); 
  const [storeSettings, setStoreSettings] = useState(null); 
  const [currentPos, setCurrentPos] = useState(null); 
  
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [routeCalculated, setRouteCalculated] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  useEffect(() => {
    if (!orderId) return navigate('/');
    
    const unsubOrder = onSnapshot(doc(db, "orders", orderId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setOrderData(data);
        if (data.status === 'delivery') setStatus('delivering');
        else if (data.status === 'completed') setStatus('delivered');
        else setStatus('pending');
      }
    });

    const fetchSettings = async () => {
        const settingsSnap = await getDoc(doc(db, "settings", storeId));
        if (settingsSnap.exists()) setStoreSettings(settingsSnap.data());
    };
    fetchSettings();

    return () => unsubOrder();
  }, [orderId, storeId, navigate]);

  useEffect(() => {
    if (navigator.geolocation && !currentPos) {
        navigator.geolocation.getCurrentPosition(
            (pos) => setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => console.warn("Aguardando permissão de GPS...", err),
            { enableHighAccuracy: true }
        );
    }
  }, [currentPos]);

  // 🛡️ BLINDAGEM: Tradutor de Endereços (Evita Tela Branca no Google Maps)
  const getAddressString = () => {
      if (!orderData) return '';
      const address = orderData.customerAddress || orderData.address;
      if (!address) return 'Retirada no Local';
      if (typeof address === 'object') {
          return `${address.street || ''}, ${address.number || ''} - ${address.neighborhood || ''}, ${address.city || ''}`;
      }
      return String(address);
  };
  const safeAddress = getAddressString();

  const notifyCustomer = async (newStatus) => {
    if (!orderData?.customerPhone) return;
    const cleanPhone = String(orderData.customerPhone).replace(/\D/g, '').startsWith('55') ? String(orderData.customerPhone).replace(/\D/g, '') : `55${String(orderData.customerPhone).replace(/\D/g, '')}`;
    const trackingLink = `https://${dominioReal}/track/${orderId}`;
    const firstName = orderData.customerName ? orderData.customerName.split(' ')[0] : 'Cliente';
    
    let msg = "";
    if (newStatus === 'delivery') {
        msg = `🏍️ *SAIU PARA ENTREGA!* \n\nOlá ${firstName}, o motoboy *${driverName}* já está a caminho com o seu pedido #${orderId.slice(-5).toUpperCase()}.\n\n📍 *Acompanhe no mapa:* \n${trackingLink}`;
    } else if (newStatus === 'completed') {
        msg = `✅ *PEDIDO ENTREGUE!* \n\nConfirmamos a entrega. Muito obrigado pela preferência! ❤️ \n\n🎁 *Ganhe Prêmios e Descontos!* \nAcesse nosso app e entre no Clube VIP:\n👉 https://${dominioReal}`;
    }

    if (msg) {
        try {
            await fetch(`https://${dominioReal}/api/whatsapp-send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'chat_reply', storeId, toPhone: cleanPhone, dynamicParams: { text: msg } })
            });
        } catch (e) { console.error("Erro WhatsApp API", e); }
    }
  };

  const startDelivery = async () => {
    setStatus('delivering');
    try {
      await updateDoc(doc(db, "orders", orderId), { status: 'delivery' });
      await notifyCustomer('delivery'); 
      
      const id = await BackgroundGeolocation.addWatcher(
        { 
          backgroundMessage: "Transmitindo Rota para o Cliente...", 
          backgroundTitle: "Velo Entregas Ativo",
          requestPermissions: true, 
          distanceFilter: 1, 
          stale: false,
          highAccuracy: true,
          fastestInterval: 1000
        },
        (location, error) => {
          if (error) return console.error("Falha na leitura do satélite:", error);
          const coords = { lat: location.latitude, lng: location.longitude };
          setCurrentPos(coords);
          
          set(ref(getDatabase(), `tracking/${storeId}/${orderId}`), {
            lat: location.latitude, 
            lng: location.longitude, 
            timestamp: Date.now(),
            driverName: driverName
          });
        }
      );
      setWatcherId({ type: 'native', id: id });
    } catch (e) { 
        console.error("Erro ao iniciar GPS:", e);
        setStatus('pending'); 
        alert("Ative a permissão de GPS 'O Tempo Todo' nas configurações do celular.");
    }
  };

  const finishDelivery = async () => {
    if(!window.confirm("Você chegou ao destino e entregou o pedido?")) return;
    setStatus('loading');
    try {
      if (watcherId) {
        await BackgroundGeolocation.removeWatcher({ id: watcherId.id }).catch(()=>{});
        setWatcherId(null);
      }
      await remove(ref(getDatabase(), `tracking/${storeId}/${orderId}`)).catch(()=>{});

      if (storeSettings?.gamification?.cashback && orderData.customerPhone && !orderData.cashbackAwarded) {
          const percent = Number(storeSettings.gamification.cashbackPercent || 2) / 100;
          const cashbackEarned = (Number(orderData.total) || 0) * percent;
          if(cashbackEarned > 0) {
              const cleanPhone = String(orderData.customerPhone).replace(/\D/g, '');
              const walletRef = doc(db, "wallets", `${storeId}_${cleanPhone}`);
              const walletSnap = await getDoc(walletRef);
              if (walletSnap.exists()) {
                  await updateDoc(walletRef, { balance: increment(cashbackEarned), lastUpdated: serverTimestamp() });
              } else {
                  await setDoc(walletRef, { storeId, customerPhone: cleanPhone, customerName: orderData.customerName, balance: cashbackEarned, lastUpdated: serverTimestamp() });
              }
          }
      }

      await updateDoc(doc(db, "orders", orderId), { status: 'completed', cashbackAwarded: true });
      await notifyCustomer('completed'); 
      setStatus('delivered');
    } catch (error) { 
        setStatus('delivering'); 
        alert("Erro de conexão ao finalizar. Tente novamente.");
    }
  };

  const directionsCallback = useCallback((response) => {
    if (response !== null && response.status === 'OK') {
        setDirectionsResponse(response);
        setRouteCalculated(true);
    }
  }, []);

  const openNativeGPS = () => {
      if(safeAddress) {
          const encodedAddress = encodeURIComponent(safeAddress);
          // Rota Universal que aciona o app nativo do Google Maps ou Waze
          window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_system');
      }
  };

  if (status === 'loading') return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-blue-500 font-black"><Loader2 className="animate-spin mb-4" size={48} /> CARREGANDO...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white font-sans">
      
      {!driverName ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
            <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(37,99,235,0.4)]">
                <span className="text-5xl">🛵</span>
            </div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2">Velo Entregas</h2>
            <p className="text-slate-400 text-sm font-bold mb-10">Identifique-se para assumir as rotas.</p>
            <input 
                type="text" 
                placeholder="SEU NOME OU PLACA" 
                className="w-full p-6 bg-slate-900 border-2 border-slate-800 rounded-2xl text-white font-black text-center outline-none focus:border-blue-500 transition-all uppercase tracking-widest"
                onKeyDown={(e) => { 
                    if (e.key === 'Enter' && e.target.value.trim()) { 
                        const name = e.target.value.trim().toUpperCase();
                        setDriverName(name); 
                        localStorage.setItem('driver_name', name); 
                    } 
                }}
            />
            <p className="text-[10px] font-bold text-slate-500 mt-4 uppercase tracking-widest">Pressione ENTER para entrar</p>
        </div>
      ) : (
        <>
          {/* MAPA ESTILO UBER */}
          <div className="flex-1 relative bg-slate-800 min-h-[45vh]">
            {isLoaded ? (
                <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={currentPos || { lat: -23.55, lng: -46.63 }}
                    zoom={16}
                    options={{ disableDefaultUI: true, gestureHandling: 'greedy', styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }] }}
                >
                    {currentPos && safeAddress && !routeCalculated && status === 'delivering' && (
                        <DirectionsService
                            options={{ origin: currentPos, destination: safeAddress, travelMode: window.google.maps.TravelMode.DRIVING }}
                            callback={directionsCallback}
                        />
                    )}
                    {directionsResponse && directionsResponse.routes && directionsResponse.routes.length > 0 && (
                        <DirectionsRenderer options={{ directions: directionsResponse, suppressMarkers: true, polylineOptions: { strokeColor: "#3B82F6", strokeWeight: 5 } }} />
                    )}

                    {currentPos && <Marker position={currentPos} icon={{ url: "data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><text x='0' y='32' font-size='32'>🛵</text></svg>", scaledSize: new window.google.maps.Size(40, 40) }} />}
                    
                    {directionsResponse && directionsResponse.routes && directionsResponse.routes[0] && (
                        <Marker position={directionsResponse.routes[0].legs[0].end_location} icon={{ url: "data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' width='30' height='30'><circle cx='15' cy='15' r='10' fill='%2310B981' stroke='white' stroke-width='3'/></svg>" }} />
                    )}
                </GoogleMap>
            ) : <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-blue-500" size={32}/></div>}
            
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                <div className={`px-4 py-2 rounded-xl shadow-lg border-2 backdrop-blur-md pointer-events-auto ${status === 'delivering' ? 'bg-green-500/90 border-green-400' : 'bg-slate-900/90 border-slate-700'}`}>
                    <p className="text-[9px] font-black uppercase text-white/70">Corrida Atual</p>
                    <h3 className="text-lg font-black italic text-white">#{orderId.slice(-5).toUpperCase()}</h3>
                </div>
            </div>
          </div>

          {/* PAINEL INFERIOR (CLIENTE E BOTÕES) */}
          <div className="bg-white rounded-t-[2.5rem] p-6 md:p-8 text-slate-900 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] z-10 flex flex-col max-h-[55vh]">
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex-1 pr-4">
                        <h2 className="text-2xl font-black uppercase tracking-tighter leading-none mb-2">{orderData?.customerName}</h2>
                        <p className="text-slate-600 font-bold text-xs leading-snug flex items-start gap-1"><MapPin size={14} className="mt-0.5 flex-shrink-0 text-blue-600"/> {safeAddress}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <button onClick={openNativeGPS} className="bg-blue-100 text-blue-700 p-3 rounded-xl hover:bg-blue-200 transition-colors" title="Abrir GPS Externo">
                            <ExternalLink size={20}/>
                        </button>
                        <a href={`tel:${orderData?.customerPhone}`} className="bg-green-100 text-green-700 p-3 rounded-xl hover:bg-green-200 transition-colors" title="Ligar para Cliente">
                            <Phone size={20}/>
                        </a>
                    </div>
                </div>

                {orderData?.observation && (
                    <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl mb-4 flex gap-2 items-start">
                        <AlertTriangle size={16} className="text-orange-500 mt-0.5 flex-shrink-0"/>
                        <p className="text-xs font-bold text-orange-800 leading-tight">"{orderData.observation}"</p>
                    </div>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2 flex items-center gap-1"><Package size={12}/> Resumo do Pacote</p>
                    <ul className="space-y-2">
                        {orderData?.items?.map((it, idx) => (
                            <li key={idx} className="flex justify-between text-xs font-black text-slate-700">
                                <span><span className="text-blue-600 mr-1">{it.quantity}x</span> {it.name}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-slate-500">Cobrar do Cliente:</span>
                        <span className="text-lg font-black text-slate-900 italic">R$ {Number(orderData?.total || 0).toFixed(2)}</span>
                    </div>
                </div>
                
                {orderData?.paymentStatus !== 'paid' && orderData?.paymentMethod === 'dinheiro' && orderData?.changeFor && (
                     <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-black uppercase tracking-widest text-center border border-red-200 mb-2">
                         ⚠️ LEVAR TROCO PARA R$ {orderData.changeFor}
                     </div>
                )}
            </div>

            <div className="pt-2 mt-auto border-t border-slate-100 bg-white">
                {status === 'pending' && (
                    <button onClick={startDelivery} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                        <Navigation size={20}/> Iniciar Rota
                    </button>
                )}

                {status === 'delivering' && (
                    <button onClick={finishDelivery} className="w-full bg-green-500 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-green-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                        <CheckCircle size={20}/> Confirmar Entrega
                    </button>
                )}

                {status === 'delivered' && (
                    <div className="text-center p-4 bg-slate-100 rounded-2xl">
                        <p className="font-black text-slate-400 uppercase tracking-tight flex items-center justify-center gap-1"><CheckCircle size={16}/> Missão Cumprida</p>
                    </div>
                )}
                
                <button onClick={() => {localStorage.removeItem('driver_name'); window.location.reload();}} className="w-full mt-4 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-500 transition-colors py-2">
                    Trocar de Entregador
                </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}