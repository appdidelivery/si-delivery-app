import React, { useState, useEffect, useContext, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useStore } from '../context/StoreContext';
import { Search, MoreVertical, Paperclip, Mic, Send, User, CheckCheck, Reply, X, Square, Image as ImageIcon, Trash2, Edit3, Save, Info, Phone, ArrowLeft, Store, Loader2, Plus, Bell, BellOff, Megaphone, Package, ShoppingCart, MapPin, Ban, DownloadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Variáveis do Cloudinary (As mesmas usadas nos produtos)
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export default function AdminChat() {
    const { store } = useStore();
    const storeId = store?.slug; 
    const [messages, setMessages] = useState([]);
    const [products, setProducts] = useState([]); // <-- ESTADO DOS PRODUTOS ADICIONADO
    const [activeChat, setActiveChat] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [loadingSend, setLoadingSend] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null); 
    const [addressBook, setAddressBook] = useState({}); // NOVO: Agenda de Contatos Inteligente
    
    // --- NOVO: ESTADOS DO PERFIL DO CLIENTE (CRM) ---
    const [showContactInfo, setShowContactInfo] = useState(false);
    const [showMiniPdv, setShowMiniPdv] = useState(false); // <-- ESTADO DO MINI PDV ADICIONADO
    const [customersData, setCustomersData] = useState({});
    const [contactForm, setContactForm] = useState({ name: '', email: '', notes: '' });

    // --- LÓGICA DE BLOQUEIO DE CONTATOS (BLACKLIST) ---
    const [blockedContacts, setBlockedContacts] = useState([]);

    useEffect(() => {
        if (!storeId) return;
        // Escuta em tempo real os números bloqueados pela loja
        const q = query(collection(db, 'blocked_contacts'), where('storeId', '==', storeId));
        const unsub = onSnapshot(q, (snapshot) => {
            setBlockedContacts(snapshot.docs.map(doc => doc.data().phone));
        });
        return () => unsub();
    }, [storeId]);

    const handleToggleBlockContact = async () => {
        if (!activeChat || !storeId) return;

        const isBlocked = blockedContacts.includes(activeChat);
        const docRef = doc(db, 'blocked_contacts', `${storeId}_${activeChat}`);

        try {
            if (isBlocked) {
                if (window.confirm("Deseja DESBLOQUEAR este contato? Ele poderá mandar mensagens e o robô voltará a atendê-lo.")) {
                    await deleteDoc(docRef);
                }
            } else {
                if (window.confirm("🚫 BLOQUEAR CONTATO?\n\nEste número será silenciado no seu painel. Opcionalmente, você pode configurar o Backend/Webhook para ignorar totalmente as mensagens dele.\n\nDeseja confirmar o bloqueio?")) {
                    await setDoc(docRef, {
                        storeId: storeId,
                        phone: activeChat,
                        blockedAt: serverTimestamp()
                    });
                }
            }
        } catch (error) {
            console.error("Erro ao alterar bloqueio:", error);
            alert("Erro de conexão ao tentar bloquear/desbloquear o contato.");
        }
    };

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
    // --- ESTADOS PARA NOVA CONVERSA ---
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [newChatPhone, setNewChatPhone] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(''); // Armazena o template escolhido
    const [isSendingTemplate, setIsSendingTemplate] = useState(false); // Loading do disparo

    // --- ESTADOS PARA DISPARO EM MASSA (BROADCAST) ---
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [broadcastTemplate, setBroadcastTemplate] = useState('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [broadcastSelectedProduct, setBroadcastSelectedProduct] = useState('');

    // --- NOVO: ESTADO DO BOTÃO DE SOM DO CHAT ---
    const [isMuted, setIsMuted] = useState(() => localStorage.getItem('mute_whatsapp_sound') === 'true');
    const [filterUnread, setFilterUnread] = useState(false); // <-- NOVO: ESTADO DA ABA NÃO LIDOS
    const [chatSearchTerm, setChatSearchTerm] = useState(''); // <-- NOVO: ESTADO DA BUSCA DE CHATS
// --- NOVO: AVISA O SISTEMA GLOBAL QUAL CHAT ESTÁ ABERTO PARA NÃO TOCAR SOM ---
    useEffect(() => {
        if (activeChat) {
            localStorage.setItem('active_whatsapp_chat', activeChat);
        } else {
            localStorage.removeItem('active_whatsapp_chat');
        }
        
        // Limpa quando o lojista sai da tela de chat
        return () => localStorage.removeItem('active_whatsapp_chat');
    }, [activeChat]);
    const toggleMute = () => {
        const newState = !isMuted;
        setIsMuted(newState);
        localStorage.setItem('mute_whatsapp_sound', newState.toString());
    };

    // Função provisória para evitar erro ao clicar em importar (Será implementada no futuro)
    const handleImportCSV = (e) => {
        alert("Função de importação em lote será ativada em breve.");
    };

    // --- FUNÇÃO AUXILIAR PARA FORMATAR DATA E HORA ---
    const formatMessageTime = (dateObj) => {
        if (!dateObj || isNaN(dateObj.getTime())) return '';
        
        const now = new Date();
        const isToday = dateObj.getDate() === now.getDate() && 
                        dateObj.getMonth() === now.getMonth() && 
                        dateObj.getFullYear() === now.getFullYear();

        const timeString = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        if (isToday) {
            return timeString; 
        } else {
            const dateString = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            return `${dateString} ${timeString}`; 
        }
    };

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
                const timeA = a.receivedAt?.toMillis ? a.receivedAt.toMillis() : (a.receivedAt?.seconds ? a.receivedAt.seconds * 1000 : Date.now());
                const timeB = b.receivedAt?.toMillis ? b.receivedAt.toMillis() : (b.receivedAt?.seconds ? b.receivedAt.seconds * 1000 : Date.now());
                return timeA - timeB; 
            });

            setMessages(msgs);
        }, (error) => {
            // Se der qualquer outro erro de permissão, agora aparecerá no console
            console.error("🔥 Erro no onSnapshot do WhatsApp:", error);
        });

        return () => unsubscribe();
    }, [storeId]);

    // --- NOVO: BUSCA OS PRODUTOS DA LOJA PARA O DISPARO DINÂMICO ---
    useEffect(() => {
        if (!storeId) return;
        const q = query(collection(db, 'products'), where('storeId', '==', storeId), where('isActive', '==', true));
        const unsub = onSnapshot(q, (snapshot) => {
            setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
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
                    // Limpa o telefone para cruzar perfeitamente com o chat (Trata o nono dígito)
                    let phone = String(data.customerPhone).replace(/\D/g, '');
                    if (phone.startsWith('55')) phone = phone.substring(2);
                    if (phone.length === 10) phone = phone.substring(0, 2) + '9' + phone.substring(2);
                    
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
        let rawPhone = msg.direction === 'outbound' ? msg.to : msg.from; 
        if (!rawPhone) return acc;
        
        // NORMALIZAÇÃO CIRÚRGICA (O TERROR DO NONO DÍGITO):
        let phone = String(rawPhone).replace(/\D/g, '');
        if (phone.startsWith('55')) phone = phone.substring(2); // 1. Remove o 55
        if (phone.length === 10) phone = phone.substring(0, 2) + '9' + phone.substring(2); // 2. Força o 9º dígito se a Meta ocultar
        
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
// Helper para o nome do cliente (Blindado)
    const getDisplayName = (phone) => {
        // 1º Prioridade: O nome salvo manualmente pelo lojista no CRM
        const crmName = customersData[phone]?.name;
        if (crmName && crmName.trim() !== '') return crmName;
        
        // 2º Prioridade: O nome que o cliente digitou no site ao fazer um pedido
        const addressBookName = addressBook[phone];
        if (addressBookName && addressBookName.trim() !== '') return addressBookName;

        // 3º Prioridade: O nome público do perfil do WhatsApp att do cliente
        const pushName = chats[phone]?.pushName;
        if (pushName && pushName.trim() !== '') return pushName;

        // 4º Falback: Se não tiver nada, mostra o número
        return `+${phone}`;
    };
   // Transforma em array e ordena para que o cliente com a mensagem mais recente fique no topo da lista
    const chatList = Object.values(chats)
        .filter(chat => filterUnread ? chat.unreadCount > 0 : true) // <-- FILTRO APLICADO AQUI
        .filter(chat => {
            if (!chatSearchTerm) return true;
            const searchLower = chatSearchTerm.toLowerCase();
            const contactName = getDisplayName(chat.phone).toLowerCase();
            const contactPhone = chat.phone.toLowerCase();
            return contactName.includes(searchLower) || contactPhone.includes(searchLower);
        })
        .sort((a, b) => {
        const lastMsgA = a.msgs[a.msgs.length - 1];
        const lastMsgB = b.msgs[b.msgs.length - 1];
        const timeA = lastMsgA?.receivedAt?.toMillis ? lastMsgA.receivedAt.toMillis() : (lastMsgA?.receivedAt?.seconds ? lastMsgA.receivedAt.seconds * 1000 : Date.now());
        const timeB = lastMsgB?.receivedAt?.toMillis ? lastMsgB.receivedAt.toMillis() : (lastMsgB?.receivedAt?.seconds ? lastMsgB.receivedAt.seconds * 1000 : Date.now());
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
// --- NOVO: GERADOR DE AVATAR (Contorna o bloqueio de foto da Meta) ---
    const getAvatar = (phone, pushName) => {
        let displayName = getDisplayName(phone) || pushName || 'C';
        let initials = displayName.substring(0, 2).toUpperCase();
        
        // Se tiver espaço (ex: Claudio Boing), pega a primeira letra de cada nome
        if (displayName.includes(' ') && displayName !== 'Cliente Google' && displayName !== 'Cliente WhatsApp') {
            const parts = displayName.split(' ');
            if (parts.length >= 2 && parts[1].length > 0) {
                initials = (parts[0][0] + parts[1][0]).toUpperCase();
            }
        }
        // Retorna uma imagem gerada dinamicamente com cores sorteadas
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff&size=128&font-size=0.4&bold=true`;
    };

    // --- NOVO: GERADOR DE BACKUP DE CONVERSA (.TXT) ---
    const handleExportChat = () => {
        if (!activeChat || activeMessages.length === 0) return alert("Não há mensagens para exportar.");

        const clientName = getDisplayName(activeChat);
        let chatText = `--- HISTÓRICO DE CONVERSA VELO DELIVERY ---\n`;
        chatText += `Cliente: ${clientName} (+${activeChat})\n`;
        chatText += `Loja: ${store?.name || 'Loja'}\n`;
        chatText += `Exportado em: ${new Date().toLocaleString('pt-BR')}\n`;
        chatText += `-------------------------------------------\n\n`;

        // Pega as mensagens da tela na ordem correta
        [...activeMessages].forEach(msg => {
            const dateObj = msg.receivedAt?.toDate ? msg.receivedAt.toDate() : new Date(msg.receivedAt?.seconds * 1000 || Date.now());
            const dateStr = dateObj.toLocaleDateString('pt-BR');
            const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            const sender = msg.direction === 'outbound' ? (store?.name || 'Loja') : clientName;
            
            let content = msg.text || '';
            if (msg.mediaUrl) {
                content += ` [Mídia Anexada: ${msg.mediaUrl}]`;
            }

            chatText += `[${dateStr} ${timeStr}] ${sender}: ${content.trim()}\n`;
        });

        // Cria o arquivo virtual e força o download
        const blob = new Blob([chatText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Backup_Chat_${clientName.replace(/\s+/g, '_')}_${activeChat}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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

    // --- ESTADOS E LÓGICA DO MINI PDV ---
    const [miniPdvCart, setMiniPdvCart] = useState([]);
    const [miniPdvSearch, setMiniPdvSearch] = useState('');
    const [miniPdvCustomer, setMiniPdvCustomer] = useState({ payment: 'pix', changeFor: '', deliveryMethod: 'delivery', address: '' });
    const [miniPdvShippingFee, setMiniPdvShippingFee] = useState(0);
    const [isSubmittingMiniPdv, setIsSubmittingMiniPdv] = useState(false);
    const [isCalculatingFreight, setIsCalculatingFreight] = useState(false);

    // Fórmula para calcular distância em linha reta caso a API de rotas falhe
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return null;
        const R = 6371; 
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
        return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))); 
    };

    const handleMiniPdvCepSearch = async () => {
        const addressQuery = miniPdvCustomer.address;
        if (!addressQuery || addressQuery.length < 5) return alert("Digite um endereço válido ou CEP.");
        
        setIsCalculatingFreight(true);
        try {
            // 1. Puxa os dados atualizados da loja (Mapas e Zonas) do banco
            const storeSnap = await getDoc(doc(db, "stores", storeId));
            const storeData = storeSnap.exists() ? storeSnap.data() : {};
            const zones = storeData.delivery_zones || [];
            const storeLat = storeData.lat;
            const storeLng = storeData.lng;
            const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

            let logradouro = addressQuery;
            let bairro = "";

            // 2. Se for CEP (só números), busca no ViaCEP primeiro para pegar a rua
            const cleanCep = addressQuery.replace(/\D/g, '');
            if (cleanCep.length === 8) {
                const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const viaCepData = await viaCepRes.json();
                if (!viaCepData.erro) {
                    logradouro = `${viaCepData.logradouro}, ${viaCepData.bairro}, ${viaCepData.localidade} - ${viaCepData.uf}`;
                    bairro = viaCepData.bairro;
                    setMiniPdvCustomer(prev => ({ ...prev, address: logradouro }));
                }
            }

            // 3. Tenta calcular pelo Mapa (Google Geocoding)
            if (storeLat && storeLng && zones.length > 0 && GOOGLE_API_KEY) {
                try {
                    const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(logradouro + ', Brasil')}&key=${GOOGLE_API_KEY}`);
                    const geoData = await geoRes.json();

                    if (geoData.status === "OK" && geoData.results[0]) {
                        const customerLat = geoData.results[0].geometry.location.lat;
                        const customerLng = geoData.results[0].geometry.location.lng;

                        let distanceKm = null;
                        try {
                            if (window.google && window.google.maps) {
                                const service = new window.google.maps.DistanceMatrixService();
                                distanceKm = await new Promise((resolve, reject) => {
                                    service.getDistanceMatrix({
                                        origins: [{ lat: Number(storeLat), lng: Number(storeLng) }],
                                        destinations: [{ lat: customerLat, lng: customerLng }],
                                        travelMode: 'DRIVING'
                                    }, (res, status) => {
                                        if (status === 'OK' && res.rows[0].elements[0].status === 'OK') resolve(res.rows[0].elements[0].distance.value / 1000);
                                        else reject('Falha Matrix');
                                    });
                                });
                            } else { throw new Error("Sem SDK"); }
                        } catch (err) {
                            const straightLine = calculateDistance(Number(storeLat), Number(storeLng), customerLat, customerLng);
                            if (straightLine !== null) distanceKm = straightLine * 1.3;
                        }

                        if (distanceKm !== null) {
                            const matchedZone = [...zones].sort((a, b) => a.radius_km - b.radius_km).find(z => distanceKm <= z.radius_km);
                            if (matchedZone) {
                                setMiniPdvShippingFee(Number(matchedZone.fee));
                                alert(`🗺️ Frete calculado: R$ ${Number(matchedZone.fee).toFixed(2)} (Distância: ${distanceKm.toFixed(1)}km)`);
                                return setIsCalculatingFreight(false);
                            } else {
                                setMiniPdvShippingFee(0);
                                alert(`⚠️ Cliente a ${distanceKm.toFixed(1)}km. Fora da área de entrega mapeada.`);
                                return setIsCalculatingFreight(false);
                            }
                        }
                    }
                } catch (geoError) { console.warn("Google Maps falhou, indo para Fallback"); }
            }

            // 4. Fallback (Tabela de CEPs antiga)
            alert("⚠️ Não foi possível calcular pelo mapa. Insira o valor do frete manualmente.");
        } catch (error) {
            console.error("Erro no cálculo:", error);
            alert("Erro ao calcular frete.");
        } finally {
            setIsCalculatingFreight(false);
        }
    };

    const handleLaunchMiniPdvOrder = async () => {
        if (miniPdvCart.length === 0) return alert("Adicione produtos ao carrinho!");
        
        // Verifica se é delivery mas o endereço está vazio
        if (miniPdvCustomer.deliveryMethod === 'delivery' && (!miniPdvCustomer.address || miniPdvCustomer.address.length < 5)) {
            return alert("Digite o endereço de entrega do cliente!");
        }
        
        setIsSubmittingMiniPdv(true);

        try {
            const subtotal = miniPdvCart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
            const frete = miniPdvCustomer.deliveryMethod === 'delivery' ? Number(miniPdvShippingFee || 0) : 0;
            const cartTotal = subtotal + frete;
            
            let cleanPhone = String(activeChat).replace(/\D/g, '');
            let phoneForMeta = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
            const customerName = getDisplayName(activeChat);

            // 1. Salva o pedido inicial no banco de dados
            const newOrderRef = await addDoc(collection(db, "orders"), {
                storeId: storeId,
                customerName: customerName,
                customerPhone: cleanPhone,
                customerAddress: miniPdvCustomer.deliveryMethod === 'delivery' ? miniPdvCustomer.address : 'Retirada no Balcão',
                items: miniPdvCart,
                subtotal: subtotal,
                shippingFee: frete,
                total: cartTotal,
                paymentMethod: miniPdvCustomer.payment,
                status: 'preparing',
                paymentStatus: 'pending',
                changeFor: miniPdvCustomer.payment === 'dinheiro' ? miniPdvCustomer.changeFor : null,
                tipo: 'delivery',
                source: 'whatsapp_pdv',
                createdAt: serverTimestamp()
            });

            const orderId = newOrderRef.id;
            const resumoItens = miniPdvCart.map(i => `▪️ ${i.quantity}x ${i.name}`).join('\n');
            let msgConfirmacao = `✅ *Pedido #${orderId.slice(-5).toUpperCase()} Lançado!*\n\n*Resumo:*\n${resumoItens}\n\n*Total a pagar: R$ ${cartTotal.toFixed(2)}*\n`;

            let pixCodeToShare = null;

            // 2. SE FOR PIX: Chama o backend para gerar a cobrança (VeloPay ou MP)
            if (miniPdvCustomer.payment === 'pix') {
                try {
                    // Verifica rapidamente se a loja usa VeloPay ou MP para rotear certo
                    const storeSnap = await getDoc(doc(db, "stores", storeId));
                    const isVeloPay = storeSnap.exists() && storeSnap.data().velopayStatus === 'active';

                    // Em ambiente local, se o Vite não estiver fazendo proxy, forçamos a porta 3000 (padrão de backends Next/Node)
                    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                    const baseUrl = isLocal ? 'http://localhost:3000' : '';
                    
                    const endpoint = isVeloPay ? `${baseUrl}/api/velopay-pix` : `${baseUrl}/api/processar-pagamento-transparente-velo`;
                    
                    const payload = isVeloPay ? {
                        storeId, orderId, totalAmount: cartTotal
                    } : {
                        storeId, orderId, transaction_amount: cartTotal, payment_method_id: 'pix',
                        payer: { email: 'cliente@velodelivery.com.br', first_name: customerName.split(' ')[0] || 'Cliente' }
                    };

                    const pixRes = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    // 🛡️ BLINDAGEM: Verifica se a resposta não é um HTML (Erro 404) antes de tentar ler como JSON
                    const contentType = pixRes.headers.get("content-type");
                    if (contentType && contentType.indexOf("application/json") !== -1) {
                        const pixData = await pixRes.json();

                        if (pixRes.ok && (pixData.success || pixData.txid)) {
                            // Polling de 3 segundos: Dá tempo para o Backend salvar o código PIX no Firestore
                            for (let i = 0; i < 3; i++) {
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                const updatedOrderSnap = await getDoc(doc(db, "orders", orderId));
                                if (updatedOrderSnap.exists() && updatedOrderSnap.data().pixCopiaECola) {
                                    pixCodeToShare = updatedOrderSnap.data().pixCopiaECola;
                                    break;
                                }
                            }
                        } else {
                            console.warn(`Falha ao gerar PIX (${isVeloPay ? 'VeloPay' : 'Mercado Pago'}):`, pixData);
                        }
                    } else {
                        console.error(`Erro na API: O servidor retornou ${pixRes.status} (Não é um JSON). Verifique se o backend está rodando na porta correta.`);
                    }
                } catch (err) {
                    console.error("Erro de rede na requisição de PIX:", err);
                }
            }

            // 3. Montagem e Disparo das Mensagens no WhatsApp
            if (miniPdvCustomer.payment === 'pix') {
                if (pixCodeToShare) {
                    msgConfirmacao += `*Pagamento:* 💠 PIX\n\nCopie o código na mensagem abaixo e pague no seu app do banco. 👇\n\n*A cozinha já foi avisada e começará a preparar assim que o pagamento for confirmado!* 🚀`;
                    
                    // Dispara a Mensagem 1 (Instruções e Resumo)
                    await fetch('/api/whatsapp-send', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'chat_reply', storeId: storeId, toPhone: phoneForMeta, dynamicParams: { text: msgConfirmacao } })
                    });
                    await addDoc(collection(db, 'whatsapp_inbound'), { storeId, to: phoneForMeta, text: msgConfirmacao, receivedAt: serverTimestamp(), status: 'read', direction: 'outbound' });

                    // Dispara a Mensagem 2 (Código PIX Isolado para o botão de copiar nativo funcionar)
                    await fetch('/api/whatsapp-send', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'chat_reply', storeId: storeId, toPhone: phoneForMeta, dynamicParams: { text: pixCodeToShare } })
                    });
                    await addDoc(collection(db, 'whatsapp_inbound'), { storeId, to: phoneForMeta, text: pixCodeToShare, receivedAt: serverTimestamp(), status: 'read', direction: 'outbound' });

                } else {
                    // Fallback de segurança caso a API do Banco/Mercado Pago esteja instável
                    msgConfirmacao += `*Pagamento:* 💠 PIX\n\n_Ocorreu uma falha ao gerar o código automático. O atendente enviará a Chave PIX da loja em instantes._`;
                    await fetch('/api/whatsapp-send', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'chat_reply', storeId: storeId, toPhone: phoneForMeta, dynamicParams: { text: msgConfirmacao } })
                    });
                    await addDoc(collection(db, 'whatsapp_inbound'), { storeId, to: phoneForMeta, text: msgConfirmacao, receivedAt: serverTimestamp(), status: 'read', direction: 'outbound' });
                }
            } else {
                // Fluxo Normal (Dinheiro ou Cartão Físico)
                const formaPagtoTxt = miniPdvCustomer.payment === 'cartao' ? '💳 Cartão na Entrega' : '💵 Dinheiro';
                const trocoTxt = miniPdvCustomer.payment === 'dinheiro' && miniPdvCustomer.changeFor ? `\n*Troco para:* R$ ${miniPdvCustomer.changeFor}` : '';
                msgConfirmacao += `*Pagamento:* ${formaPagtoTxt}${trocoTxt}\n\nSeu pedido já foi enviado para a cozinha! 👨‍🍳`;

                await fetch('/api/whatsapp-send', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'chat_reply', storeId: storeId, toPhone: phoneForMeta, dynamicParams: { text: msgConfirmacao } })
                });
                await addDoc(collection(db, 'whatsapp_inbound'), { storeId, to: phoneForMeta, text: msgConfirmacao, receivedAt: serverTimestamp(), status: 'read', direction: 'outbound' });
            }

            // 4. Limpa o carrinho e fecha o Mini PDV
            setMiniPdvCart([]);
            setMiniPdvSearch('');
            setMiniPdvCustomer({ payment: 'pix', changeFor: '' });
            setShowMiniPdv(false);
            
            // Pausa o bot automaticamente para o humano continuar se precisar
            await setDoc(doc(db, 'whatsapp_sessions', `${storeId}_${cleanPhone}`), {
                storeId: storeId, phone: cleanPhone, botPaused: true, updatedAt: serverTimestamp()
            }, { merge: true });

        } catch (error) {
            console.error("Erro ao lançar pedido PDV:", error);
            alert("Erro ao lançar o pedido.");
        } finally {
            setIsSubmittingMiniPdv(false);
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

        // --- BLINDAGEM DO 9º DÍGITO PARA MÍDIAS ---
        let cleanActiveChat = activeChat.replace(/\D/g, '');
        if (cleanActiveChat.startsWith('55')) cleanActiveChat = cleanActiveChat.substring(2);
        const safePhone = `55${cleanActiveChat}`;

        try {
            // Dispara a API
            const response = await fetch('/api/whatsapp-send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat_reply',
                    storeId: storeId,
                    toPhone: safePhone,
                    dynamicParams: { 
                        text: '', 
                        mediaUrl: mediaUrl,
                        mediaType: type
                    }
                })
            });

            if (response.ok) {
                // Salva no Firebase para renderizar no chat visualmente
                await addDoc(collection(db, 'whatsapp_inbound'), {
                    storeId: storeId,
                    to: safePhone, // <-- CORREÇÃO AQUI
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
            // BLINDAGEM: Garante que o activeChat (que vem sem 55) receba o DDI antes de ir para a API
            let cleanActiveChat = activeChat.replace(/\D/g, '');
            if (cleanActiveChat.startsWith('55')) cleanActiveChat = cleanActiveChat.substring(2);
            
            const safePhone = `55${cleanActiveChat}`;

            // 1. Dispara via API
            const response = await fetch('/api/whatsapp-send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat_reply',
                    storeId: storeId,
                    toPhone: safePhone,
                    dynamicParams: { text: replyText }
                })
            });

            const data = await response.json();

            if (data.success || response.ok) {
                // 2. Salva no Firebase para aparecer no histórico (como mensagem enviada pela loja)
                await addDoc(collection(db, 'whatsapp_inbound'), {
                    storeId: storeId,
                    to: safePhone,
                    text: replyText,
                    receivedAt: serverTimestamp(),
                    status: 'read',
                    direction: 'outbound', 
                    quotedMsg: replyingTo ? replyingTo.text : null // Salva no banco o contexto da resposta
                });

                // 3. HANDOFF: Pausa o bot automaticamente, pois o lojista assumiu o controle
                let normalizedPhoneForSession = safePhone.replace(/\D/g, '');
                if (normalizedPhoneForSession.startsWith('55')) normalizedPhoneForSession = normalizedPhoneForSession.substring(2);
                if (normalizedPhoneForSession.length === 10) normalizedPhoneForSession = normalizedPhoneForSession.substring(0, 2) + '9' + normalizedPhoneForSession.substring(2);

                await setDoc(doc(db, 'whatsapp_sessions', `${storeId}_${normalizedPhoneForSession}`), {
                    storeId: storeId,
                    phone: normalizedPhoneForSession,
                    botPaused: true,
                    updatedAt: serverTimestamp()
                }, { merge: true });

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

    // --- LÓGICA PARA APAGAR A CONVERSA INTEIRA ---
    const handleDeleteEntireChat = async () => {
        if (!activeChat || !storeId) return;

        if (window.confirm("🔴 Tem certeza que deseja apagar TODA a conversa com este cliente do seu painel? Esta ação não pode ser desfeita.")) {
            try {
                // Pega todas as mensagens da conversa atual que já estão agrupadas na variável activeMessages
                const msgsToDelete = chats[activeChat]?.msgs || [];
                
                // Apaga cada documento do Firebase
                for (const msg of msgsToDelete) {
                    await deleteDoc(doc(db, 'whatsapp_inbound', msg.id));
                }

                alert("✅ Conversa apagada com sucesso!");
                setActiveChat(null); // Fecha a tela de conversa
                setShowContactInfo(false); // Fecha a aba lateral se estiver aberta
            } catch (error) {
                console.error("Erro ao apagar conversa:", error);
                alert("Erro ao tentar apagar a conversa. Verifique sua conexão.");
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
                
                {/* Busca e Nova Conversa */}
                <div className="p-2 border-b border-gray-200 bg-white flex items-center gap-2">
                    <div className="bg-[#f0f2f5] flex-1 flex items-center gap-3 px-3 py-1.5 rounded-lg">
                        <Search size={18} className="text-gray-500" />
                        <input 
                            type="text" 
                            placeholder="Buscar nome ou número..." 
                            value={chatSearchTerm}
                            onChange={(e) => setChatSearchTerm(e.target.value)}
                            className="bg-transparent border-none outline-none w-full text-sm text-gray-700 placeholder-gray-500"
                        />
                        {chatSearchTerm && (
                            <button onClick={() => setChatSearchTerm('')} className="text-gray-400 hover:text-red-500 transition-colors">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    
                    <button 
                        onClick={toggleMute}
                        className={`p-2 rounded-lg transition-colors shadow-sm ${isMuted ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        title={isMuted ? "Ligar Som do Chat" : "Desligar Som do Chat"}
                    >
                        {isMuted ? <BellOff size={20} /> : <Bell size={20} />}
                    </button>

                    <button 
                        onClick={() => setShowBroadcastModal(true)}
                        className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        title="Disparo em Massa (Campanhas)"
                    >
                        <Megaphone size={20} />
                    </button>

                    <button 
                        onClick={() => setShowNewChatModal(true)}
                        className="bg-[#008069] text-white p-2 rounded-lg hover:bg-[#016d5a] transition-colors shadow-sm"
                        title="Iniciar Nova Conversa"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                {/* MODAL DE NOVA CONVERSA */}
                <AnimatePresence>
                    {showNewChatModal && (
                        <div className="absolute inset-0 bg-white z-40 flex flex-col animate-in slide-in-from-bottom-full">
                            <div className="h-16 bg-[#008069] text-white flex items-center px-4 shrink-0 shadow-md gap-4">
                                <button onClick={() => setShowNewChatModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                                    <ArrowLeft size={20} />
                                </button>
                                <h2 className="text-lg font-bold">Nova Conversa</h2>
                            </div>
                            <div className="p-4 border-b border-gray-100 bg-blue-50 flex flex-col gap-2">
                                <p className="text-[10px] font-bold text-blue-600 uppercase">Importação em Lote</p>
                                <label className="flex items-center justify-center gap-2 w-full p-3 bg-white border-2 border-dashed border-blue-200 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors">
                                    {isImporting ? <Loader2 className="animate-spin text-blue-500" size={20} /> : <Paperclip className="text-blue-500" size={20} />}
                                    <span className="text-xs font-bold text-blue-700">{isImporting ? 'Importando...' : 'Importar Agenda (CSV)'}</span>
                                    <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} disabled={isImporting} />
                                </label>
                                <p className="text-[9px] text-blue-400 text-center">Arquivo deve conter: Nome;Telefone</p>
                            </div>
                            <div className="p-6 flex flex-col gap-4">
                                {/* BLINDAGEM VELO: Aviso Educativo sobre Regra da Meta */}
                                <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex gap-3 items-start">
                                    <div className="text-red-500 mt-0.5"><Info size={18} /></div>
                                    <p className="text-[11px] text-red-700 leading-relaxed font-medium">
                                        <strong className="block mb-1 text-red-800">⚠️ Regra do WhatsApp Oficial</strong>
                                        Você só pode enviar mensagens manuais se o cliente tiver falado com a loja nas <strong>últimas 24 horas</strong>. Para iniciar conversa com contatos frios ou motoboys, utilize a ferramenta de <strong>Disparo / Campanhas</strong> com modelos aprovados pela Meta.
                                    </p>
                                </div>

                               <p className="text-sm text-gray-500 font-medium mt-2">Digite o WhatsApp do cliente com DDD (Ex: 48999999999)</p>
                                <input 
                                    type="tel" 
                                    placeholder="Apenas números (DDD + Tel sem espaços)"
                                    value={newChatPhone}
                                    onChange={(e) => setNewChatPhone(e.target.value.replace(/\D/g, ''))}
                                    className="w-full p-4 bg-[#f0f2f5] rounded-xl outline-none focus:ring-2 ring-[#008069] text-gray-800 font-bold"
                                />

                               <div className="mt-2">
                                    <p className="text-sm text-gray-500 font-medium mb-2">Selecione o Template (Obrigatório p/ abrir janela):</p>
                                    <select 
                                        value={selectedTemplate}
                                        onChange={(e) => setSelectedTemplate(e.target.value)}
                                        className="w-full p-4 bg-[#f0f2f5] rounded-xl outline-none focus:ring-2 ring-[#008069] text-gray-800 font-bold appearance-none cursor-pointer"
                                    >
                                        <option value="">Sem template (Chat Livre - Risco de bloqueio)</option>
                                        <option value="velo_atendimento_geral">👋 Iniciar Atendimento (Genérico)</option>
                                        <option value="velo_oferta_nova">🍔 Novidades e Ofertas (Marketing)</option>
                                        <option value="velo_contato_logistica">🛵 Contato sobre Entrega (Logística)</option>
                                        <option value="velo_saudade_cliente">🥺 Saudade / Pós-venda (Recuperação)</option>
                                    </select>
                                </div>

                                <button 
                                    disabled={isSendingTemplate}
                                    onClick={async () => {
                                        if (newChatPhone.length < 10) return alert("Número muito curto.");
                                        let finalPhone = newChatPhone;
                                        if (!finalPhone.startsWith('55')) finalPhone = `55${finalPhone}`;
                                        
                                        if (selectedTemplate) {
                                            // --- DISPARO DE TEMPLATE OFICIAL DA META ---
                                            setIsSendingTemplate(true);
                                            try {
                                                const res = await fetch('/api/whatsapp-send', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        action: 'send_template',
                                                        storeId: storeId,
                                                        toPhone: finalPhone,
                                                        templateName: selectedTemplate
                                                    })
                                                });
                                                
                                                if (res.ok) {
                                                    setActiveChat(finalPhone);
                                                    setShowNewChatModal(false);
                                                    setNewChatPhone('');
                                                    setSelectedTemplate(''); // Reseta pro próximo
                                                } else {
                                                    const err = await res.json();
                                                    alert('A Meta recusou o template. Verifique se o nome confere com o painel deles.\nDetalhe: ' + (err.error || 'Erro interno'));
                                                }
                                            } catch (error) {
                                                alert("Erro de conexão ao acionar a API da Meta.");
                                            } finally {
                                                setIsSendingTemplate(false);
                                            }
                                        } else {
                                            // --- ABERTURA DE CHAT LIVRE (SEM TEMPLATE) ---
                                            setActiveChat(finalPhone);
                                            setShowNewChatModal(false);
                                            setNewChatPhone('');
                                            await addDoc(collection(db, 'whatsapp_inbound'), {
                                                storeId: storeId,
                                                to: finalPhone,
                                                text: 'Iniciou conversa livre via painel',
                                                receivedAt: serverTimestamp(),
                                                status: 'read',
                                                direction: 'outbound'
                                            });
                                        }
                                    }}
                                    className={`w-full text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-2 ${selectedTemplate ? 'bg-[#008069] hover:bg-[#016d5a]' : 'bg-gray-400 hover:bg-gray-500'}`}
                                >
                                    {isSendingTemplate ? <Loader2 className="animate-spin" size={18} /> : null}
                                    {selectedTemplate ? 'Enviar Template e Abrir Chat' : 'Abrir Chat Livre'}
                                </button>
                            </div>
                        </div>
                    )}
                </AnimatePresence>
                {/* MODAL DE DISPARO EM MASSA (BROADCAST) */}
                <AnimatePresence>
                    {showBroadcastModal && (
                        <div className="absolute inset-0 bg-white z-40 flex flex-col animate-in slide-in-from-bottom-full">
                            <div className="h-16 bg-blue-600 text-white flex items-center px-4 shrink-0 shadow-md gap-4">
                                <button onClick={() => setShowBroadcastModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                                    <ArrowLeft size={20} />
                                </button>
                                <h2 className="text-lg font-bold">Disparo em Massa</h2>
                            </div>
                            
                            <div className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex gap-3 items-start shadow-sm">
                                    <div className="text-blue-500 mt-0.5"><Megaphone size={20} /></div>
                                    <p className="text-[12px] text-blue-800 leading-relaxed font-medium">
                                        <strong className="block mb-1 text-blue-900">Acelere suas vendas! 🚀</strong>
                                        O sistema enviará o template selecionado para os últimos <strong>500 clientes</strong> que já fizeram pedidos na sua loja. Excelente para sextou, chuva ou cupons.
                                    </p>
                                </div>

                                <div className="mt-4">
                                    <p className="text-sm text-gray-700 font-bold mb-2">Selecione a Campanha (Template):</p>
                                    <select 
                                        value={broadcastTemplate}
                                        onChange={(e) => setBroadcastTemplate(e.target.value)}
                                        className="w-full p-4 bg-[#f0f2f5] rounded-xl outline-none focus:ring-2 ring-blue-600 text-gray-800 font-medium appearance-none cursor-pointer border border-gray-200 shadow-sm"
                                    >
                                        <option value="">Selecione um modelo aprovado...</option>
                                        <optgroup label="Marketing e Vendas">
                                            <option value="velo_promo_fds">🎉 Promoção de Sextou/Fim de Semana</option>
                                            <option value="velo_clima_fome">🌧️ Gatilho de Chuva/Frio</option>
                                            <option value="velo_oferta_nova">🍔 Novidades e Ofertas</option>
                                            <option value="velo_saudade_cliente">🥺 Saudade / Recuperar Clientes</option>
                                            <option value="velo_lancamento_dinamico">🚀 Lançamento Dinâmico (Escolher Produto)</option>
                                        </optgroup>
                                        <optgroup label="Pós-venda">
                                            <option value="velo_feedback_pedido">⭐ Pedir Avaliação na Base</option>
                                        </optgroup>
                                    </select>
                                </div>

                                {/* SELETOR DINÂMICO DE PRODUTO PARA LANÇAMENTO */}
                                {broadcastTemplate === 'velo_lancamento_dinamico' && (
                                    <div className="mt-2 animate-in fade-in slide-in-from-top-2">
                                        <p className="text-sm text-slate-700 font-bold mb-2 flex items-center gap-2"><Package size={16}/> Qual produto você está lançando?</p>
                                        <select 
                                            value={broadcastSelectedProduct}
                                            onChange={(e) => setBroadcastSelectedProduct(e.target.value)}
                                            className="w-full p-4 bg-blue-50 border border-blue-200 rounded-xl font-bold text-blue-800 outline-none focus:ring-2 ring-blue-400 cursor-pointer"
                                        >
                                            <option value="">Selecione um item do estoque...</option>
                                            {products.filter(p => p.isActive !== false).map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} - R$ {Number(p.promotionalPrice > 0 ? p.promotionalPrice : p.price).toFixed(2)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <button 
                                    disabled={isBroadcasting || !broadcastTemplate}
                                    onClick={async () => {
                                        if (!window.confirm("ATENÇÃO: Você está prestes a enviar uma mensagem para toda a sua base de clientes recentes. Deseja confirmar o disparo?")) return;
                                        
                                        setIsBroadcasting(true);
                                        try {
                                            let variablesToSend = [];
                                            
                                            if (broadcastTemplate === 'velo_lancamento_dinamico') {
                                                if (!broadcastSelectedProduct) {
                                                    setIsBroadcasting(false);
                                                    return alert("Selecione qual produto será lançado!");
                                                }
                                                const prod = products.find(p => p.id === broadcastSelectedProduct);
                                                if (prod) {
                                                    const finalPrice = Number(prod.promotionalPrice > 0 ? prod.promotionalPrice : prod.price).toFixed(2).replace('.', ',');
                                                    variablesToSend = [prod.name, finalPrice];
                                                }
                                            }

                                            const res = await fetch('/api/whatsapp-send', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    action: 'broadcast',
                                                    storeId: storeId,
                                                    templateName: broadcastTemplate,
                                                    variables: variablesToSend
                                                })
                                            });
                                            
                                            const data = await res.json();
                                            if (res.ok) {
                                                alert(`✅ Sucesso! ${data.message}`);
                                                setShowBroadcastModal(false);
                                                setBroadcastTemplate('');
                                                setBroadcastSelectedProduct('');
                                            } else {
                                                alert('Erro ao disparar: ' + (data.error || 'Falha na API da Meta'));
                                            }
                                        } catch (error) {
                                            alert("Erro de conexão ao tentar realizar o disparo.");
                                        } finally {
                                            setIsBroadcasting(false);
                                        }
                                    }}
                                    className={`w-full text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-4 ${broadcastTemplate ? 'bg-blue-600 hover:bg-blue-700 active:scale-95' : 'bg-gray-300 cursor-not-allowed'}`}
                                >
                                    {isBroadcasting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                                    {isBroadcasting ? 'Disparando para base...' : 'Iniciar Disparo em Massa'}
                                </button>
                            </div>
                        </div>
                    )}
                </AnimatePresence>
                

                {/* Abas de Filtro de Lidos/Não Lidos */}
                <div className="flex bg-white border-b border-gray-200 shrink-0">
                    <button 
                        onClick={() => setFilterUnread(false)}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors border-b-2 ${!filterUnread ? 'text-[#008069] border-[#008069]' : 'text-gray-500 border-transparent hover:bg-gray-50'}`}
                    >
                        Todas as Conversas
                    </button>
                    <button 
                        onClick={() => setFilterUnread(true)}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors border-b-2 flex items-center justify-center gap-2 ${filterUnread ? 'text-[#008069] border-[#008069]' : 'text-gray-500 border-transparent hover:bg-gray-50'}`}
                    >
                        Não Lidos
                        {Object.values(chats).filter(c => c.unreadCount > 0).length > 0 && (
                            <span className="bg-[#25d366] text-white text-[9px] px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                                {Object.values(chats).filter(c => c.unreadCount > 0).length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Lista de Chats */}
                <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
                    {chatList.length === 0 && <p className="p-6 text-center text-sm text-gray-500">Nenhuma mensagem ainda.</p>}
                    {chatList.map((chat) => {
                        const lastMsg = chat.msgs[chat.msgs.length - 1];
                        const dateObj = lastMsg?.receivedAt?.toDate ? lastMsg.receivedAt.toDate() : new Date(lastMsg?.receivedAt?.seconds * 1000 || Date.now());
                        const timeString = formatMessageTime(dateObj); 
                        
                        // NOVO: Detecta se é um pedido de transbordo não lido
                        const handoffTriggerText = store?.settings?.integrations?.whatsapp?.botOption2 || "Falar com Humano";
                        const isHandoffAlert = chat.unreadCount > 0 && lastMsg?.text && String(lastMsg.text).toLowerCase().includes(handoffTriggerText.toLowerCase());
                        
                        return (
                            <div 
                                key={chat.phone} 
                                onClick={() => handleOpenChat(chat.phone)}
                                className={`flex items-center gap-3 px-3 py-3 border-b border-gray-100 cursor-pointer hover:bg-[#f5f6f6] transition-colors ${activeChat === chat.phone ? 'bg-[#f0f2f5]' : ''} ${isHandoffAlert ? 'bg-red-50 hover:bg-red-100' : ''}`}
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-sm border border-slate-200 ${isHandoffAlert ? 'ring-2 ring-red-500 animate-pulse' : ''}`}>
                                    <img src={getAvatar(chat.phone, chat.pushName)} alt="Avatar" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`font-semibold text-sm truncate ${isHandoffAlert ? 'text-red-700' : 'text-gray-800'}`}>
                                            {getDisplayName(chat.phone)}
                                        </span>
                                        <span className={`text-[11px] ${isHandoffAlert ? 'text-red-600 font-black animate-pulse' : chat.unreadCount > 0 ? 'text-[#25d366] font-bold' : 'text-gray-400'}`}>
                                            {timeString}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className={`text-sm truncate pr-2 ${isHandoffAlert ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                                            {lastMsg?.direction === 'outbound' ? '✓ ' : ''}
                                            {lastMsg?.text 
                                                ? (isHandoffAlert ? `🚨 ${lastMsg.text}` : lastMsg.text.replace(/(https?:\/\/[^\s]+cloudinary\.com[^\s]*)/i, '📷 Imagem'))
                                                : (lastMsg?.mediaType === 'image' || lastMsg?.mediaUrl?.includes('cloudinary') ? '📷 Imagem' : lastMsg?.mediaType === 'audio' ? '🎤 Áudio' : '')}
                                        </span>
                                        {chat.unreadCount > 0 && (
                                            <span className={`${isHandoffAlert ? 'bg-red-500 animate-bounce' : 'bg-[#25d366]'} text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0`}>
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
                        <div className="flex-1 min-w-0 flex flex-col relative bg-[#efeae2]">
                           {/* Header do Chat */}
                            <div className="h-16 px-4 bg-[#f0f2f5] border-b border-gray-200 flex justify-between items-center z-10 shrink-0 w-full overflow-hidden">
                                <div 
                                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-200 p-2 rounded-xl transition-colors truncate"
                                    onClick={() => {
                                        setContactForm({
                                            name: getDisplayName(activeChat) !== `+${activeChat}` ? getDisplayName(activeChat) : '',
                                            email: customersData[activeChat]?.email || '',
                                            notes: customersData[activeChat]?.notes || ''
                                        });
                                        setShowMiniPdv(false); // Fecha o PDV se abrir o CRM
                                        setShowContactInfo(!showContactInfo);
                                    }}
                                    title="Ver dados do contato"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white shadow-sm shrink-0 overflow-hidden border border-slate-300">
                                        <img src={getAvatar(activeChat, chats[activeChat]?.pushName)} alt="Avatar" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex flex-col truncate">
                                        <span className="font-semibold text-gray-800 text-sm truncate">
                                            {getDisplayName(activeChat)}
                                        </span>
                                        <span className="text-xs text-gray-500 cursor-pointer flex items-center gap-1 hover:text-blue-500">
                                            {`+${activeChat}`} <Info size={12} className="shrink-0"/>
                                        </span>
                                    </div>
                                </div>
                            
                           <div className="flex items-center gap-2 shrink-0">
                                {/* BOTÃO DE BACKUP DA CONVERSA */}
                                <button 
                                    onClick={handleExportChat}
                                    className="border px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-sm flex items-center gap-1 bg-white text-slate-600 border-gray-200 hover:bg-slate-100 hover:text-slate-800"
                                    title="Baixar Histórico da Conversa (.txt)"
                                >
                                    <DownloadCloud size={16} /> <span className="hidden md:inline">Backup</span>
                                </button>

                                {/* NOVO BOTÃO: GATILHO DO MINI PDV */}
                                <button 
                                    onClick={() => {
                                        setShowContactInfo(false); // Fecha o CRM se abrir o PDV
                                        setShowMiniPdv(!showMiniPdv);
                                    }}
                                    className={`border px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all shadow-sm flex items-center gap-2 ${showMiniPdv ? 'bg-blue-700 text-white border-blue-700' : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'}`}
                                    title="Lançar Pedido Rápido"
                                >
                                    <ShoppingCart size={16} /> Lançar Pedido
                                </button>
                                
                                {/* BOTÃO DE BLOQUEIO DE CONTATO */}
                                <button 
                                    onClick={handleToggleBlockContact}
                                    className={`border px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-sm flex items-center gap-1 ${blockedContacts.includes(activeChat) ? 'bg-slate-800 text-white border-slate-900 hover:bg-slate-700' : 'bg-white text-slate-500 border-gray-200 hover:bg-slate-100 hover:text-slate-800'}`}
                                    title={blockedContacts.includes(activeChat) ? "Desbloquear Contato" : "Bloquear Contato"}
                                >
                                    <Ban size={16} /> {blockedContacts.includes(activeChat) ? 'Desbloquear' : 'Bloquear'}
                                </button>

                                <button 
                                    onClick={handleDeleteEntireChat}
                                    className="bg-white hover:bg-red-50 text-red-500 border border-gray-200 hover:border-red-500 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-sm flex items-center gap-1"
                                    title="Apagar Conversa Inteira"
                                >
                                    <Trash2 size={16} /> Apagar
                                </button>
                                <button 
                                    onClick={handleEndSession}
                                    className="bg-white hover:bg-green-50 text-[#008069] border border-gray-200 hover:border-[#008069] px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-sm flex items-center gap-2"
                                >
                                    🤖 Reativar Bot
                                </button>
                            </div>
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
                                const timeStr = formatMessageTime(msgDate);

                                // --- DETECTOR INTELIGENTE DE IMAGENS ---
                                let displayMediaUrl = msg.mediaUrl;
                                let displayMediaType = msg.mediaType;
                                let displayText = msg.text || '';

                                // Se não foi salvo como mídia oficial, mas tem um link do Cloudinary/Imagem no texto
                                if (!displayMediaUrl && displayText) {
                                    const urlRegex = /(https?:\/\/[^\s]+(?:jpg|jpeg|png|webp|gif|cloudinary\.com[^\s]*))/i;
                                    const match = displayText.match(urlRegex);
                                    if (match) {
                                        displayMediaUrl = match[0];
                                        displayMediaType = 'image';
                                        // Remove o link e marcações do texto para virar apenas a legenda
                                        displayText = displayText.replace(displayMediaUrl, '').replace('Imagem:', '').replace('📷', '').trim();
                                    }
                                }
                                
                                // NOVO: Flag para destacar a bolha específica
                                const handoffTriggerTextBubble = store?.settings?.integrations?.whatsapp?.botOption2 || "Falar com Humano";
                                const isThisHandoff = !isOutbound && displayText && String(displayText).toLowerCase().includes(handoffTriggerTextBubble.toLowerCase());
                                // ---------------------------------------

                                return (
                                    <div key={msg.id} className={`group relative max-w-[75%] md:max-w-[65%] px-3 py-1.5 rounded-lg shadow-sm text-[14px] leading-relaxed flex flex-col ${isOutbound ? 'bg-[#d9fdd3] text-[#111b21] self-end rounded-tr-none' : isThisHandoff ? 'bg-red-50 text-red-900 border-2 border-red-500 self-start rounded-tl-none shadow-md animate-pulse' : 'bg-white text-[#111b21] self-start rounded-tl-none'}`}>
                                        
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

                                        {/* Renderizador de Mídia INTELIGENTE */}
                                        {displayMediaType === 'image' && displayMediaUrl && (
                                            <div className="mb-1 mt-1 rounded-lg overflow-hidden cursor-pointer bg-black/5" onClick={() => window.open(displayMediaUrl, '_blank')}>
                                                <img src={displayMediaUrl} className="max-w-[250px] max-h-[250px] w-auto h-auto object-cover rounded-md" alt="Anexo" />
                                            </div>
                                        )}
                                        
                                        {displayMediaType === 'audio' && displayMediaUrl && (
                                            <div className="mb-1 w-[250px] mt-1">
                                                <audio controls className="h-10 w-full">
                                                    <source src={displayMediaUrl} type="audio/mp3" />
                                                    <source src={displayMediaUrl} type="audio/ogg" />
                                                </audio>
                                            </div>
                                        )}

                                        {/* Renderizador de Documentos (PDF, Word, etc) */}
                                        {displayMediaType === 'document' && displayMediaUrl && (
                                            <div 
                                                className="mb-2 mt-1 p-3 rounded-xl cursor-pointer bg-white border border-slate-200 shadow-sm hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center gap-3 w-[220px]" 
                                                onClick={() => window.open(displayMediaUrl, '_blank')}
                                                title="Clique para abrir ou baixar o documento"
                                            >
                                                <div className="bg-blue-100 text-blue-600 p-2 rounded-full shrink-0">
                                                    <Paperclip size={20} />
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="text-sm font-black text-slate-700 truncate">Documento Anexo</span>
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Toque para abrir</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Texto / Legenda */}
                                        {displayText && <span className="pr-12 whitespace-pre-wrap break-words break-all">{displayText}</span>}
                                        
                                        <div className={`text-[10px] text-gray-500 self-end ml-4 flex items-center gap-1 float-right ${(!displayText && displayMediaUrl) ? 'mt-1' : '-mt-1'}`}>
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

                       {/* Input de Resposta / Aviso de Bloqueio */}
                       {blockedContacts.includes(activeChat) ? (
                            <div className="px-4 py-4 bg-red-50 flex items-center justify-center gap-2 z-10 shrink-0 border-t border-red-100">
                                <Ban size={18} className="text-red-500" />
                                <span className="text-sm font-bold text-red-600 uppercase tracking-widest">
                                    Este contato está bloqueado.
                                </span>
                                <button onClick={handleToggleBlockContact} className="ml-2 text-xs font-black text-red-500 underline hover:text-red-700">
                                    Desbloquear
                                </button>
                            </div>
                        ) : (
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
                        )}
                        </div>

                        {/* --- COLUNA DE INFORMAÇÕES DO CONTATO (SIDEBAR DIREITA CRM) --- */}
                        {showContactInfo && (
                            <div className="absolute right-0 top-0 h-full z-40 w-full sm:w-[320px] bg-white border-l border-gray-200 flex flex-col shadow-[-15px_0_30px_-5px_rgba(0,0,0,0.1)] animate-in slide-in-from-right-8">
                                <div className="h-16 px-4 bg-[#f0f2f5] flex items-center gap-4 border-b border-gray-200 shrink-0">
                                    <button onClick={() => setShowContactInfo(false)} className="text-gray-500 hover:text-red-500 transition-colors bg-white p-1.5 rounded-full shadow-sm border border-gray-200">
                                        <X size={18} />
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

                        {/* --- NOVA COLUNA: MINI PDV (SIDEBAR DIREITA) --- */}
                        {showMiniPdv && (
                            <div className="absolute right-0 top-0 h-full z-40 w-full sm:w-[380px] md:w-[420px] bg-white border-l border-gray-200 flex flex-col shadow-[-15px_0_30px_-5px_rgba(0,0,0,0.1)] animate-in slide-in-from-right-8">
                                <div className="h-16 px-4 bg-[#f0f2f5] flex items-center justify-between border-b border-gray-200 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <ShoppingCart size={20} className="text-blue-600" />
                                        <span className="font-black italic uppercase text-slate-800">Lançamento Rápido</span>
                                    </div>
                                    <button onClick={() => setShowMiniPdv(false)} className="text-gray-500 hover:text-red-500 transition-colors bg-white p-1.5 rounded-full shadow-sm border border-gray-200">
                                        <X size={18} />
                                    </button>
                                </div>
                                
                                {/* BUSCA RÁPIDA DE PRODUTOS */}
                                <div className="p-3 border-b border-slate-100 bg-white shrink-0">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input 
                                            type="text" 
                                            value={miniPdvSearch}
                                            onChange={(e) => setMiniPdvSearch(e.target.value)}
                                            placeholder="Buscar produto por nome..." 
                                            className="w-full pl-9 pr-4 py-2 bg-[#f0f2f5] border-none rounded-xl text-sm font-bold outline-none focus:ring-2 ring-[#008069] transition-all text-slate-700"
                                        />
                                        {miniPdvSearch && (
                                            <button onClick={() => setMiniPdvSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"><X size={16}/></button>
                                        )}
                                    </div>
                                    
                                    {/* RESULTADO DA BUSCA (Aparece ao digitar) */}
                                    {miniPdvSearch && (
                                        <div className="mt-2 max-h-48 overflow-y-auto custom-scrollbar border border-slate-200 rounded-xl bg-slate-50 shadow-inner flex flex-col gap-1 p-1">
                                            {products.filter(p => p.isActive !== false && p.name.toLowerCase().includes(miniPdvSearch.toLowerCase())).map(p => {
                                                const price = p.promotionalPrice > 0 ? p.promotionalPrice : p.price;
                                                const isOutOfStock = p.stock !== undefined && p.stock !== '' && Number(p.stock) <= 0;
                                                return (
                                                    <div 
                                                        key={p.id}
                                                        onClick={() => {
                                                            if (isOutOfStock) return;
                                                            const ex = miniPdvCart.find(it => it.id === p.id);
                                                            if (ex) {
                                                                setMiniPdvCart(miniPdvCart.map(it => it.id === p.id ? { ...it, quantity: it.quantity + 1 } : it));
                                                            } else {
                                                                setMiniPdvCart([...miniPdvCart, { ...p, quantity: 1, price: price }]);
                                                            }
                                                            setMiniPdvSearch(''); // Limpa busca após adicionar
                                                        }}
                                                        className={`flex justify-between items-center p-2 rounded-lg transition-all ${isOutOfStock ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'cursor-pointer bg-white hover:bg-blue-50 border border-transparent hover:border-blue-200'}`}
                                                    >
                                                        <div className="flex flex-col truncate pr-2">
                                                            <span className="font-bold text-xs text-slate-700 truncate">{p.name}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold">{isOutOfStock ? 'Esgotado' : `Estoque: ${p.stock || '∞'}`}</span>
                                                        </div>
                                                        <span className="font-black text-blue-600 text-sm whitespace-nowrap">R$ {Number(price).toFixed(2)}</span>
                                                    </div>
                                                );
                                            })}
                                            {products.filter(p => p.name.toLowerCase().includes(miniPdvSearch.toLowerCase())).length === 0 && (
                                                <p className="text-xs text-center text-slate-400 font-bold p-2">Nenhum produto encontrado.</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* CARRINHO DE COMPRAS */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 p-3">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center justify-between">
                                        Itens Adicionados
                                        <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md">{miniPdvCart.reduce((a,b)=>a+b.quantity,0)}</span>
                                    </h4>

                                    {miniPdvCart.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2 opacity-60">
                                            <Package size={48} />
                                            <p className="text-xs font-bold uppercase tracking-widest text-center">Carrinho Vazio<br/>Busque acima.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {miniPdvCart.map(item => (
                                                <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-bold text-slate-700 text-xs leading-tight pr-2">{item.name}</span>
                                                        <span className="font-black text-blue-600 text-sm whitespace-nowrap">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center mt-1">
                                                        <div className="flex items-center gap-3 bg-[#f0f2f5] p-1 rounded-lg">
                                                            <button onClick={() => {
                                                                if (item.quantity <= 1) setMiniPdvCart(miniPdvCart.filter(i => i.id !== item.id));
                                                                else setMiniPdvCart(miniPdvCart.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i));
                                                            }} className="w-5 h-5 flex items-center justify-center bg-white rounded text-slate-600 hover:text-red-500 font-black text-xs shadow-sm">-</button>
                                                            
                                                            <span className="font-black text-slate-800 text-xs w-3 text-center">{item.quantity}</span>
                                                            
                                                            <button onClick={() => {
                                                                if (item.stock && item.quantity >= Number(item.stock)) return alert('Estoque máximo!');
                                                                setMiniPdvCart(miniPdvCart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
                                                            }} className="w-5 h-5 flex items-center justify-center bg-white rounded text-slate-600 hover:text-blue-600 font-black text-xs shadow-sm">+</button>
                                                        </div>
                                                        <button onClick={() => setMiniPdvCart(miniPdvCart.filter(i => i.id !== item.id))} className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded-md transition-colors">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* ÁREA DE PAGAMENTO E CHECKOUT */}
                                <div className="p-4 bg-white border-t border-slate-200 shrink-0 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] flex flex-col gap-3">
                                    
                                    {/* CONTROLE DE ENTREGA / RETIRADA */}
                                    <div className="flex bg-slate-100 rounded-xl p-1">
                                        <button 
                                            onClick={() => setMiniPdvCustomer({ ...miniPdvCustomer, deliveryMethod: 'delivery' })}
                                            className={`flex-1 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${miniPdvCustomer.deliveryMethod === 'delivery' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            🛵 Delivery
                                        </button>
                                        <button 
                                            onClick={() => { setMiniPdvCustomer({ ...miniPdvCustomer, deliveryMethod: 'pickup', address: '' }); setMiniPdvShippingFee(0); }}
                                            className={`flex-1 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${miniPdvCustomer.deliveryMethod === 'pickup' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            🏪 Balcão
                                        </button>
                                    </div>

                                    {/* ENDEREÇO E CÁLCULO DE FRETE (SÓ MOSTRA NO DELIVERY) */}
                                    {miniPdvCustomer.deliveryMethod === 'delivery' && (
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input 
                                                    type="text" 
                                                    placeholder="Endereço ou CEP" 
                                                    className="w-full p-3 pr-10 bg-slate-50 rounded-xl font-bold text-xs outline-none focus:ring-2 ring-blue-500 border border-slate-100" 
                                                    value={miniPdvCustomer.address || ''} 
                                                    onChange={e => setMiniPdvCustomer({ ...miniPdvCustomer, address: e.target.value })} 
                                                    onKeyDown={(e) => e.key === 'Enter' && handleMiniPdvCepSearch()}
                                                />
                                                <button 
                                                    onClick={handleMiniPdvCepSearch}
                                                    disabled={isCalculatingFreight}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                                                    title="Calcular Distância"
                                                >
                                                    {isCalculatingFreight ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                                                </button>
                                            </div>
                                            <input 
                                                type="number" 
                                                placeholder="Frete R$" 
                                                className="w-20 p-3 bg-green-50 rounded-xl font-black text-xs text-green-700 outline-none focus:ring-2 ring-green-500 text-center border border-green-100" 
                                                value={miniPdvShippingFee || ''} 
                                                onChange={e => setMiniPdvShippingFee(Number(e.target.value))} 
                                            />
                                        </div>
                                    )}

                                    {/* FORMAS DE PAGAMENTO */}
                                    <div className="flex gap-2">
                                        <select 
                                            className="flex-1 p-3 bg-blue-50 text-blue-800 rounded-xl font-black text-xs uppercase outline-none focus:ring-2 ring-blue-500 cursor-pointer border border-blue-100" 
                                            value={miniPdvCustomer.payment} 
                                            onChange={e => setMiniPdvCustomer({ ...miniPdvCustomer, payment: e.target.value, changeFor: e.target.value === 'dinheiro' ? miniPdvCustomer.changeFor : '' })}
                                        >
                                            <option value="pix">💠 PIX</option>
                                            <option value="cartao">💳 Cartão</option>
                                            <option value="dinheiro">💵 Dinheiro</option>
                                        </select>

                                        {miniPdvCustomer.payment === 'dinheiro' && (
                                            <input 
                                                type="number" 
                                                placeholder="Troco para?" 
                                                className="w-24 p-3 bg-green-50 text-green-800 rounded-xl font-black text-xs outline-none focus:ring-2 ring-green-500 text-center border border-green-100 placeholder:text-green-300" 
                                                value={miniPdvCustomer.changeFor || ''} 
                                                onChange={e => setMiniPdvCustomer({ ...miniPdvCustomer, changeFor: e.target.value })} 
                                            />
                                        )}
                                    </div>

                                    <div className="flex justify-between items-end border-t border-dashed border-slate-200 pt-3">
                                        <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Total</span>
                                        <span className="text-3xl font-black italic text-slate-900 leading-none">
                                            R$ {(miniPdvCart.reduce((acc, i) => acc + (i.price * i.quantity), 0) + (miniPdvCustomer.deliveryMethod === 'delivery' ? Number(miniPdvShippingFee || 0) : 0)).toFixed(2)}
                                        </span>
                                    </div>

                                    <button 
                                        disabled={miniPdvCart.length === 0 || isSubmittingMiniPdv}
                                        onClick={handleLaunchMiniPdvOrder}
                                        className="w-full mt-2 bg-green-500 text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-lg hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        {isSubmittingMiniPdv ? <Loader2 className="animate-spin" size={18} /> : <CheckCheck size={18} />}
                                        {isSubmittingMiniPdv ? 'Lançando...' : 'Finalizar e Enviar'}
                                    </button>
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