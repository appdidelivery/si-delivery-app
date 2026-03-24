import React, { useState, useEffect, useContext } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, setDoc } from 'firebase/firestore';
import { useStore } from '../context/StoreContext';

export default function AdminChat() {
    const { store } = useStore();
    const storeId = store?.slug; // Puxa o ID corretamente dentro do seu ecossistema
    const [messages, setMessages] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [loadingSend, setLoadingSend] = useState(false);

    // Busca as mensagens da loja em tempo real
    useEffect(() => {
        if (!storeId) return;

        const q = query(
            collection(db, 'whatsapp_inbound'),
            where('storeId', '==', storeId),
            orderBy('receivedAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [storeId]);

    // Agrupa mensagens por remetente (número do cliente)
    const chats = messages.reduce((acc, msg) => {
        const phone = msg.from || msg.to; // 'from' é cliente, 'to' somos nós (quando respondemos)
        if (!phone) return acc;
        
        if (!acc[phone]) {
            acc[phone] = { phone, msgs: [], unreadCount: 0 };
        }
        acc[phone].msgs.push(msg);
        if (msg.status === 'unread' && msg.direction !== 'outbound') {
            acc[phone].unreadCount += 1;
        }
        return acc;
    }, {});

    const chatList = Object.values(chats);
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
        <div className="flex h-[600px] border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
            {/* Sidebar: Lista de Contatos */}
            <div className="w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col">
                <div className="p-4 bg-white border-b border-gray-200 font-bold text-gray-700">
                    Caixa de Entrada
                </div>
                <div className="flex-1 overflow-y-auto">
                    {chatList.length === 0 && <p className="p-4 text-sm text-gray-500">Nenhuma mensagem ainda.</p>}
                    {chatList.map((chat) => (
                        <div 
                            key={chat.phone} 
                            onClick={() => handleOpenChat(chat.phone)}
                            className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${activeChat === chat.phone ? 'bg-blue-100' : ''}`}
                        >
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-gray-800">+{chat.phone}</span>
                                {chat.unreadCount > 0 && (
                                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                        {chat.unreadCount}
                                    </span>
                                )}
                            </div>
                            <div className="text-sm text-gray-500 truncate mt-1">
                                {chat.msgs[chat.msgs.length - 1]?.text}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main: Área de Mensagens */}
            <div className="w-2/3 flex flex-col bg-slate-50">
                {activeChat ? (
                    <>
                        {/* Header do Chat */}
                        <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
                            <span className="font-bold text-gray-700">Conversando com +{activeChat}</span>
                            <button 
                                onClick={handleEndSession}
                                className="bg-slate-100 hover:bg-green-100 text-green-700 border border-slate-200 hover:border-green-300 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                            >
                                🤖 Encerrar e Ligar Bot
                            </button>
                        </div>
                        
                        {/* Histórico */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col">
                            {activeMessages.map((msg) => {
                                const isOutbound = msg.direction === 'outbound';
                                return (
                                    <div key={msg.id} className={`max-w-[75%] p-3 rounded-lg ${isOutbound ? 'bg-blue-500 text-white self-end rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 self-start rounded-bl-none shadow-sm'}`}>
                                        {msg.text}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Input de Resposta */}
                        <div className="p-4 bg-white border-t border-gray-200 flex gap-2">
                            <input 
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                                placeholder="Digite sua resposta..."
                                className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button 
                                onClick={handleSendReply}
                                disabled={loadingSend || !replyText.trim()}
                                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {loadingSend ? 'Enviando...' : 'Enviar'}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        Selecione um cliente ao lado para iniciar.
                    </div>
                )}
            </div>
        </div>
    );
}