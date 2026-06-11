import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { Send, X, CheckCheck, Loader2 } from 'lucide-react';

export default function ProspectChat({ lead, onClose }) {
    const [messages, setMessages] = useState([]);
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);

    // O ID da "loja" do seu CRM (onde o Token da Meta do CRM ficará salvo)
    const CRM_STORE_ID = 'velo_crm';

    useEffect(() => {
        if (!lead || !lead.phone) return;

        // Limpa e padroniza o telefone do lead para buscar o histórico
        let safePhone = String(lead.phone).replace(/\D/g, '');
        if (safePhone.length >= 10 && !safePhone.startsWith('55')) {
            safePhone = `55${safePhone}`;
        }

        const q = query(
            collection(db, 'whatsapp_inbound'),
            where('storeId', '==', CRM_STORE_ID),
            where('to', '==', safePhone) // Busca as enviadas
        );

        const q2 = query(
            collection(db, 'whatsapp_inbound'),
            where('storeId', '==', CRM_STORE_ID),
            where('from', '==', safePhone) // Busca as recebidas
        );

        // Como o Firebase exige índice composto para 'or', fazemos duas escutas e unimos na memória
        const unsubscribeOut = onSnapshot(q, handleSnap);
        const unsubscribeIn = onSnapshot(q2, handleSnap);

        let allMsgs = [];
        function handleSnap(snapshot) {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added' || change.type === 'modified') {
                    const data = { id: change.doc.id, ...change.doc.data() };
                    allMsgs = allMsgs.filter(m => m.id !== data.id).concat(data);
                }
                if (change.type === 'removed') {
                    allMsgs = allMsgs.filter(m => m.id !== change.doc.id);
                }
            });

            // Ordenação cronológica segura
            const sortedMsgs = [...allMsgs].sort((a, b) => {
                const timeA = a.receivedAt?.toMillis ? a.receivedAt.toMillis() : Date.now();
                const timeB = b.receivedAt?.toMillis ? b.receivedAt.toMillis() : Date.now();
                return timeA - timeB;
            });

            setMessages(sortedMsgs);

            // Marca como lida as mensagens recebidas
            sortedMsgs.forEach(m => {
                if (m.status === 'unread' && m.direction === 'inbound') {
                    updateDoc(doc(db, 'whatsapp_inbound', m.id), { status: 'read' });
                }
            });
        }

        return () => { unsubscribeOut(); unsubscribeIn(); };
    }, [lead]);

    const handleSendMessage = async () => {
        if (!replyText.trim() || !lead.phone) return;
        setIsSending(true);

        let safePhone = String(lead.phone).replace(/\D/g, '');
        if (safePhone.length >= 10 && !safePhone.startsWith('55')) safePhone = `55${safePhone}`;

        try {
            // Dispara via API da Meta que já existe no seu backend
            const response = await fetch('/api/whatsapp-send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat_reply',
                    storeId: CRM_STORE_ID,
                    toPhone: safePhone,
                    dynamicParams: { text: replyText }
                })
            });

            const data = await response.json();

            if (response.ok || data.success) {
                await addDoc(collection(db, 'whatsapp_inbound'), {
                    storeId: CRM_STORE_ID,
                    to: safePhone,
                    from: safePhone, // Para indexação fácil
                    text: replyText,
                    receivedAt: serverTimestamp(),
                    status: 'read',
                    direction: 'outbound'
                });
                setReplyText('');
            } else {
                alert(`Atenção (Regra da Meta):\nVocê só pode enviar mensagens livres se o lead tiver respondido nas últimas 24h.\nDetalhe: ${data.error}`);
            }
        } catch (error) {
            alert('Erro de conexão ao enviar mensagem.');
        } finally {
            setIsSending(false);
        }
    };

    if (!lead) return null;

    return (
        <div className="absolute right-0 top-0 h-full z-40 w-full sm:w-[400px] bg-[#efeae2] border-l border-slate-200 flex flex-col shadow-[-20px_0_40px_-10px_rgba(0,0,0,0.15)] animate-in slide-in-from-right-8">
            {/* Background WhatsApp */}
            <div className="absolute inset-0 z-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', backgroundSize: '120px' }}></div>
            
            {/* Header */}
            <div className="h-16 px-4 bg-[#f0f2f5] flex items-center justify-between border-b border-slate-200 shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center text-white shrink-0">
                        {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col truncate">
                        <span className="font-bold text-slate-800 text-sm truncate">{lead.name}</span>
                        <span className="text-xs text-slate-500">{lead.phone}</span>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                    <X size={20} />
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 z-10 custom-scrollbar flex flex-col">
                <div className="mx-auto bg-[#ffeecd] text-slate-600 text-[10px] px-3 py-1.5 rounded-lg shadow-sm mb-4 text-center max-w-[85%]">
                    🔒 Mensagens oficiais via Meta Cloud API. O chat livre só é permitido 24h após a última resposta do cliente.
                </div>

                {messages.map((msg) => {
                    const isOutbound = msg.direction === 'outbound';
                    const timeStr = msg.receivedAt?.toDate ? msg.receivedAt.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
                    
                    return (
                        <div key={msg.id} className={`max-w-[85%] px-3 py-1.5 rounded-lg shadow-sm text-sm leading-relaxed flex flex-col ${isOutbound ? 'bg-[#d9fdd3] text-[#111b21] self-end rounded-tr-none' : 'bg-white text-[#111b21] self-start rounded-tl-none'}`}>
                            <span className="pr-12 whitespace-pre-wrap break-words">{msg.text}</span>
                            <div className="text-[9px] text-slate-500 self-end ml-4 flex items-center gap-1 float-right -mt-2">
                                {timeStr}
                                {isOutbound && <CheckCheck size={12} className="text-[#53bdeb]" />}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <div className="p-3 bg-[#f0f2f5] z-10 shrink-0 flex items-center gap-2">
                <div className="flex-1 bg-white rounded-xl px-4 py-2 shadow-sm flex items-center">
                    <input 
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Digite uma mensagem..."
                        className="w-full bg-transparent border-none outline-none text-sm text-slate-800"
                        disabled={isSending}
                    />
                </div>
                {isSending ? (
                    <div className="p-2 text-slate-400 animate-spin"><Loader2 size={20}/></div>
                ) : (
                    <button 
                        onClick={handleSendMessage}
                        disabled={!replyText.trim()}
                        className="text-white bg-[#00a884] p-2.5 rounded-full hover:bg-[#008f6f] transition-colors shadow-sm disabled:opacity-50"
                    >
                        <Send size={18} className="ml-0.5" />
                    </button>
                )}
            </div>
        </div>
    );
}