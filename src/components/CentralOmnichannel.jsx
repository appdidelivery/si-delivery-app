import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, query, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';
import { Search, Send, User, Phone, CheckCheck, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CentralOmnichannel({ storeId = 'main-app' }) {
    const [messages, setMessages] = useState([]);
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef(null);

    // 1. Escuta todas as mensagens do Inbound em Tempo Real
    useEffect(() => {
        const q = query(collection(db, 'whatsapp_inbound'), orderBy('receivedAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const storeMsgs = msgs.filter(m => m.storeId === storeId);
            setMessages(storeMsgs);

            // 2. Agrupa por Telefone para criar a "Lista de Contatos"
            const chatMap = new Map();
            storeMsgs.forEach(msg => {
                const phoneKey = msg.direction === 'inbound' ? msg.from : msg.to;
                if (!phoneKey) return;
                
                if (!chatMap.has(phoneKey)) {
                    chatMap.set(phoneKey, {
                        phone: phoneKey,
                        name: msg.pushName || msg.customerName || phoneKey,
                        lastMessage: msg.text,
                        lastTime: msg.receivedAt?.toMillis() || 0,
                        unread: msg.direction === 'inbound' && msg.status === 'unread' ? 1 : 0
                    });
                } else {
                    const existing = chatMap.get(phoneKey);
                    existing.lastMessage = msg.text;
                    existing.lastTime = msg.receivedAt?.toMillis() || existing.lastTime;
                    if (msg.direction === 'inbound' && msg.status === 'unread') {
                        existing.unread += 1;
                    }
                }
            });

            // Ordena os chats para mostrar quem mandou mensagem por último no topo
            const chatList = Array.from(chatMap.values()).sort((a, b) => b.lastTime - a.lastTime);
            setChats(chatList);
        });
        return () => unsubscribe();
    }, [storeId]);

    // Rola o chat para baixo automaticamente quando abre ou chega nova mensagem
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [activeChat, messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat) return;
        
        setIsSending(true);
        const textToSend = newMessage;
        setNewMessage(''); 

        try {
            // Dispara pela sua API da Vercel (A Rota chat_reply oficial da Meta)
            const res = await fetch('/api/whatsapp-send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat_reply',
                    storeId: storeId,
                    toPhone: activeChat.phone,
                    dynamicParams: { text: textToSend }
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Falha ao enviar mensagem pela Meta');
            }

            // O backend já cuida de salvar essa resposta enviada no 'whatsapp_inbound'
        } catch (error) {
            alert(`Erro: ${error.message}`);
            setNewMessage(textToSend); // Devolve o texto se der erro
        } finally {
            setIsSending(false);
        }
    };

    const activeMessages = messages.filter(m => 
        (m.direction === 'inbound' && m.from === activeChat?.phone) || 
        (m.direction === 'outbound' && m.to === activeChat?.phone)
    );

    return (
        <div className="flex h-[calc(100vh-100px)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden font-sans">
            {/* LISTA DE CHATS (ESQUERDA) */}
            <div className="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50">
                <div className="p-4 bg-white border-b border-slate-200">
                    <h2 className="font-black text-slate-800 text-lg uppercase tracking-tight flex items-center gap-2">
                        <MessageCircle className="text-blue-600"/> Velo Inbox
                    </h2>
                    <div className="mt-4 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Buscar conversa..." 
                            className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 ring-blue-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {chats.length === 0 ? (
                        <p className="text-center text-slate-400 text-xs font-bold mt-10">Caixa de entrada vazia.</p>
                    ) : (
                        chats.map(chat => (
                            <div 
                                key={chat.phone} 
                                onClick={() => setActiveChat(chat)}
                                className={`p-4 border-b border-slate-100 cursor-pointer transition-colors flex items-center gap-3 ${activeChat?.phone === chat.phone ? 'bg-blue-50' : 'hover:bg-white'}`}
                            >
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                    <User size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="font-bold text-slate-800 text-sm truncate">{chat.name}</h4>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            {chat.lastTime ? new Date(chat.lastTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate">{chat.lastMessage}</p>
                                </div>
                                {chat.unread > 0 && (
                                    <div className="w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                        {chat.unread}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ÁREA DA CONVERSA (DIREITA) */}
            <div className="flex-1 flex flex-col bg-[#e5e5e5] relative">
                <div className="absolute inset-0 opacity-10 bg-[url('https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png')] pointer-events-none"></div>
                
                {activeChat ? (
                    <>
                        {/* Header do Chat */}
                        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                    <User size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{activeChat.name}</h3>
                                    <p className="text-xs text-slate-500 flex items-center gap-1"><Phone size={10}/> {activeChat.phone}</p>
                                </div>
                            </div>
                        </div>

                        {/* Timeline de Mensagens */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 relative z-10 custom-scrollbar">
                            {activeMessages.map(msg => {
                                const isMe = msg.direction === 'outbound';
                                return (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={msg.id} 
                                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[70%] rounded-2xl p-3 shadow-sm relative ${isMe ? 'bg-[#d9fdd3] rounded-tr-sm' : 'bg-white rounded-tl-sm'}`}>
                                            {msg.mediaUrl && (
                                                <img src={msg.mediaUrl} alt="Mídia" className="rounded-xl mb-2 max-w-full h-auto max-h-60 object-cover" />
                                            )}
                                            <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                            <div className="flex items-center justify-end gap-1 mt-1">
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {msg.receivedAt ? new Date(msg.receivedAt.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Agora'}
                                                </span>
                                                {isMe && (
                                                    <CheckCheck size={12} className="text-blue-500" />
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input de Mensagem */}
                        <div className="p-4 bg-white border-t border-slate-200 relative z-10">
                            <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                                <textarea 
                                    rows="1"
                                    placeholder="Digite sua resposta..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(e);
                                        }
                                    }}
                                    className="flex-1 bg-slate-100 border-none rounded-2xl py-3 px-4 text-sm outline-none focus:ring-2 ring-blue-500 resize-none custom-scrollbar"
                                    style={{ minHeight: '44px', maxHeight: '120px' }}
                                />
                                <button 
                                    type="submit" 
                                    disabled={!newMessage.trim() || isSending}
                                    className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all shadow-sm"
                                >
                                    <Send size={16} className={isSending ? 'opacity-0' : 'opacity-100'} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 relative z-10">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                            <MessageCircle size={32} className="text-slate-300"/>
                        </div>
                        <h3 className="font-bold text-lg text-slate-600">Central Ativa</h3>
                        <p className="text-sm">Clique em um contato na esquerda para responder</p>
                    </div>
                )}
            </div>
        </div>
    );
}