import React, { useState, useEffect, useContext, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useStore } from '../context/StoreContext';
import { Search, MoreVertical, Paperclip, Mic, Send, User, CheckCheck, Reply, X, Square, Image as ImageIcon, Trash2, Edit3, Save, Info, Phone, ArrowLeft, Store, Loader2 } from 'lucide-react';

// Variáveis do Cloudinary (As mesmas usadas nos produtos)
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export default function AdminChat() {
    const { store } = useStore();
    const storeId = store?.slug; 
    const [messages, setMessages] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [loadingSend, setLoadingSend] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null); 
    const [addressBook, setAddressBook] = useState({}); // NOVO: Agenda de Contatos Inteligente
    
    // --- NOVO: ESTADOS DO PERFIL DO CLIENTE (CRM) ---
    const [showContactInfo, setShowContactInfo] = useState(false);
    const [customersData, setCustomersData] = useState({});
    const [contactForm, setContactForm] = useState({ name: '', email: '', notes: '' });

    // --- ESTADOS DO PERFIL DA LOJA (ESTILO WPP WEB) ---
    const [showStoreProfile, setShowStoreProfile] = useState(false);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [storeProfileForm, setStoreProfileForm] = useState({
        description: store?.slogan || 'Atendimento automatizado',
        address: store?.address || '',
        email: store?.ownerEmail || '',
        website: `https://${storeId}.velodelivery.com.br`
    });

    const handleUpdateStoreProfile = async () => {
        setIsUpdatingProfile(true);
        try {
            const res = await fetch('/api/whatsapp-send', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'update_profile', 
                    storeId: storeId,
                    ...storeProfileForm
                })
            });
            if(res.ok) {
                alert("✅ Perfil Comercial atualizado no WhatsApp!");
            } else {
                alert("❌ Erro ao atualizar perfil. Verifique as credenciais.");
            }
        } catch(e) {
            alert("Erro de conexão com o servidor.");
        } finally {
            setIsUpdatingProfile(false);
        }
    };
    
    // --- ESTADOS PARA ÁUDIO E ARQUIVOS ---
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);
    const fileInputRef = useRef(null);

    // Busca as mensagens da loja em tempo real (Blindado contra erro de Índice Composto)
    useEffect(() => {
        if (!storeId) return;

        // Removemos o orderBy daqui para não depender de Índice Composto manual no Firebase
        const q = query(
            collection(db, 'whatsapp_inbound'),
            where('storeId', '==', storeId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Ordenamos no próprio frontend de forma segura e cronológica
            msgs.sort((a, b) => {
                const timeA = a.receivedAt?.toMillis ? a.receivedAt.toMillis() : (a.receivedAt?.seconds * 1000 || 0);
                const timeB = b.receivedAt?.toMillis ? b.receivedAt.toMillis() : (b.receivedAt?.seconds * 1000 || 0);
                return timeA - timeB; 
            });

            setMessages(msgs);
        }, (error) => {
            // Se der qualquer outro erro de permissão, agora aparecerá no console
            console.error("🔥 Erro no onSnapshot do WhatsApp:", error);
        });

        return () => unsubscribe();
    }, [storeId]);

    // --- NOVO: BUSCA O NOME DOS CLIENTES DIRETAMENTE DOS PEDIDOS (AGENDA) ---
    useEffect(() => {
        if (!storeId) return;
        const q = query(collection(db, 'orders'), where('storeId', '==', storeId));
        const unsub = onSnapshot(q, (snapshot) => {
            const book = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.customerPhone && data.customerName) {
                    // Limpa o telefone para cruzar perfeitamente com o chat
                    let phone = String(data.customerPhone).replace(/\D/g, '');
                    if (phone.length >= 10 && !phone.startsWith('55')) phone = '55' + phone;
                    // Associa o número ao nome (o último pedido sobreescreve, mantendo atualizado)
                    book[phone] = data.customerName;
                }
            });
            setAddressBook(book);
        });
        return () => unsub();
    }, [storeId]);

    // Função para apagar mensagem do banco de dados
    const handleDeleteMessage = async (msgId) => {
        if (window.confirm("Tem certeza que deseja apagar esta mensagem para você?")) {
            try {
                await deleteDoc(doc(db, 'whatsapp_inbound', msgId));
            } catch (error) {
                console.error("Erro ao apagar mensagem:", error);
                alert("Erro ao tentar apagar a mensagem.");
            }
        }
    };

    // Agrupa mensagens BLINDADO (Garante que mensagens do cliente e da loja se unam pelo número certo)
    const chats = messages.reduce((acc, msg) => {
        // Se a direção for outbound (nós enviamos), o cliente é o 'to'. Se for inbound, o cliente é o 'from'.
        const phone = msg.direction === 'outbound' ? msg.to : msg.from; 
        if (!phone) return acc;
        
        const clientName = msg.pushName || msg.profileName || msg.senderName || msg.name || '';

        if (!acc[phone]) {
            acc[phone] = { phone, msgs: [], unreadCount: 0, pushName: clientName };
        }
        
        if (clientName && !acc[phone].pushName) {
            acc[phone].pushName = clientName;
        }
        
        acc[phone].msgs.push(msg);
        
        if (msg.status === 'unread' && msg.direction !== 'outbound') {
            acc[phone].unreadCount += 1;
        }
        return acc;
    }, {});

    // Transforma em array e ordena para que o cliente com a mensagem mais recente fique no topo da lista
    const chatList = Object.values(chats).sort((a, b) => {
        const lastMsgA = a.msgs[a.msgs.length - 1];
        const lastMsgB = b.msgs[b.msgs.length - 1];
        const timeA = lastMsgA?.receivedAt?.toMillis ? lastMsgA.receivedAt.toMillis() : (lastMsgA?.receivedAt?.seconds * 1000 || 0);
        const timeB = lastMsgB?.receivedAt?.toMillis ? lastMsgB.receivedAt.toMillis() : (lastMsgB?.receivedAt?.seconds * 1000 || 0);
        return timeB - timeA; // Ordem decrescente (mais novos primeiro)
    });
    
    const activeMessages = activeChat ? chats[activeChat]?.msgs || [] : [];

   // Marca como lido ao abrir o chat
    const handleOpenChat = async (phone) => {
        setActiveChat(phone);
        
        // Popula o formulário do painel lateral com os dados salvos
        setContactForm({
            name: customersData[phone]?.name || addressBook[phone] || chats[phone]?.pushName || '',
            email: customersData[phone]?.email || '',
            notes: customersData[phone]?.notes || ''
        });

        const unreadMsgs = chats[phone].msgs.filter(m => m.status === 'unread' && m.direction !== 'outbound');
        
        for (const msg of unreadMsgs) {
            await updateDoc(doc(db, 'whatsapp_inbound', msg.id), { status: 'read' });
        }
    };

    // Helper para o nome do cliente (Blindado)
    const getDisplayName = (phone) => {
        // 1º Prioridade: O nome salvo manualmente pelo lojista no CRM
        const crmName = customersData[phone]?.name;
        if (crmName && crmName.trim() !== '') return crmName;
        
        // 2º Prioridade: O nome que o cliente digitou no site ao fazer um pedido
        const addressBookName = addressBook[phone];
        if (addressBookName && addressBookName.trim() !== '') return addressBookName;

        // 3º Prioridade: O nome público do perfil do WhatsApp do cliente
        const pushName = chats[phone]?.pushName;
        if (pushName && pushName.trim() !== '') return pushName;

        // 4º Falback: Se não tiver nada, mostra o número
        return `+${phone}`;
    };

   // Função para salvar dados do cliente no banco (Com Atualização Otimista)
    const handleSaveCustomer = async () => {
        if (!activeChat || !storeId) return;
        
        // 1. Atualiza a tela NA HORA (Optimistic Update) para o lojista não ter que esperar o banco
        setCustomersData(prev => ({
            ...prev,
            [activeChat]: {
                ...prev[activeChat],
                phone: activeChat,
                name: contactForm.name,
                email: contactForm.email,
                notes: contactForm.notes
            }
        }));

        try {
            // 2. Salva no banco de dados em background
            await setDoc(doc(db, 'customers', `${storeId}_${activeChat}`), {
                storeId: storeId,
                phone: activeChat,
                name: contactForm.name,
                email: contactForm.email,
                notes: contactForm.notes,
                updatedAt: serverTimestamp()
            }, { merge: true });
            alert("✅ Dados do cliente salvos com sucesso!");
        } catch (e) {
            console.error("Erro ao salvar cliente:", e);
            alert("Erro ao salvar os dados do contato. Verifique sua conexão.");
        }
    };
// --- FUNÇÕES DE MÍDIA (ÁUDIO E IMAGEM) ---
    const uploadToCloudinary = async (file, resourceType = 'auto') => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        return data.secure_url;
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
                setLoadingSend(true);
                try {
                    const file = new File([audioBlob], "audio_message.mp3", { type: 'audio/mp3' });
                    const mediaUrl = await uploadToCloudinary(file, 'video'); // Cloudinary usa 'video' para áudio
                    await sendMediaMessage(mediaUrl, 'audio');
                } catch (e) {
                    alert("Erro ao enviar áudio.");
                } finally {
                    setLoadingSend(false);
                }
                stream.getTracks().forEach(track => track.stop()); // Desliga o microfone
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerIntervalRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        } catch (err) {
            alert("Permissão de microfone negada. Libere no navegador.");
        }
    };

    const stopRecordingAndSend = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerIntervalRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop(); // Para a gravação
            audioChunksRef.current = []; // Limpa os dados para não enviar
            setIsRecording(false);
            clearInterval(timerIntervalRef.current);
            // Um pequeno delay para garantir que o onstop não tente enviar array vazio
            setTimeout(() => setLoadingSend(false), 500); 
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoadingSend(true);
        try {
            const mediaUrl = await uploadToCloudinary(file, 'image');
            await sendMediaMessage(mediaUrl, 'image');
        } catch (err) {
            alert("Erro ao enviar imagem.");
        } finally {
            setLoadingSend(false);
            e.target.value = ''; // Limpa o input
        }
    };

    const sendMediaMessage = async (mediaUrl, type) => {
        if (!activeChat) return;
        try {
            // Dispara a API (Manda a URL como texto caso o webhook não suporte mídia nativa ainda)
            const response = await fetch('/api/whatsapp-send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat_reply',
                    storeId: storeId,
                    toPhone: activeChat,
                    dynamicParams: { 
                        text: type === 'audio' ? `🎤 Áudio: ${mediaUrl}` : `📷 Imagem: ${mediaUrl}`,
                        mediaUrl: mediaUrl,
                        mediaType: type
                    }
                })
            });

            if (response.ok) {
                // Salva no Firebase para renderizar no chat visualmente
                await addDoc(collection(db, 'whatsapp_inbound'), {
                    storeId: storeId,
                    to: activeChat,
                    text: '',
                    mediaUrl: mediaUrl,
                    mediaType: type,
                    receivedAt: serverTimestamp(),
                    status: 'read',
                    direction: 'outbound'
                });
            }
        } catch (error) {
            console.error('Erro ao enviar mídia:', error);
        }
    };
    // ----------------------------------------
    // Envia a resposta usando a nossa API e salva no banco
    const handleSendReply = async () => {
        if (!replyText.trim() || !activeChat) return;
        setLoadingSend(true);

        try {
            // 1. Dispara via API
            const response = await fetch('/api/whatsapp-send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat_reply',
                    storeId: storeId,
                    toPhone: activeChat,
                    dynamicParams: { text: replyText }
                })
            });

            const data = await response.json();

            if (data.success) {
                // 2. Salva no Firebase para aparecer no histórico (como mensagem enviada pela loja)
                await addDoc(collection(db, 'whatsapp_inbound'), {
                    storeId: storeId,
                    to: activeChat,
                    text: replyText,
                    receivedAt: serverTimestamp(),
                    status: 'read',
                    direction: 'outbound', 
                    quotedMsg: replyingTo ? replyingTo.text : null // Salva no banco o contexto da resposta
                });
                setReplyText('');
                setReplyingTo(null); // Limpa o bloco de citação após enviar
            } else {
                alert('Erro ao enviar mensagem: ' + (data.error || 'Falha na Meta'));
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro de conexão ao enviar mensagem.');
        } finally {
            setLoadingSend(false);
        }
    };
// --- LÓGICA DE REATIVAR O BOT (ENCERRAR ATENDIMENTO) ---
    const handleEndSession = async () => {
        if (!activeChat || !storeId) return;
        
        if (window.confirm("Encerrar este atendimento? O robô voltará a responder este cliente automaticamente na próxima mensagem.")) {
            try {
                // Atualiza a sessão para botPaused: false
                await setDoc(doc(db, 'whatsapp_sessions', `${storeId}_${activeChat}`), {
                    storeId: storeId,
                    phone: activeChat,
                    botPaused: false,
                    updatedAt: serverTimestamp()
                }, { merge: true });
                
                alert("✅ Atendimento encerrado! O bot foi reativado para este cliente.");
                setActiveChat(null); // Fecha a tela de conversa atual
            } catch (error) {
                console.error("Erro ao reativar bot:", error);
                alert("Erro ao encerrar atendimento.");
            }
        }
    };
    return (
        <div className="flex h-[750px] border border-slate-200 rounded-2xl bg-[#f0f2f5] overflow-hidden shadow-lg">
            {/* Sidebar: Lista de Contatos */}
            <div className="w-[35%] max-w-[400px] min-w-[300px] border-r border-gray-200 bg-white flex flex-col relative overflow-hidden">
                
                {/* Header Sidebar (Gatilhos) */}
                <div className="h-16 px-4 bg-[#f0f2f5] flex items-center justify-between border-b border-gray-200 shrink-0">
                    <div 
                        className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setShowStoreProfile(true)}
                        title="Editar Perfil da Loja"
                    >
                        {store?.storeLogoUrl ? <img src={store.storeLogoUrl} className="w-full h-full object-cover" /> : <Store size={20} />}
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                        <button onClick={() => setShowStoreProfile(true)} className="p-2 hover:bg-gray-200 rounded-full transition-colors" title="Configurações do Perfil">
                            <MoreVertical size={20} />
                        </button>
                    </div>
                </div>

                {/* --- MENU DESLIZANTE: PERFIL DA LOJA (WPP WEB STYLE) --- */}
                <div className={`absolute inset-0 bg-[#f0f2f5] z-30 flex flex-col transition-transform duration-300 ${showStoreProfile ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="h-28 bg-[#008069] text-white flex items-end px-6 pb-4 shrink-0 shadow-md gap-6">
                        <button onClick={() => setShowStoreProfile(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors mb-1">
                            <ArrowLeft size={24} />
                        </button>
                        <h2 className="text-xl font-bold">Perfil Comercial</h2>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f0f2f5]">
                        <div className="bg-white p-6 flex flex-col items-center justify-center shadow-sm mb-2">
                            <div 
                                className="w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 overflow-hidden mb-4 relative group cursor-pointer shadow-md" 
                                onClick={() => window.open('https://business.facebook.com/wa/manage/phone-numbers/', '_blank')}
                            >
                                {store?.storeLogoUrl ? <img src={store.storeLogoUrl} className="w-full h-full object-cover" /> : <Store size={64} />}
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white text-xs font-bold text-center px-2">MUDAR FOTO<br/>NA META</span>
                                </div>
                            </div>
                            <h3 className="font-black text-xl text-slate-800">{store?.name || 'Sua Loja'}</h3>
                        </div>

                        <div className="bg-white p-5 shadow-sm mb-2 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-[#008069] mb-1 block">Recado / Slogan</label>
                                <textarea 
                                    rows="2"
                                    className="w-full border-b-2 border-gray-200 focus:border-[#008069] outline-none text-sm text-gray-700 resize-none py-1 bg-transparent transition-colors"
                                    value={storeProfileForm.description}
                                    onChange={(e) => setStoreProfileForm({...storeProfileForm, description: e.target.value})}
                                    placeholder="Ex: Atendimento das 18h às 23h"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-[#008069] mb-1 block">Endereço</label>
                                <input 
                                    type="text"
                                    className="w-full border-b-2 border-gray-200 focus:border-[#008069] outline-none text-sm text-gray-700 py-1 bg-transparent transition-colors"
                                    value={storeProfileForm.address}
                                    onChange={(e) => setStoreProfileForm({...storeProfileForm, address: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-[#008069] mb-1 block">E-mail de Contato</label>
                                <input 
                                    type="email"
                                    className="w-full border-b-2 border-gray-200 focus:border-[#008069] outline-none text-sm text-gray-700 py-1 bg-transparent transition-colors"
                                    value={storeProfileForm.email}
                                    onChange={(e) => setStoreProfileForm({...storeProfileForm, email: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-[#008069] mb-1 block">Site</label>
                                <input 
                                    type="text"
                                    className="w-full border-b-2 border-gray-200 focus:border-[#008069] outline-none text-sm text-gray-700 py-1 bg-transparent transition-colors"
                                    value={storeProfileForm.website}
                                    onChange={(e) => setStoreProfileForm({...storeProfileForm, website: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="p-6">
                            <button 
                                onClick={handleUpdateStoreProfile}
                                disabled={isUpdatingProfile}
                                className="w-full bg-[#008069] text-white py-3.5 rounded-full font-bold uppercase tracking-widest text-xs shadow-md hover:bg-[#016d5a] transition-all flex items-center justify-center gap-2 disabled:opacity-70 active:scale-95"
                            >
                                {isUpdatingProfile ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                {isUpdatingProfile ? 'Salvando...' : 'Salvar Perfil'}
                            </button>
                            <p className="text-center text-[10px] text-gray-400 mt-4">
                                O nome da empresa e a foto oficial devem ser alterados diretamente no portal da Meta por questões de segurança.
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* Busca */}
                <div className="p-2 border-b border-gray-200 bg-white">
                    <div className="bg-[#f0f2f5] flex items-center gap-3 px-3 py-1.5 rounded-lg">
                        <Search size={18} className="text-gray-500" />
                        <input 
                            type="text" 
                            placeholder="Pesquisar ou começar nova conversa" 
                            className="bg-transparent border-none outline-none w-full text-sm text-gray-700 placeholder-gray-500"
                        />
                    </div>
                </div>

                {/* Lista de Chats */}
                <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
                    {chatList.length === 0 && <p className="p-6 text-center text-sm text-gray-500">Nenhuma mensagem ainda.</p>}
                    {chatList.map((chat) => {
                        const lastMsg = chat.msgs[chat.msgs.length - 1];
                        const dateObj = lastMsg?.receivedAt?.toDate ? lastMsg.receivedAt.toDate() : new Date(lastMsg?.receivedAt?.seconds * 1000 || Date.now());
                        const timeString = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        
                        return (
                            <div 
                                key={chat.phone} 
                                onClick={() => handleOpenChat(chat.phone)}
                                className={`flex items-center gap-3 px-3 py-3 border-b border-gray-100 cursor-pointer hover:bg-[#f5f6f6] transition-colors ${activeChat === chat.phone ? 'bg-[#f0f2f5]' : ''}`}
                            >
                                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                                    <User size={28} />
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-semibold text-gray-800 text-sm truncate">
                                            {getDisplayName(chat.phone)}
                                        </span>
                                        <span className={`text-[11px] ${chat.unreadCount > 0 ? 'text-[#25d366] font-bold' : 'text-gray-400'}`}>
                                            {timeString}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500 truncate pr-2">
                                            {lastMsg?.direction === 'outbound' ? '✓ ' : ''}{lastMsg?.text}
                                        </span>
                                        {chat.unreadCount > 0 && (
                                            <span className="bg-[#25d366] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                                                {chat.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

           {/* Main: Área de Mensagens */}
            <div className="flex-1 flex flex-col relative bg-[#efeae2]">
                {/* Background Pattern WhatsApp (SVG Nativo para não dar erro 404) */}
                <div className="absolute inset-0 z-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', backgroundSize: '120px' }}></div>

                {activeChat ? (
                    <div className="flex flex-1 overflow-hidden w-full h-full z-10 relative">
                        {/* COLUNA DO CHAT */}
                        <div className="flex-1 flex flex-col relative bg-[#efeae2]">
                            {/* Header do Chat */}
                            <div className="h-16 px-4 bg-[#f0f2f5] border-b border-gray-200 flex justify-between items-center z-10 shrink-0">
                                <div 
                                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-200 p-2 rounded-xl transition-colors"
                                    onClick={() => {
                                        setContactForm({
                                            name: getDisplayName(activeChat) !== `+${activeChat}` ? getDisplayName(activeChat) : '',
                                            email: customersData[activeChat]?.email || '',
                                            notes: customersData[activeChat]?.notes || ''
                                        });
                                        setShowContactInfo(!showContactInfo);
                                    }}
                                    title="Ver dados do contato"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white shadow-sm">
                                        <User size={24} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-gray-800 text-sm">
                                            {getDisplayName(activeChat)}
                                        </span>
                                        <span className="text-xs text-gray-500 cursor-pointer flex items-center gap-1 hover:text-blue-500">
                                            {`+${activeChat}`} <Info size={12}/>
                                        </span>
                                    </div>
                                </div>
                            
                            <button 
                                onClick={handleEndSession}
                                className="bg-white hover:bg-green-50 text-[#008069] border border-gray-200 hover:border-[#008069] px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-sm flex items-center gap-2"
                            >
                                🤖 Reativar Bot
                            </button>
                        </div>
                        
                        {/* Histórico */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-2 flex flex-col z-10 custom-scrollbar">
                            {/* Mensagem de Criptografia padrão WA */}
                            <div className="mx-auto bg-[#ffeecd] text-gray-600 text-[11px] px-4 py-1.5 rounded-lg shadow-sm mb-4">
                                🔒 As mensagens são protegidas com a criptografia de ponta a ponta da Velo.
                            </div>

                           {activeMessages.map((msg) => {
                                const isOutbound = msg.direction === 'outbound';
                                const msgDate = msg.receivedAt?.toDate ? msg.receivedAt.toDate() : new Date(msg.receivedAt?.seconds * 1000 || Date.now());
                                const timeStr = msgDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                                return (
                                    <div key={msg.id} className={`group relative max-w-[75%] md:max-w-[65%] px-3 py-1.5 rounded-lg shadow-sm text-[14px] leading-relaxed flex flex-col ${isOutbound ? 'bg-[#d9fdd3] text-[#111b21] self-end rounded-tr-none' : 'bg-white text-[#111b21] self-start rounded-tl-none'}`}>
                                        
                                        {/* Ações da Mensagem (Aparecem no Hover) */}
                                        <div className={`absolute top-1 ${isOutbound ? '-left-20' : '-right-20'} opacity-0 group-hover:opacity-100 flex items-center gap-1 z-20 transition-all`}>
                                            <button 
                                                onClick={() => handleDeleteMessage(msg.id)}
                                                className="p-1.5 bg-white rounded-full shadow-md text-gray-400 hover:text-red-500 transition-colors"
                                                title="Apagar Mensagem"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                            <button 
                                                onClick={() => setReplyingTo(msg)}
                                                className="p-1.5 bg-white rounded-full shadow-md text-gray-400 hover:text-blue-500 transition-colors"
                                                title="Responder Mensagem"
                                            >
                                                <Reply size={16}/>
                                            </button>
                                        </div>

                                        {/* Se a mensagem for uma resposta a algo, mostra o balãozinho de citação */}

                                        {/* Renderizador de Mídia (Imagens e Áudios) */}
                                        {msg.mediaType === 'image' && msg.mediaUrl && (
                                            <div className="mb-1 rounded-lg overflow-hidden cursor-pointer" onClick={() => window.open(msg.mediaUrl, '_blank')}>
                                                <img src={msg.mediaUrl} className="max-w-[250px] max-h-[250px] object-cover" alt="Imagem" />
                                            </div>
                                        )}
                                        
                                        {msg.mediaType === 'audio' && msg.mediaUrl && (
                                            <div className="mb-1 w-[250px]">
                                                <audio controls className="h-10 w-full">
                                                    <source src={msg.mediaUrl} type="audio/mp3" />
                                                    <source src={msg.mediaUrl} type="audio/ogg" />
                                                </audio>
                                            </div>
                                        )}

                                        {msg.text && <span className="pr-12 whitespace-pre-wrap">{msg.text}</span>}
                                        
                                        <div className={`text-[10px] text-gray-500 self-end ml-4 flex items-center gap-1 float-right ${(!msg.text && msg.mediaUrl) ? 'mt-1' : '-mt-1'}`}>
                                            {timeStr}
                                            {isOutbound && <CheckCheck size={14} className="text-[#53bdeb] ml-0.5" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Bloco de Visualização da Resposta (Fica grudado em cima do input) */}
                        {replyingTo && (
                            <div className="bg-[#f0f2f5] px-4 pt-3 -mb-1 z-10 flex flex-col relative shrink-0">
                                <div className="bg-white border-l-4 border-[#00a884] p-3 rounded-t-xl flex justify-between items-start shadow-sm">
                                    <div className="flex flex-col flex-1 overflow-hidden pr-4">
                                        <span className="font-bold text-[#00a884] text-xs mb-0.5">Respondendo a {replyingTo.direction === 'outbound' ? 'você mesmo' : (chats[activeChat]?.pushName || 'Cliente')}</span>
                                        <span className="text-gray-600 text-sm line-clamp-1">{replyingTo.text}</span>
                                    </div>
                                    <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                       {/* Input de Resposta */}
                        <div className={`px-4 py-3 bg-[#f0f2f5] flex items-center gap-3 z-10 shrink-0 ${replyingTo ? 'pt-0' : ''}`}>
                            
                            {/* Input Escondido para upload de arquivo */}
                            <input 
                                type="file" 
                                accept="image/*" 
                                ref={fileInputRef} 
                                onChange={handleFileSelect} 
                                className="hidden" 
                            />

                            {isRecording ? (
                                /* --- UI DE GRAVAÇÃO DE ÁUDIO --- */
                                <div className="flex-1 bg-white rounded-xl px-4 py-2 shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-red-500">
                                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                                        <span className="font-medium">
                                            Gravando... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                                        </span>
                                    </div>
                                    <button onClick={cancelRecording} className="text-gray-400 hover:text-red-500 font-bold text-sm uppercase">
                                        Cancelar
                                    </button>
                                </div>
                            ) : (
                                /* --- UI PADRÃO DE TEXTO --- */
                                <>
                                    <button 
                                        onClick={() => fileInputRef.current.click()}
                                        className="text-gray-500 hover:text-gray-700 p-2 rounded-full transition-colors"
                                        title="Anexar Imagem"
                                    >
                                        <Paperclip size={24} />
                                    </button>
                                    
                                    <div className="flex-1 bg-white rounded-xl px-4 py-2 shadow-sm flex items-center">
                                        <input 
                                            type="text"
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                                            placeholder="Mensagem"
                                            className="w-full bg-transparent border-none outline-none text-sm text-gray-800"
                                            disabled={loadingSend}
                                        />
                                    </div>
                                </>
                            )}

                            {/* Alterna entre Botões: Enviar Texto, Enviar Áudio ou Iniciar Áudio */}
                            {loadingSend ? (
                                <div className="p-2.5 text-gray-400 animate-pulse"><Send size={20}/></div>
                            ) : replyText.trim() ? (
                                <button 
                                    onClick={handleSendReply}
                                    className="text-white bg-[#00a884] p-2.5 rounded-full hover:bg-[#008f6f] transition-colors shadow-sm"
                                >
                                    <Send size={20} className="ml-1" />
                                </button>
                            ) : isRecording ? (
                                <button 
                                    onClick={stopRecordingAndSend}
                                    className="text-white bg-green-500 p-2.5 rounded-full hover:bg-green-600 transition-colors shadow-sm"
                                    title="Enviar Áudio"
                                >
                                    <Send size={20} className="ml-1" />
                                </button>
                            ) : (
                                <button 
                                    onClick={startRecording}
                                    className="text-gray-500 hover:text-gray-700 p-2 rounded-full transition-colors"
                                    title="Gravar Áudio"
                                >
                                    <Mic size={24} />
                               </button>
                            )}
                        </div>
                        </div>

                        {/* --- COLUNA DE INFORMAÇÕES DO CONTATO (SIDEBAR DIREITA CRM) --- */}
                        {showContactInfo && (
                            <div className="w-[320px] bg-white border-l border-gray-200 flex flex-col z-20 shrink-0 shadow-2xl animate-in slide-in-from-right-8">
                                <div className="h-16 px-4 bg-[#f0f2f5] flex items-center gap-4 border-b border-gray-200 shrink-0">
                                    <button onClick={() => setShowContactInfo(false)} className="text-gray-500 hover:text-gray-700">
                                        <X size={20} />
                                    </button>
                                    <span className="font-bold text-gray-700">Dados do Contato</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50">
                                    <div className="flex flex-col items-center text-center">
                                        <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mb-4 shadow-inner">
                                            <User size={48} />
                                        </div>
                                        <h3 className="font-black text-xl text-slate-800 leading-tight">{getDisplayName(activeChat)}</h3>
                                        <p className="text-sm font-bold text-slate-400 mt-1 flex items-center gap-1 justify-center">
                                            <Phone size={14}/> +{activeChat}
                                        </p>
                                    </div>

                                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                            <Edit3 size={14}/> Editar Perfil
                                        </h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nome / Apelido</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Nome do Cliente"
                                                    value={contactForm.name}
                                                    onChange={e => setContactForm({...contactForm, name: e.target.value})}
                                                    className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none font-bold text-sm focus:ring-2 ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">E-mail</label>
                                                <input 
                                                    type="email" 
                                                    placeholder="cliente@email.com"
                                                    value={contactForm.email}
                                                    onChange={e => setContactForm({...contactForm, email: e.target.value})}
                                                    className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none font-bold text-sm focus:ring-2 ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Anotações Internas (Ex: Chato, Endereço)</label>
                                                <textarea 
                                                    rows="3"
                                                    placeholder="Preferências, endereço, observações..."
                                                    value={contactForm.notes}
                                                    onChange={e => setContactForm({...contactForm, notes: e.target.value})}
                                                    className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none font-medium text-sm focus:ring-2 ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleSaveCustomer}
                                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-md hover:bg-blue-700 transition-all active:scale-95 flex justify-center items-center gap-2 mt-2"
                                        >
                                            <Save size={16}/> Salvar Contato
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center z-10 p-8">
                        <div className="w-64 mb-6 opacity-30">
                            <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full text-gray-500">
                                <circle cx="50" cy="50" r="40" strokeDasharray="5,5"/>
                                <path d="M30 50 l15 15 l30 -30"/>
                            </svg>
                        </div>
                        <h2 className="text-3xl font-light text-[#41525d] mb-4">Velo Web</h2>
                        <p className="text-sm text-[#8696a0] max-w-md leading-relaxed">
                            Envie e receba mensagens mais rápido diretamente do painel da sua loja.<br/>
                            O assistente virtual (Bot) intercepta mensagens novas, mas você pode assumir o controle clicando em qualquer cliente ao lado.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}