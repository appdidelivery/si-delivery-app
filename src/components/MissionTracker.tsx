import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Store, Package, LayoutGrid, CreditCard, Share2, BarChart3 } from 'lucide-react';

const missions = [
  { id: 'store_data', title: 'Identidade da Loja', icon: <Store className="w-5 h-5" />, description: 'Nome, logo e endereço.' },
  { id: 'categories', title: 'Categorias', icon: <LayoutGrid className="w-5 h-5" />, description: 'Organize o seu cardápio.' },
  { id: 'products', title: 'Produtos', icon: <Package className="w-5 h-5" />, description: 'Cadastre os seus itens.' },
  { id: 'payments', title: 'Pagamentos e Envios', icon: <CreditCard className="w-5 h-5" />, description: 'VeloPay e logística.' },
  { id: 'integrations', title: 'Integrações', icon: <BarChart3 className="w-5 h-5" />, description: 'Google Analytics e mais.' },
];

interface MissionTrackerProps {
  completedMissions: string[];
}

export const MissionTracker = ({ completedMissions }: MissionTrackerProps) => {
  const progress = (completedMissions.length / missions.length) * 100;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Missões de Ativação</h2>
          <p className="text-sm text-gray-500">Complete o setup para libertar todas as funcionalidades.</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-orange-500">{Math.round(progress)}%</span>
          <div className="w-32 h-2 bg-gray-100 rounded-full mt-1">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-orange-500 rounded-full"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {missions.map((mission) => {
          const isCompleted = completedMissions.includes(mission.id);
          return (
            <div 
              key={mission.id}
              className={`flex items-start p-4 rounded-lg border transition-all ${
                isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 opacity-75'
              }`}
            >
              <div className={`p-2 rounded-full mr-4 ${isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {mission.icon}
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold ${isCompleted ? 'text-green-800' : 'text-gray-700'}`}>
                  {mission.title}
                </h3>
                <p className="text-xs text-gray-500">{mission.description}</p>
              </div>
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 ml-2" />
              ) : (
                <Circle className="w-5 h-5 text-gray-300 ml-2" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};