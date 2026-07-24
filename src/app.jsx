import React, { useState } from 'react';
import { 
  Activity, Calendar, Heart, Award, RefreshCw, 
  CheckCircle, Plus, Trash2, Smartphone, Zap, ChevronRight,
  TrendingUp, BarChart2, ShieldCheck
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activities, setActivities] = useState([
    { id: 1, date: '2026-07-24', name: 'Yoga + Kettlebell', type: 'Cross Training', duration: '50 min', source: 'Samsung Connect', completed: true }
  ]);

  const [trainingPlan] = useState([
    { week: 1, focus: 'Adaptação Base & Fartlek Suave', workouts: [
        { day: 'Terça', type: 'Fartlek', desc: '10 min aquecimento + 6x (1 min forte / 1 min leve)' },
        { day: 'Quarta', type: 'Yoga + Mobilidade', desc: 'Sessão de estabilização e Kettlebell' },
        { day: 'Sábado', type: 'Longo Aeróbico', desc: '12 km em Zona 2' }
    ]},
    { week: 2, focus: 'Expansão de Volume', workouts: [
        { day: 'Terça', type: 'Fartlek', desc: '10 min aquecimento + 5x (2 min forte / 1 min leve)' },
        { day: 'Sábado', type: 'Longo Aeróbico', desc: '14 km estruturados' }
    ]}
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="font-bold text-xl text-white">The Machine</h1>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-1 text-xs rounded-lg ${activeTab === 'dashboard' ? 'bg-emerald-600' : 'bg-slate-800'}`}>Painel</button>
            <button onClick={() => setActiveTab('plan')} className={`px-3 py-1 text-xs rounded-lg ${activeTab === 'plan' ? 'bg-emerald-600' : 'bg-slate-800'}`}>Planilha</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <h2 className="text-lg font-bold mb-4">Atividades Recentes</h2>
              {activities.map(a => (
                <div key={a.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-2 flex justify-between">
                  <span>{a.name}</span>
                  <span className="text-emerald-400 text-xs">{a.source}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'plan' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Planilha de Treinos 2027</h2>
            {trainingPlan.map((w, i) => (
              <div key={i} className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                <h3 className="font-bold text-emerald-400 mb-3">Semana {w.week}: {w.focus}</h3>
                {w.workouts.map((work, j) => (
                  <div key={j} className="border-t border-slate-800 pt-2 pb-2">
                    <p className="font-semibold text-sm">{work.day} - {work.type}</p>
                    <p className="text-xs text-slate-400">{work.desc}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
