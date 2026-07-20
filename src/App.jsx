import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Moon, Watch, BarChart2, Settings, Home, Zap, Heart, Flame, Route, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';

export default function App() {
  // --- INJEÇÃO CSS PARA GARANTIR LAYOUT ---
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  const [activeTab, setActiveTab] = useState('hub');
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [completedWorkouts, setCompletedWorkouts] = useState({});
  const [activities, setActivities] = useState([
    { id: 1, date: '2026-07-15', type: 'Fartlek Dinâmico', distance: 6.5, duration: 42, calories: 450 },
    { id: 2, date: '2026-07-12', type: 'Treino Longo', distance: 12.0, duration: 85, calories: 890 }
  ]);

  // --- PLANILHA DE 16 SEMANAS ---
  const trainingPlan = useMemo(() => {
    const plan = {};
    for (let w = 1; w <= 16; w++) {
      plan[w] = {
        treinos: [
          { dia: "Seg", tipo: "Kettlebell + Yoga", desc: "3x12 Swings + Vinyasa Yoga (Estabilidade).", zona: "Força" },
          { dia: "Ter", tipo: "Corrida: Fartlek", desc: "15min trote + 8x(1min forte/1min leve).", zona: "Z3/Z4" },
          { dia: "Qua", tipo: "Kettlebell + Yoga", desc: "Core e mobilidade (Lunges + Posturas).", zona: "Força" },
          { dia: "Qui", tipo: "Corrida: Base", desc: "45min em ritmo confortável (Z2).", zona: "Z2" },
          { dia: "Sex", tipo: "Kettlebell + Yoga", desc: "Cadeia posterior: 3x12 Swings + Deadlifts.", zona: "Força" },
          { dia: "Sáb", tipo: "Corrida: Longo", desc: `Rodagem de ${6 + w}km constante.`, zona: "Z2" }
        ]
      };
    }
    return plan;
  }, []);

  // --- COMPONENTES ---
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex font-sans">
      {/* Sidebar Fixo */}
      <nav className="w-64 bg-slate-950 border-r border-slate-800 p-6 flex flex-col gap-6">
        <h1 className="text-xl font-black text-white">THE MACHINE</h1>
        {['hub', 'plan', 'progress'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`p-3 rounded-xl font-bold capitalize ${activeTab === tab ? 'bg-emerald-500 text-slate-950' : 'text-slate-500'}`}>
            {tab}
          </button>
        ))}
      </nav>

      {/* Conteúdo */}
      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'hub' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 col-span-3">
              <h2 className="text-2xl font-black">Dashboard Central</h2>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-slate-900 p-4 rounded-2xl">Distância Total: {activities.reduce((a,b)=>a+b.distance, 0)}km</div>
                <div className="bg-slate-900 p-4 rounded-2xl">Treinos: {activities.length}</div>
                <div className="bg-slate-900 p-4 rounded-2xl">Peso: 82.8kg</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'plan' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black">Planilha de Treinos (16 Semanas)</h2>
            <div className="grid grid-cols-3 gap-4">
              {trainingPlan[selectedWeek].treinos.map((t, i) => (
                <div key={i} className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                  <h3 className="font-bold text-emerald-400">{t.tipo}</h3>
                  <p className="text-sm text-slate-400">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
