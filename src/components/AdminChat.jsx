import React, { useState, useEffect, useContext } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, setDoc } from 'firebase/firestore';
import { useStore } from '../context/StoreContext';
import { Search, MoreVertical, Paperclip, Mic, Send, User, CheckCheck } from 'lucide-react';

export default function AdminChat() {
    const { store } = useStore();
    const storeId = store?.slug; // Puxa o ID corretamente dentro do seu ecossistema
    const [messages, setMessages] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [loadingSend, setLoadingSend] = useState(false);

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

    // Agrupa mensagens por remetente (número do cliente) e captura o pushName
    const chats = messages.reduce((acc, msg) => {
        const phone = msg.from || msg.to; // 'from' é cliente, 'to' somos nós
        if (!phone) return acc;
        
        if (!acc[phone]) {
            acc[phone] = { phone, msgs: [], unreadCount: 0, pushName: msg.pushName || '' };
        }
        
        // Se a mensagem atual tem um pushName e ainda não tínhamos salvo, atualiza
        if (msg.pushName && !acc[phone].pushName) {
            acc[phone].pushName = msg.pushName;
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
        const unreadMsgs = chats[phone].msgs.filter(m => m.status === 'unread' && m.direction !== 'outbound');
        
        for (const msg of unreadMsgs) {
            await updateDoc(doc(db, 'whatsapp_inbound', msg.id), { status: 'read' });
        }
    };

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
                    direction: 'outbound' // Marca que fomos nós que enviamos
                });
                setReplyText('');
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
            <div className="w-[35%] max-w-[400px] min-w-[300px] border-r border-gray-200 bg-white flex flex-col">
                {/* Header Sidebar */}
                <div className="h-16 px-4 bg-[#f0f2f5] flex items-center justify-between border-b border-gray-200 shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white overflow-hidden">
                        <User size={24} />
                    </div>
                    <div className="flex items-center gap-4 text-gray-500">
                        <MoreVertical size={20} className="cursor-pointer" />
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
                                            {chat.pushName || `+${chat.phone}`}
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
                {/* Background Pattern WhatsApp */}
                <div className="absolute inset-0 z-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png")', backgroundSize: '400px' }}></div>

                {activeChat ? (
                    <>
                        {/* Header do Chat */}
                        <div className="h-16 px-4 bg-[#f0f2f5] border-b border-gray-200 flex justify-between items-center z-10 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white">
                                    <User size={24} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-semibold text-gray-800 text-sm">
                                        {chats[activeChat]?.pushName || `+${activeChat}`}
                                    </span>
                                    <span className="text-xs text-gray-500">{`+${activeChat}`}</span>
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
                                    <div key={msg.id} className={`max-w-[75%] md:max-w-[65%] px-3 py-1.5 rounded-lg relative shadow-sm text-[14px] leading-relaxed flex flex-col ${isOutbound ? 'bg-[#d9fdd3] text-[#111b21] self-end rounded-tr-none' : 'bg-white text-[#111b21] self-start rounded-tl-none'}`}>
                                        <span className="pr-12 whitespace-pre-wrap">{msg.text}</span>
                                        <div className="text-[10px] text-gray-500 self-end -mt-1 ml-4 flex items-center gap-1 float-right">
                                            {timeStr}
                                            {isOutbound && <CheckCheck size={14} className="text-[#53bdeb] ml-0.5" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Input de Resposta */}
                        <div className="px-4 py-3 bg-[#f0f2f5] flex items-center gap-3 z-10 shrink-0">
                            {/* Botão de Mídia / Arquivos */}
                            <button 
                                onClick={() => alert('O envio de mídia e arquivos requer integração nativa no backend do Webhook da Velo. Fale com o suporte técnico.')}
                                className="text-gray-500 hover:text-gray-700 p-2 rounded-full transition-colors"
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
                                />
                            </div>

                            {/* Alterna entre Enviar Áudio e Enviar Texto dinamicamente */}
                            {replyText.trim() ? (
                                <button 
                                    onClick={handleSendReply}
                                    disabled={loadingSend}
                                    className="text-white bg-[#00a884] p-2.5 rounded-full hover:bg-[#008f6f] transition-colors shadow-sm disabled:opacity-50"
                                >
                                    <Send size={20} className="ml-1" />
                                </button>
                            ) : (
                                <button 
                                    onClick={() => alert('O envio de áudios requer permissão de gravação do navegador e liberação no backend.')}
                                    className="text-gray-500 hover:text-gray-700 p-2 rounded-full transition-colors"
                                >
                                    <Mic size={24} />
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center z-10 p-8">
                        <div className="w-64 mb-6 opacity-30">
                            {/* Ilustração genérica de fundo similar ao WA */}
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