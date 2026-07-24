import React, { useState } from 'react';
import { 
  Activity, Watch, Heart, Calendar, Upload, RefreshCw, 
  CheckCircle, Plus, Trash2, Smartphone, Zap, ChevronRight,
  TrendingUp
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activities, setActivities] = useState([
    { id: 1, date: '2026-07-24', name: 'Yoga + Kettlebell', type: 'Cross Training', duration: '50 min', source: 'Samsung Connect', completed: true },
    { id: 2, date: '2026-07-22', name: 'Futebol Intensivo (3x 15min)', type: 'Futebol', duration: '45 min', source: 'Manual', completed: true }
  ]);

  const [newActivityName, setNewActivityName] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const handleSyncSamsung = () => {
    setIsSyncing(true);
    setSyncMessage('A ligar ao Samsung Connect...');
    setTimeout(() => {
      setIsSyncing(false);
      setSyncMessage('Sincronização concluída!');
      const yogaExists = activities.some(a => a.name.includes('Yoga + Kettlebell'));
      if (!yogaExists) {
        setActivities(prev => [
          { id: Date.now(), date: new Date().toISOString().split('T')[0], name: 'Yoga + Kettlebell', type: 'Flexibilidade/Força', duration: '45 min', source: 'Samsung Connect', completed: true },
          ...prev
        ]);
      }
    }, 1500);
  };

  const handleAddActivity = (e) => {
    e.preventDefault();
    if (!newActivityName) return;
    setActivities([{ id: Date.now(), date: new Date().toISOString().split('T')[0], name: newActivityName, type: 'Corrida', duration: '30 min', source: 'Manual', completed: true }, ...activities]);
    setNewActivityName('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-4 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="font-bold text-xl text-white">The Machine</h1>
          <button onClick={handleSyncSamsung} className="bg-emerald-600 hover:bg-emerald-500 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} /> Sincronizar
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
            <p className="text-slate-400 text-xs">VO2 Max Estimado</p>
            <p className="text-2xl font-bold mt-1 text-white">48.5</p>
          </div>
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
            <p className="text-slate-400 text-xs">Carga Semanal</p>
            <p className="text-2xl font-bold mt-1 text-white">32.4 km</p>
          </div>
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
            <p className="text-slate-400 text-xs">Meta Maratona</p>
            <p className="text-2xl font-bold mt-1 text-emerald-400">2027</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-4">Atividades Recentes</h3>
          <div className="space-y-3">
            {activities.map(act => (
              <div key={act.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm text-white">{act.name}</p>
                  <p className="text-xs text-slate-400">{act.date} • {act.source}</p>
                </div>
                <span className="text-xs bg-slate-800 px-2 py-1 rounded">{act.type}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleAddActivity} className="flex gap-2">
          <input 
            value={newActivityName} 
            onChange={e => setNewActivityName(e.target.value)}
            placeholder="Registar novo treino..." 
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm"
          />
          <button type="submit" className="bg-emerald-600 px-4 py-2 rounded-xl text-sm font-bold text-white"><Plus className="w-4 h-4"/></button>
        </form>
      </main>
    </div>
  );
}
