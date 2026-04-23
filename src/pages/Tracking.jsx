import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, auth } from '../../src/services/firebase'; 
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { getDatabase, ref, onValue } from 'firebase/database';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { CheckCircle2, Clock, Truck, PackageCheck, ChevronLeft, Star, Loader2, ExternalLink, Award, Copy, QrCode, MapPin, Navigation } from 'lucide-react';
import { motion } from 'framer-motion';
import { enviarAvaliacao } from '../../src/services/reviewService';

const rtdb = getDatabase();

// FÓRMULA DE HAVERSINE: Calcula distância em KM sem gastar API do Google
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; 
};

export default function Tracking() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [storeData, setStoreData] = useState(null);

  // ESTADOS DO RASTREIO DE MOTOBOY
  const [driverLocation, setDriverLocation] = useState(null);
  const [smoothMarkerPos, setSmoothMarkerPos] = useState(null);
  const displayLocRef = useRef(null); // Guarda a posição atual para animação não bugar o React
  const [etaMins, setEtaMins] = useState(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '' 
  });

  useEffect(() => {
    const unsubOrder = onSnapshot(doc(db, "orders", orderId), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const orderInfo = { id: docSnapshot.id, ...docSnapshot.data() };
        setOrder(orderInfo);
        
        const storeRef = doc(db, "stores", orderInfo.storeId);
        getDoc(storeRef).then((s) => {
          if (s.exists()) setStoreData(s.data());
        }).catch(err => console.error("Erro ao buscar dados da loja no rastreio:", err));

      } else {
        setOrder(null);
      }
      setLoading(false);
    });
    return () => unsubOrder();
  },[orderId]);

  // MOTOR 1: OUVINTE DO REALTIME DATABASE
  useEffect(() => {
    if (order?.status === 'delivery' && order?.storeId && order?.id) {
      console.log("📍 [Tracking] Iniciando rastreio em tempo real...");
      const trackingRef = ref(rtdb, `tracking/${order.storeId}/${order.id}`);
      
      const unsubscribe = onValue(trackingRef, (snapshot) => {
        if (snapshot.exists()) {
          const coords = snapshot.val();
            // 🛡️ BLINDAGEM: Lê as chaves exatas 'lat' e 'lng' e garante que sejam numéricas
            if (coords && coords.lat !== undefined && coords.lng !== undefined) {
                setDriverLocation({ lat: Number(coords.lat), lng: Number(coords.lng) });
            }
        }
      });

      return () => unsubscribe();
    }
  }, [order?.status, order?.storeId, order?.id]);

  // MOTOR 2: INTERPOLAÇÃO DE MOVIMENTO SUAVE (60 FPS) E CÁLCULO DE ETA
  useEffect(() => {
      if (!driverLocation) return;

      // 1. Cálculo de ETA (Tempo Estimado) usando a loja como base e 30km/h
      if (storeData?.lat && storeData?.lng) {
          const distKm = calculateDistance(storeData.lat, storeData.lng, driverLocation.lat, driverLocation.lng);
          if (distKm) {
              const timeInHours = distKm / 30; // Média urbana de 30km/h
              const timeInMins = Math.ceil(timeInHours * 60) + 5; // +5 min margem de manobra
              setEtaMins(timeInMins);
          }
      }

      // 2. Animação de Movimento Suave da Moto
      if (!displayLocRef.current) {
          displayLocRef.current = driverLocation;
          setSmoothMarkerPos(driverLocation);
          return;
      }

      let start = null;
      const duration = 1500; // 1.5 segundos para a moto deslizar de um ponto ao outro
      const startLat = displayLocRef.current.lat;
      const startLng = displayLocRef.current.lng;
      const endLat = driverLocation.lat;
      const endLng = driverLocation.lng;

      const animate = (timestamp) => {
          if (!start) start = timestamp;
          const progress = timestamp - start;
          const percent = Math.min(progress / duration, 1);

          // Curva de aceleração (Ease Out)
          const easeOut = 1 - Math.pow(1 - percent, 3);

          const currentLat = startLat + (endLat - startLat) * easeOut;
          const currentLng = startLng + (endLng - startLng) * easeOut;

          const newPos = { lat: currentLat, lng: currentLng };
          displayLocRef.current = newPos;
          setSmoothMarkerPos(newPos);

          if (progress < duration) {
              requestAnimationFrame(animate);
          }
      };
      requestAnimationFrame(animate);
  }, [driverLocation, storeData]);

  // FUNÇÃO: GAMIFICAÇÃO GOOGLE (MULTITENANT)
  const handleGoogleReview = async () => {
    const linkAvaliacao = storeData?.googleReviewUrl || 'https://g.page/r/CTEL4f6nFgE_EBE/review';
    const produtoDestaque = order?.items?.[0] ? order.items[0].name : "meu pedido";
    const textoPronto = `Comprei ${produtoDestaque} e a entrega foi super rápida!`;

    try {
      await navigator.clipboard.writeText(textoPronto);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 3000);

      await updateDoc(doc(db, "orders", orderId), { googleReviewClicked: true });

      setTimeout(() => {
        window.open(linkAvaliacao, '_blank');
      }, 1000);

    } catch (err) {
      console.warn("Navegador bloqueou a cópia automática. Abrindo Google...", err);
      window.open(linkAvaliacao, '_blank');
    }
  };

  const handleSendReview = async () => {
    if (rating === 0) return alert("Por favor, selecione uma nota de 1 a 5 estrelas.");
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("Você precisa estar logado para avaliar.");
        setIsSubmitting(false);
        return;
      }

      const reviewData = {
        userId: user.uid,
        storeId: order.storeId,
        orderId: order.id,
        rating: rating,
        comment: comment
      };

      await enviarAvaliacao(reviewData);
      await updateDoc(doc(db, "orders", orderId), { hasBeenReviewed: true });
    } catch (error) {
      alert("Ocorreu um erro ao enviar sua avaliação. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // MOTOR DO PIX (POLLING)
  useEffect(() => {
      if (order?.paymentMethod === 'velopay_pix' && order?.paymentStatus !== 'paid' && order?.paymentIntentId) {
          const interval = setInterval(async () => {
              try {
                  const res = await fetch('/api/velopay-status', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ txid: order.paymentIntentId, orderId: order.id })
                  });
                  const data = await res.json();
                  if (data.paid) { clearInterval(interval); }
              } catch (e) { }
          }, 5000); 
          return () => clearInterval(interval); 
      }
  }, [order?.paymentStatus, order?.paymentMethod, order?.paymentIntentId, order?.id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  if (!order) return <div className="p-10 text-center font-bold text-red-600 uppercase tracking-widest">Pedido não encontrado.</div>;
  
  const steps =[
    { id: 'pending', label: 'Pedido Recebido', icon: <Clock /> },
    { id: 'preparing', label: 'Em Preparo', icon: <PackageCheck /> },
    { id: 'delivery', label: 'Saiu para Entrega', icon: <Truck /> },
    { id: 'completed', label: 'Entregue!', icon: <CheckCircle2 /> },
  ];

  const currentIdx = steps.findIndex(s => s.id === order.status);

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <Link to="/" className="inline-flex items-center gap-2 text-slate-500 font-bold mb-8 uppercase text-xs tracking-widest">
        <ChevronLeft size={16}/> Voltar para Loja
      </Link>

      <motion.div initial={{y: 20, opacity:0}} animate={{y:0, opacity:1}} className="bg-white rounded-[3rem] p-8 shadow-2xl max-w-md mx-auto border border-white overflow-hidden relative">
        
        {((order.paymentMethod === 'velopay_pix' && order.velopayStatus === 'waiting_payment') || (order.paymentMethod === 'pix' && order.velopayStatus === 'waiting_payment')) && order.paymentStatus !== 'paid' ? (
            <div className="text-center">
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
                <div className="bg-slate-900 text-white p-3 rounded-2xl mb-6 inline-flex items-center justify-center gap-2 shadow-lg">
                    <QrCode size={20} className="text-blue-400"/>
                    <span className="font-black uppercase tracking-widest text-[10px]">Pagamento Seguro (VeloPay)</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter mb-2 uppercase leading-none">Falta Pouco!</h2>
                <p className="text-slate-500 font-bold text-sm mb-8 leading-tight">Realize o pagamento via Pix para seu pedido ser enviado à cozinha.</p>
                <div className="bg-white p-4 rounded-[2rem] border-4 border-slate-100 shadow-inner inline-block mb-6 relative">
                    {order.pixQrCodeUrl ? (
                        <img src={order.pixQrCodeUrl.startsWith('http') || order.pixQrCodeUrl.startsWith('data:') ? order.pixQrCodeUrl : `data:image/png;base64,${order.pixQrCodeUrl}`} alt="QR Code Pix" className="w-48 h-48 object-contain"/>
                    ) : (
                        <div className="w-48 h-48 flex items-center justify-center bg-slate-50 rounded-2xl animate-pulse"><Loader2 className="animate-spin text-slate-300" size={32} /></div>
                    )}
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8 relative">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor do Pedido</p>
                    <p className="text-4xl font-black text-slate-900 italic">R$ {Number(order.total || 0).toFixed(2)}</p>
                </div>
                <button onClick={async () => {
                        try { await navigator.clipboard.writeText(order.pixCopiaECola); setCopiedText(true); setTimeout(() => setCopiedText(false), 3000); } catch(e) { alert("Erro ao copiar."); }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[2rem] shadow-xl uppercase text-sm tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 relative z-10"
                >
                    {copiedText ? <><CheckCircle2 size={20}/> Código Copiado!</> : <><Copy size={20}/> Copiar Código Pix</>}
                </button>
                <p className="text-[10px] font-bold text-slate-400 mt-6 flex items-center justify-center gap-1 animate-pulse"><Loader2 size={12} className="animate-spin" /> Aguardando banco...</p>
            </div>
        ) : (
            <>
                <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter mb-2 uppercase">Status do Pedido</h2>
                <div className="flex items-center justify-between mb-10">
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">ID: #{orderId.slice(0,8)}</p>
                    {order.paymentMethod === 'velopay_pix' && order.paymentStatus === 'paid' && (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={12}/> Pix Confirmado</span>
                    )}
                </div>

                <div className="space-y-10 relative">
                  <div className="absolute left-[21px] top-2 bottom-2 w-0.5 bg-slate-100 -z-10"></div>
                  {steps.map((step, idx) => (
                    <div key={step.id} className={`flex items-center gap-6 transition-all ${idx <= currentIdx ? 'opacity-100' : 'opacity-20'}`}>
                      <div className={`p-3 rounded-2xl shadow-lg ${idx <= currentIdx ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>{step.icon}</div>
                      <div>
                        <p className={`font-black text-lg leading-none ${idx <= currentIdx ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</p>
                        {idx === currentIdx && <p className="text-[10px] font-bold text-blue-600 uppercase mt-1 animate-pulse">Acontecendo agora</p>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* MAPA DO MOTOBOY E TEMPO ESTIMADO */}
                {order.status === 'delivery' && isLoaded && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-10 pt-8 border-t border-slate-100">
                    <h3 className="text-slate-800 font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Navigation size={18} className="text-blue-500"/> Acompanhe sua Entrega
                    </h3>
                    
                    <div className="rounded-[2rem] overflow-hidden border-4 border-slate-50 shadow-inner h-64 bg-slate-100 relative">
                      {smoothMarkerPos ? (
                        <GoogleMap
                          mapContainerStyle={{ width: '100%', height: '100%' }}
                          center={smoothMarkerPos}
                          zoom={16}
                          options={{ disableDefaultUI: true, zoomControl: false, gestureHandling: 'cooperative' }}
                        >
                          <Marker 
                            position={smoothMarkerPos}
                            icon={{
                                url: "https://cdn-icons-png.flaticon.com/512/7543/7543160.png",
                                scaledSize: new window.google.maps.Size(40, 40)
                            }}
                          />
                        </GoogleMap>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                          <Loader2 size={30} className="animate-spin mb-2" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Buscando sinal do GPS...</span>
                        </div>
                      )}
                    </div>

                    {etaMins && (
                        <div className="bg-blue-50 text-blue-700 p-4 rounded-2xl mt-4 flex items-center justify-between border border-blue-100 shadow-sm">
                            <span className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <Clock size={16}/> Previsão Média
                            </span>
                            <span className="font-black text-xl italic">~ {etaMins} min</span>
                        </div>
                    )}
                  </motion.div>
                )}

                {/* ÁREA DE AVALIAÇÃO */}
                {order.status === 'completed' && (
                  <div className="mt-10 border-t border-slate-100 pt-8 space-y-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-[2rem] border-2 border-yellow-200 shadow-sm relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 opacity-10"><Award size={100}/></div>
                      <h3 className="text-yellow-800 font-black italic tracking-tighter text-xl leading-tight mb-2 flex items-center gap-2 relative z-10"><Star className="fill-yellow-500 text-yellow-500" size={24}/> MISSÃO VIP</h3>
                      <p className="text-yellow-900 text-sm font-medium mb-4 relative z-10">
                        Ganhe <b>+150 Pontos</b> instantâneos avaliando nossa entrega no Google! <br/><br/>
                        <span className="bg-white p-2 rounded-lg text-xs font-bold border border-yellow-200 block text-center">💡 Dica: Ao clicar, copiaremos o texto <b>"Comprei {order?.items?.[0]?.name || "aqui"}..."</b>. Cole lá para nos ajudar!</span>
                      </p>
                      <button onClick={handleGoogleReview} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-yellow-200 uppercase text-xs tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 relative z-10">
                        {copiedText ? <><CheckCircle2 size={18}/> TEXTO COPIADO! ABRINDO...</> : <><ExternalLink size={18}/> AVALIAR NO GOOGLE</>}
                      </button>
                    </motion.div>

                    {order.hasBeenReviewed ? (
                      <div className="bg-slate-100 p-6 rounded-[2rem] text-slate-500 text-center font-bold text-sm">Sua avaliação interna já foi recebida. Obrigado!</div>
                    ) : (
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-200">
                        <h3 className="text-slate-800 font-black text-sm uppercase tracking-widest mb-4 text-center">Feedback Interno Rápido</h3>
                        <div className="flex justify-center gap-2 mb-4">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} onClick={() => setRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)}>
                              <Star size={32} className={`cursor-pointer transition-all ${(hoverRating || rating) >= star ? 'text-blue-500 fill-current' : 'text-slate-200'}`} />
                            </button>
                          ))}
                        </div>
                        <textarea className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm focus:ring-2 focus:ring-blue-400 outline-none mb-4 font-medium" rows="2" placeholder="Deixe um comentário..." value={comment} onChange={(e) => setComment(e.target.value)} />
                        <button onClick={handleSendReview} disabled={isSubmitting} className="w-full bg-slate-900 text-white font-black py-3 rounded-xl uppercase text-xs tracking-widest active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center">
                          {isSubmitting ? <Loader2 className="animate-spin" /> : 'Enviar Feedback'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
            </>
        )}
      </motion.div>
    </div>
  );
}