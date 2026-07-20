import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Moon, Watch, BarChart2, Settings, Home, Zap, Heart, Flame, Route, CheckCircle2, AlertCircle, BookOpen, Dumbbell, Calendar } from 'lucide-react';

export default function App() {
  // --- INJEÇÃO DO ESTILO (Tailwind CDN) ---
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState('hub');
  const [activities, setActivities] = useState([
    { id: 1, date: '2026-07-15', type: 'Fartlek Dinâmico', distance: 6.5, duration: 42, calories: 450 },
    { id: 2, date: '2026-07-12', type: 'Treino Longo', distance: 12.0, duration: 85, calories: 890 }
  ]);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [completedWorkouts, setCompletedWorkouts] = useState({});
  const [selectedGlossaryTerm, setSelectedGlossaryTerm] = useState(null);

  // --- MÓDULO DE GLOSSÁRIO ---
  const glossary = {
    "Z2 (Zona 2)": "Ritmo aeróbio de conversa. Onde você constrói resistência e queima gordura sem exaustão.",
    "Fartlek": "Jogo de velocidade: variações entre ritmos fortes e leves no mesmo treino.",
    "VO2 Max": "Capacidade do seu motor cardíaco em processar oxigênio.",
    "Kettlebell Swing": "Movimento de quadril e glúteo, essencial para potência de passada.",
    "Tapering": "Fase de polimento: redução de volume próximo à prova para garantir frescor."
  };

  // --- LÓGICA DE TREINOS (Planilha de 16 semanas integrada) ---
  const trainingPlan = useMemo(() => {
    const plan = {};
    for (let w = 1; w <= 16; w++) {
      plan[w] = {
        treinos: [
          { dia: "Seg", tipo: "Kettlebell + Yoga", desc: "Estabilidade: 3x12 Swings + Vinyasa Yoga.", zona: "Força" },
          { dia: "Ter", tipo: "Corrida: Fartlek", desc: "15min trote + 8x(1min forte/1min leve).", zona: "Z3/Z4" },
          { dia: "Qua", tipo: "Kettlebell + Yoga", desc: "Core e mobilidade: Lunges e posturas de quadril.", zona: "Força" },
          { dia: "Qui", tipo: "Corrida: Base", desc: "45min em ritmo confortável de conversa.", zona: "Z2" },
          { dia: "Sex", tipo: "Kettlebell + Yoga", desc: "Cadeia posterior: 3x12 Swings + Deadlifts.", zona: "Força" },
          { dia: "Sáb/Dom", tipo: "Corrida: Longo", desc: `Rodagem de ${6 + w}km em ritmo constante.`, zona: "Z2" }
        ]
      };
    }
    return plan;
  }, []);

  // --- COMPONENTES DE RENDERIZAÇÃO ---

  const renderNav = () => (
    <nav className="fixed bottom-0 w-full md:relative md:w-64 bg-slate-950 border-t md:border-t-0 md:border-r border-slate-800 p-3 md:p-6 flex justify-around md:flex-col md:h-screen z-50">
      <div className="hidden md:flex items-center gap-3 mb-8">
        <div className="bg-emerald-500 text-slate-950 w-10 h-10 rounded-xl font-black flex items-center justify-center">M</div>
        <span className="font-black text-white text-lg">The Machine</span>
      </div>
      {[
        { id: 'hub', label: 'Dashboard', icon: Home },
        { id: 'plan', label: 'Planilha', icon: Calendar },
        { id: 'progress', label: 'Progresso', icon: BarChart2 },
        { id: 'glossary', label: 'Glossário', icon: BookOpen }
      ].map(item => (
        <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm ${activeTab === item.id ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-500'}`}>
          <item.icon size={20} />
          <span className="hidden md:block">{item.label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col md:flex-row font-sans">
      {renderNav()}
      
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {activeTab === 'hub' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-black text-white">Dashboard Central</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800">
                  <span className="text-slate-400 text-xs uppercase font-bold">Total Distância</span>
                  <div className="text-3xl font-black mt-2">{activities.reduce((acc, a) => acc + a.distance, 0)} km</div>
                </div>
                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800">
                  <span className="text-slate-400 text-xs uppercase font-bold">Treinos Realizados</span>
                  <div className="text-3xl font-black mt-2">{activities.length}</div>
                </div>
                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800">
                  <span className="text-slate-400 text-xs uppercase font-bold">Peso Atual</span>
                  <div className="text-3xl font-black mt-2">82.8 kg</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'plan' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-black text-white">Planilha de Treinos (16 Semanas)</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trainingPlan[selectedWeek].treinos.map((t, i) => (
                  <div key={i} className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                    <div className="flex justify-between mb-3">
                      <span className="bg-slate-900 px-2 py-1 rounded text-[10px] font-bold">{t.dia}</span>
                      <span className="text-[10px] text-emerald-400 font-mono">{t.zona}</span>
                    </div>
                    <h3 className="font-bold text-white mb-1">{t.tipo}</h3>
                    <p className="text-xs text-slate-400">{t.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'glossary' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-black text-white">Glossário</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(glossary).map(([term, def]) => (
                  <div key={term} className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                    <h3 className="font-black text-emerald-400 mb-2">{term}</h3>
                    <p className="text-sm text-slate-300">{def}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
