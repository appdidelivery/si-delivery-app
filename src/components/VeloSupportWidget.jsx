import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

// ATENÇÃO: Na linha abaixo, você precisa colocar o caminho correto de onde está o seu arquivo de configuração do Firebase. Geralmente é '../firebase' ou '../firebaseConfig'
import { app } from "../services/firebase";

export default function VeloSupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { role: 'model', parts: [{ text: 'Olá! Sou o Assistente da Velo Delivery. Como posso ajudar você hoje?' }] }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const functions = getFunctions(app, 'southamerica-east1');
  const veloSupportCall = httpsCallable(functions, 'veloSupportWidget');

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newUserMessage = { role: 'user', parts: [{ text: message }] };
    const newHistory = [...messages, newUserMessage];
    setMessages(newHistory);
    setMessage('');
    setIsLoading(true);

    try {
      const result = await veloSupportCall({ 
        message: newUserMessage.parts[0].text,
        history: newHistory.slice(1, -1) 
      });
      setMessages((prev) => [...prev, { role: 'model', parts: [{ text: result.data.reply }] }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'model', parts: [{ text: 'Erro ao conectar. Tente novamente.' }] }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, fontFamily: 'sans-serif' }}>
      {isOpen && (
        <div style={{ width: '350px', height: '500px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 5px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', marginBottom: '15px', border: '1px solid #eee' }}>
          <div style={{ backgroundColor: '#0056FF', color: '#fff', padding: '15px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
            <span>Suporte Velo Delivery</span>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>X</button>
          </div>
          <div style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#f9f9f9' }}>
            {messages.map((msg, index) => (
              <div key={index} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', backgroundColor: msg.role === 'user' ? '#0056FF' : '#fff', color: msg.role === 'user' ? '#fff' : '#333', padding: '10px', borderRadius: '8px', maxWidth: '85%', fontSize: '14px', border: '1px solid #ddd' }}>
                {msg.parts[0].text}
              </div>
            ))}
            {isLoading && <div style={{ fontSize: '12px', color: '#888' }}>Digitando...</div>}
          </div>
          <form onSubmit={handleSendMessage} style={{ display: 'flex', padding: '10px', borderTop: '1px solid #eee' }}>
            <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Sua dúvida..." disabled={isLoading} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <button type="submit" disabled={isLoading} style={{ marginLeft: '10px', padding: '8px 12px', backgroundColor: '#0056FF', color: '#fff', border: 'none', borderRadius: '4px' }}>Enviar</button>
          </form>
        </div>
      )}
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} style={{ width: '60px', height: '60px', borderRadius: '30px', backgroundColor: '#0056FF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '24px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>💬</button>
      )}
    </div>
  );
}