import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Store, MapPin, Wallet, Gift, Rocket, Utensils } from 'lucide-react';

const missions = [
  { id: 'identity', title: 'Identidade & Contato', icon: <Store className="w-5 h-5" />, description: 'Logo, Nome e WhatsApp de atendimento.' },
  { id: 'catalog', title: 'Cardápio Digital', icon: <Utensils className="w-5 h-5" />, description: 'Crie pelo menos 1 categoria e 1 produto.' },
  { id: 'logistics', title: 'Logística & Frete', icon: <MapPin className="w-5 h-5" />, description: 'Desenhe seu raio de entrega no Mapa.' },
  { id: 'payments', title: 'Recebimentos', icon: <Wallet className="w-5 h-5" />, description: 'Ative VeloPay, Mercado Pago ou Stripe.' },
  { id: 'marketing', title: 'Velo Game (Marketing)', icon: <Gift className="w-5 h-5" />, description: 'Ative a Roleta, Cashback ou Clube VIP.' },
  { id: 'launch', title: 'Decolagem Máxima', icon: <Rocket className="w-5 h-5" />, description: 'Conecte a API do WhatsApp ou Domínio Próprio.' },
];

interface MissionTrackerProps {
  completedMissions: string[];
}

export const MissionTracker = ({ completedMissions }: MissionTrackerProps) => {
  const progress = (completedMissions.length / missions.length) * 100;
  const is100Percent = progress === 100;

  if (is100Percent) return null; // Se quiser que a barra suma ao bater 100%, mantenha esta linha.

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-200 relative overflow-hidden">
      {/* Foguete de Fundo (Marca d'água suave) */}
      <div className="absolute -right-6 -bottom-6 opacity-5 text-9xl rotate-12 pointer-events-none select-none">
        🚀
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="text-4xl animate-bounce">🚀</div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">Missões Velo Delivery</h2>
            <p className="text-sm font-bold text-slate-500">Configure sua loja para decolar suas vendas.</p>
          </div>
        </div>
        
        <div className="text-right w-full md:w-48">
          <div className="flex justify-between items-end mb-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso</span>
            <span className="text-2xl font-black text-orange-500 italic leading-none">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {missions.map((mission) => {
          const isCompleted = completedMissions.includes(mission.id);
          return (
            <div 
              key={mission.id}
              className={`flex items-start p-4 rounded-2xl border-2 transition-all duration-500 ${
                isCompleted 
                  ? 'bg-green-50 border-green-400 shadow-sm' 
                  : 'bg-white border-slate-100 hover:border-orange-200'
              }`}
            >
              <div className={`p-2.5 rounded-xl flex-shrink-0 mr-3 transition-colors ${
                isCompleted ? 'bg-green-500 text-white shadow-md' : 'bg-slate-100 text-slate-400'
              }`}>
                {mission.icon}
              </div>
              <div className="flex-1 pr-2">
                <h3 className={`font-black text-sm uppercase tracking-tight ${isCompleted ? 'text-green-800' : 'text-slate-700'}`}>
                  {mission.title}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5 leading-tight">{mission.description}</p>
              </div>
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <Circle className="w-6 h-6 text-slate-200" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};