import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, MessageSquare, Image as ImageIcon, Package, User, 
  CheckCircle, X, ExternalLink, Loader2, Save, Send, RefreshCw, UploadCloud
} from 'lucide-react';
import { FaGoogle } from 'react-icons/fa6';

export default function GoogleIntegrationDashboard({ storeId }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking'); // 'checking', 'connected', 'disconnected'

  // Estados dos Formulários
  const [profileForm, setProfileForm] = useState({ title: '', description: '', phone: '' });
  const [postForm, setPostForm] = useState({ summary: '', imageUrl: '', topicType: 'STANDARD' });
  const [mediaForm, setMediaForm] = useState({ logoUrl: '', coverUrl: '' });
  const [reviews, setReviews] = useState([]);
  const [replyTexts, setReplyTexts] = useState({});

  // Verifica o status inicial
  useEffect(() => {
    checkConnection();
  }, [storeId]);

  const checkConnection = async () => {
    try {
      const res = await fetch(`/api/google-gmb?action=checkStatus&storeId=${storeId}`);
      const data = await res.json();
      if (data.connected) {
        setConnectionStatus('connected');
        fetchProfileData();
        fetchReviews();
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (err) {
      setConnectionStatus('disconnected');
    }
  };

  const fetchProfileData = async () => {
    try {
      const res = await fetch(`/api/google-gmb?action=getProfile&storeId=${storeId}`);
      const data = await res.json();
      if (data.success && data.profile) {
        setProfileForm({
          title: data.profile.title || '',
          description: data.profile.profile?.description || '',
          phone: data.profile.primaryPhone || ''
        });
      }
    } catch (err) {
      console.error("Erro ao buscar perfil", err);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/google-gmb?action=getReviews&storeId=${storeId}`);
      const data = await res.json();
      if (data.success && data.reviews) {
        setReviews(data.reviews.reviews || []);
      }
    } catch (err) {
      console.error("Erro ao buscar avaliações", err);
    }
  };

  // HANDLERS DE AÇÃO PARA API
  const handleConnectGoogle = () => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const authUrl = isLocal ? `http://localhost:3000/api/google-auth?storeId=${storeId}` : `https://app.velodelivery.com.br/api/google-auth?storeId=${storeId}`;
    window.location.href = authUrl;
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/google-gmb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateBusinessInfo', storeId, ...profileForm })
      });
      const data = await res.json();
      if (res.ok && data.success) alert("✅ Perfil atualizado no Google Meu Negócio!");
      else alert(`❌ Erro: ${data.error}`);
    } catch (err) {
      alert("Erro de conexão com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/google-gmb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createGooglePost', storeId, ...postForm })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("✅ Postagem publicada na vitrine do Google!");
        setPostForm({ summary: '', imageUrl: '', topicType: 'STANDARD' });
      } else alert(`❌ Erro: ${data.error}`);
    } catch (err) {
      alert("Erro de conexão com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReplyReview = async (reviewId) => {
    const replyText = replyTexts[reviewId];
    if (!replyText) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/google-gmb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'handleReviews', storeId, reviewId, replyText })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("✅ Resposta enviada com sucesso!");
        fetchReviews(); // Atualiza a lista
      } else alert(`❌ Erro: ${data.error}`);
    } catch (err) {
      alert("Erro de conexão com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadMedia = async (e, category) => {
    e.preventDefault();
    setIsLoading(true);
    const mediaUrl = category === 'PROFILE' ? mediaForm.logoUrl : mediaForm.coverUrl;
    try {
      const res = await fetch('/api/google-gmb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'uploadGoogleMedia', storeId, mediaUrl, category })
      });
      const data = await res.json();
      if (res.ok && data.success) alert(`✅ Imagem de ${category === 'PROFILE' ? 'Logo' : 'Capa'} atualizada!`);
      else alert(`❌ Erro: ${data.error}`);
    } catch (err) {
      alert("Erro de conexão com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncMenu = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/google-gmb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'syncVeloProducts', storeId })
      });
      const data = await res.json();
      if (res.ok && data.success) alert("✅ Catálogo sincronizado com o Google!");
      else alert(`❌ Erro: ${data.error}`);
    } catch (err) {
      alert("Erro de conexão com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Perfil & Dados', icon: <User size={18} /> },
    { id: 'posts', label: 'Postagens (Feed)', icon: <MessageSquare size={18} /> },
    { id: 'reviews', label: 'Avaliações', icon: <Store size={18} /> },
    { id: 'media', label: 'Mídias e Fotos', icon: <ImageIcon size={18} /> },
    { id: 'menu', label: 'Cardápio', icon: <Package size={18} /> }
  ];

  if (connectionStatus === 'checking') {
    return <div className="p-12 flex justify-center text-blue-600"><Loader2 className="animate-spin" size={40}/></div>;
  }

  return (
    <div className="bg-white rounded-[3rem] p-8 lg:p-10 shadow-sm border border-slate-100 flex flex-col w-full animate-in fade-in">
      
      {/* 1. CABEÇALHO DE CONEXÃO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-slate-100 pb-8">
        <div className="flex items-center gap-4">
          <div className="bg-blue-50 p-4 rounded-2xl text-blue-600">
            <FaGoogle size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase italic text-slate-800 leading-none mb-1">
              Google Meu Negócio
            </h2>
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' ? (
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-green-200">
                  <CheckCircle size={14}/> Conectado e Sincronizando
                </span>
              ) : (
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-red-200">
                  <X size={14}/> Desconectado
                </span>
              )}
            </div>
          </div>
        </div>

        {connectionStatus !== 'connected' && (
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <button 
              onClick={handleConnectGoogle}
              className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <FaGoogle size={16}/> Conectar Conta Google
            </button>
            <a 
              href="https://business.google.com/create" 
              target="_blank" rel="noopener noreferrer"
              className="bg-slate-50 text-slate-600 border border-slate-200 px-8 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
            >
              Criar Conta no Google <ExternalLink size={14}/>
            </a>
          </div>
        )}
      </div>

      {/* 2. MENU INTERNO E ABAS (Só exibe se estiver conectado) */}
      {connectionStatus === 'connected' && (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Navegação Lateral */}
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:w-64 flex-shrink-0 custom-scrollbar pb-2 lg:pb-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-transparent hover:border-slate-200'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Área de Conteúdo */}
          <div className="flex-1 min-h-[400px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                {/* ABA: PERFIL E DADOS */}
                {activeTab === 'profile' && (
                  <form onSubmit={handleUpdateProfile} className="bg-slate-50 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 space-y-5">
                    <h3 className="text-xl font-black uppercase text-slate-800 flex items-center gap-2 mb-4"><User size={20}/> Dados Comerciais (Google)</h3>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block ml-2">Nome da Loja no Maps</label>
                      <input type="text" required value={profileForm.title} onChange={e => setProfileForm({...profileForm, title: e.target.value})} className="w-full p-4 bg-white rounded-xl font-bold border border-slate-200 outline-none focus:ring-2 ring-blue-500 text-slate-700" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block ml-2">Telefone de Contato</label>
                      <input type="tel" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="w-full p-4 bg-white rounded-xl font-bold border border-slate-200 outline-none focus:ring-2 ring-blue-500 text-slate-700" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block ml-2">Descrição Oficial</label>
                      <textarea rows="4" required value={profileForm.description} onChange={e => setProfileForm({...profileForm, description: e.target.value})} className="w-full p-4 bg-white rounded-xl font-medium text-sm border border-slate-200 outline-none focus:ring-2 ring-blue-500 text-slate-700 resize-none"></textarea>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md disabled:opacity-50">
                      {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                      Salvar Alterações no Google
                    </button>
                  </form>
                )}

                {/* ABA: POSTAGENS */}
                {activeTab === 'posts' && (
                  <form onSubmit={handleCreatePost} className="bg-slate-50 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 space-y-5">
                    <h3 className="text-xl font-black uppercase text-slate-800 flex items-center gap-2 mb-4"><MessageSquare size={20}/> Nova Postagem (Feed)</h3>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block ml-2">Tipo de Postagem</label>
                      <select value={postForm.topicType} onChange={e => setPostForm({...postForm, topicType: e.target.value})} className="w-full p-4 bg-white rounded-xl font-bold border border-slate-200 outline-none focus:ring-2 ring-blue-500 text-slate-700 cursor-pointer">
                        <option value="STANDARD">Novidade (Atualização Padrão)</option>
                        <option value="OFFER">Oferta / Promoção</option>
                        <option value="EVENT">Evento</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block ml-2">URL da Imagem (Opcional)</label>
                      <input type="url" placeholder="https://..." value={postForm.imageUrl} onChange={e => setPostForm({...postForm, imageUrl: e.target.value})} className="w-full p-4 bg-white rounded-xl font-bold border border-slate-200 outline-none focus:ring-2 ring-blue-500 text-slate-700" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block ml-2">Texto da Postagem</label>
                      <textarea rows="4" required placeholder="Escreva a novidade para seus clientes..." value={postForm.summary} onChange={e => setPostForm({...postForm, summary: e.target.value})} className="w-full p-4 bg-white rounded-xl font-medium text-sm border border-slate-200 outline-none focus:ring-2 ring-blue-500 text-slate-700 resize-none"></textarea>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50">
                      {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                      Publicar no Google Agora
                    </button>
                  </form>
                )}

                {/* ABA: AVALIAÇÕES */}
                {activeTab === 'reviews' && (
                  <div className="bg-slate-50 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black uppercase text-slate-800 flex items-center gap-2"><Store size={20}/> Avaliações</h3>
                      <button onClick={fetchReviews} className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 hover:bg-blue-200 transition-all">
                        <RefreshCw size={14}/> Atualizar
                      </button>
                    </div>
                    <div className="space-y-4 overflow-y-auto max-h-[500px] custom-scrollbar pr-2">
                      {reviews.length === 0 ? (
                        <p className="text-center text-slate-400 font-bold p-8">Nenhuma avaliação encontrada.</p>
                      ) : reviews.map((review) => (
                        <div key={review.reviewId} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-black text-slate-800">{review.reviewer?.displayName || 'Cliente Google'}</span>
                            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-[10px] font-black tracking-widest">
                              {review.starRating} ESTRELAS
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-600 mb-4 italic">"{review.comment || 'Avaliação sem texto.'}"</p>
                          
                          {review.reviewReply ? (
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                              <p className="text-[10px] font-black uppercase text-blue-800 mb-1">Você respondeu:</p>
                              <p className="text-xs font-bold text-blue-900">{review.reviewReply.comment}</p>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                placeholder="Responda este cliente..." 
                                value={replyTexts[review.reviewId] || ''}
                                onChange={(e) => setReplyTexts({...replyTexts, [review.reviewId]: e.target.value})}
                                className="flex-1 p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none border border-slate-200 focus:ring-2 ring-blue-400"
                              />
                              <button 
                                onClick={() => handleReplyReview(review.reviewId)}
                                disabled={isLoading || !replyTexts[review.reviewId]}
                                className="bg-blue-600 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase shadow-md disabled:opacity-50"
                              >
                                Responder
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ABA: MÍDIAS E FOTOS */}
                {activeTab === 'media' && (
                  <div className="bg-slate-50 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 space-y-6">
                    <h3 className="text-xl font-black uppercase text-slate-800 flex items-center gap-2 mb-6"><ImageIcon size={20}/> Mídias Oficiais</h3>
                    
                    <form onSubmit={(e) => handleUploadMedia(e, 'PROFILE')} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-sm font-black uppercase text-slate-800 mb-4">Logomarca (Foto de Perfil)</h4>
                      <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                          <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block ml-2">URL Pública da Logo</label>
                          <input type="url" required placeholder="https://sua-imagem.com/logo.jpg" value={mediaForm.logoUrl} onChange={e => setMediaForm({...mediaForm, logoUrl: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl font-bold border border-slate-200 outline-none focus:ring-2 ring-blue-500 text-slate-700" />
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full md:w-auto bg-blue-600 text-white px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-md disabled:opacity-50">
                          Atualizar Logo
                        </button>
                      </div>
                    </form>

                    <form onSubmit={(e) => handleUploadMedia(e, 'COVER')} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-sm font-black uppercase text-slate-800 mb-4">Capa do Google Maps</h4>
                      <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                          <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block ml-2">URL Pública da Capa</label>
                          <input type="url" required placeholder="https://sua-imagem.com/capa.jpg" value={mediaForm.coverUrl} onChange={e => setMediaForm({...mediaForm, coverUrl: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl font-bold border border-slate-200 outline-none focus:ring-2 ring-blue-500 text-slate-700" />
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full md:w-auto bg-blue-600 text-white px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-md disabled:opacity-50">
                          Atualizar Capa
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* ABA: CARDÁPIO (PRODUTOS) */}
                {activeTab === 'menu' && (
                  <div className="bg-slate-50 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 text-center flex flex-col items-center justify-center min-h-[400px]">
                    <Package size={64} className="text-slate-300 mb-4"/>
                    <h3 className="text-2xl font-black uppercase text-slate-800 mb-2">Sincronização de Cardápio</h3>
                    <p className="text-sm font-bold text-slate-500 max-w-md mb-8">
                      Envie todos os produtos ativos do painel Velo Delivery diretamente para a aba "Produtos" do seu perfil no Google Maps.
                    </p>
                    <button 
                      onClick={handleSyncMenu}
                      disabled={isLoading}
                      className="bg-emerald-500 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-emerald-200 hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 w-full md:w-auto"
                    >
                      {isLoading ? <Loader2 size={20} className="animate-spin"/> : <UploadCloud size={20}/>}
                      Sincronizar Velo {'->'} Google
                    </button>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}