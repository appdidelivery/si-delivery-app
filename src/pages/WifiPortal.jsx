import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Wifi, Gift, CheckCircle, Smartphone, User, Copy, Loader2 } from "lucide-react";
import { db } from "../services/firebase";
import { doc, getDoc, setDoc, serverTimestamp, arrayUnion } from "firebase/firestore";

export default function WifiPortal() {
  const { loja } = useParams();

  // Estados de controle do PLG
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  
  // Estados para buscar os dados reais da Loja
  const [tenantConfig, setTenantConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Busca os dados da loja (SSID, Senha, Prêmio) no Firebase assim que a tela abre
  useEffect(() => {
    const fetchStoreConfig = async () => {
      if (!loja) return;
      
      try {
        const storeRef = doc(db, "stores", loja);
        const storeSnap = await getDoc(storeRef);
        
        if (storeSnap.exists()) {
          const data = storeSnap.data();
          setTenantConfig({
            storeName: data.name || loja.toUpperCase(),
            primaryColor: "bg-emerald-600",
            buttonHover: "hover:bg-emerald-700",
            wifiNetwork: data.wifiSsid || "WIFI_CLIENTES",
            wifiPassword: data.wifiPassword || "senha_nao_configurada",
            prizeDescription: data.wifiPrize || "Uma surpresa especial no balcão!"
          });
        } else {
          // Fallback caso a loja não exista
          setTenantConfig({
            storeName: loja.toUpperCase(),
            primaryColor: "bg-emerald-600",
            buttonHover: "hover:bg-emerald-700",
            wifiNetwork: "WIFI_INDISPONIVEL",
            wifiPassword: "-",
            prizeDescription: "Prêmio Indisponível"
          });
        }
      } catch (error) {
        console.error("Erro ao buscar dados da loja:", error);
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchStoreConfig();
  }, [loja]);

  const handleCaptureLead = async (e) => {
    e.preventDefault();
    
    if (!name.trim() || !whatsapp.trim()) return;

    // Avança imediatamente para a etapa de loading (Animação de sorteio)
    setStep(2);

    try {
      // Limpa o WhatsApp para conter apenas números
      const cleanPhone = whatsapp.replace(/\D/g, "");

      // Ref do documento do cliente dentro da loja específica (Multi-tenant isolado)
      const customerRef = doc(db, "stores", loja, "customers", cleanPhone);

      // Upsert Seguro: Atualiza ou cria novo, SEM apagar histórico de delivery
      await setDoc(customerRef, {
        name: name.trim(),
        whatsapp: cleanPhone,
        tenantId: loja,
        isWifiLead: true,
        tags: arrayUnion("wifi_leads"),
        lastWifiLoginAt: serverTimestamp(),
      }, { merge: true });

      // --------------------------------------------------------------------------
      // NOVO: GATILHO DE WHATSAPP (EVOLUTION API / WEBHOOK)
      // Disparo em background (sem await) para não atrasar a tela de sucesso do cliente.
      // SUBSTITUA "URL_DA_SUA_API_AQUI" pelo endpoint correto da sua API (ex: /api/webhook/wifi)
      // --------------------------------------------------------------------------
      fetch("/api/wifi-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: cleanPhone,
          name: name.trim(),
          storeId: loja,
          storeName: tenantConfig.storeName,
          prize: tenantConfig.prizeDescription,
          source: "wifi_portal_gamificado"
        })
      }).catch(err => console.error("Erro silencioso ao acionar disparo de WhatsApp:", err));

    } catch (error) {
      console.error("Erro ao salvar lead do Wi-Fi no Firebase:", error);
    }
    
    // Delay de 3 segundos para garantir a experiência visual da "roleta" carregando
    setTimeout(() => {
      setStep(3);
    }, 3000);
  };

  const copyToClipboard = () => {
    if (!tenantConfig) return;
    navigator.clipboard.writeText(tenantConfig.wifiPassword);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Tela de carregamento enquanto busca os dados do Firebase
  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium animate-pulse">Carregando portal Wi-Fi...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Cabeçalho do Tenant */}
        <div className={`${tenantConfig.primaryColor} p-6 text-center text-white`}>
          <div className="flex justify-center mb-2">
            <Wifi className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Wi-Fi Grátis</h1>
          <p className="text-sm opacity-90 mt-1">Conecte-se na rede do {tenantConfig.storeName}</p>
        </div>

        {/* ETAPA 1: Captura de Lead */}
        {step === 1 && (
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 text-orange-600 mb-3">
                <Gift className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Ganhe um prêmio agora!</h2>
              <p className="text-sm text-gray-600 mt-1">
                Preencha seus dados para liberar a senha do Wi-Fi e girar a roleta de prêmios.
              </p>
            </div>

            <form onSubmit={handleCaptureLead} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seu Nome</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors"
                    placeholder="Como devemos te chamar?"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Smartphone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white ${tenantConfig.primaryColor} ${tenantConfig.buttonHover} transition-all duration-200 mt-6`}
              >
                Liberar Wi-Fi e Prêmio
              </button>
            </form>
          </div>
        )}

        {/* ETAPA 2: Gamificação (Loading animado) */}
        {step === 2 && (
          <div className="p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
            <div className="relative mb-6">
              <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-emerald-500"></div>
              <Gift className="w-10 h-10 text-emerald-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Sorteando seu prêmio...</h2>
            <p className="text-sm text-gray-500">Preparando sua conexão segura ao Wi-Fi.</p>
          </div>
        )}

        {/* ETAPA 3: Sucesso (Prêmio + Wi-Fi) */}
        {step === 3 && (
          <div className="p-6">
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-5 text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 mb-3">
                <Gift className="h-6 w-6 text-orange-600" />
              </div>
              <h2 className="text-lg font-bold text-orange-800">Você Ganhou!</h2>
              <p className="text-orange-600 font-medium mt-1 text-lg">
                {tenantConfig.prizeDescription}
              </p>
              <p className="text-xs text-orange-500 mt-2">
                Tire um print ou avise o garçom para resgatar.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <div className="flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-500 mr-2" />
                <h3 className="text-lg font-bold text-gray-900">Conexão Liberada</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Rede (SSID)</p>
                  <p className="text-sm font-semibold text-gray-900 bg-white py-2 px-3 rounded-lg border border-gray-200 break-all">
                    {tenantConfig.wifiNetwork}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Senha</p>
                  <div className="flex items-center">
                    <p className="text-sm font-mono font-bold text-gray-900 bg-white py-2 px-3 rounded-l-lg border-y border-l border-gray-200 flex-1 break-all">
                      {tenantConfig.wifiPassword}
                    </p>
                    <button
                      onClick={copyToClipboard}
                      className="bg-gray-100 hover:bg-gray-200 border-y border-r border-gray-200 py-2 px-4 rounded-r-lg transition-colors flex items-center justify-center min-w-[90px]"
                    >
                      {isCopied ? (
                        <span className="text-xs font-bold text-emerald-600 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-1" /> Copiado
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-gray-600 flex items-center">
                          <Copy className="w-4 h-4 mr-1" /> Copiar
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
      
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-400">
          Powered by Velo Delivery
        </p>
      </div>
    </div>
  );
}