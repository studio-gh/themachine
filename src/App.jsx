import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Moon, Watch, BarChart2, Settings, Home, Zap, Heart, Flame, Route, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  // --- INJEÇÃO DE SEGURANÇA DO TAILWIND CSS ---
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  // --- ESTADOS DE NAVEGAÇÃO E SISTEMA ---
  const [activeTab, setActiveTab] = useState('hub'); // 'hub', 'progress', 'sleep', 'sync'
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState(null);

  // --- DADOS DO USUÁRIO (THE MACHINE) ---
  const [weight, setWeight] = useState(82.8);
  const [restingHR, setRestingHR] = useState(62);
  const [maxHR, setMaxHR] = useState(179);

  // --- ESTADOS DE CONEXÃO ---
  const [connections, setConnections] = useState({
    samsungHealth: true,
    googleFit: false,
    strava: false
  });

  // --- DADOS DE TREINO E ATIVIDADES (MOCK INICIAL) ---
  const [activities, setActivities] = useState([
    { id: 1, date: '2026-07-15', type: 'Fartlek Dinâmico', distance: 6.5, duration: 42, calories: 450 },
    { id: 2, date: '2026-07-12', type: 'Treino Longo', distance: 12.0, duration: 85, calories: 890 },
    { id: 3, date: '2026-07-10', type: 'Corrida Base (Z2)', distance: 8.0, duration: 50, calories: 510 },
  ]);

  // --- DADOS DE SONO ---
  const [sleepData, setSleepData] = useState([
    { date: '2026-07-15', hours: 6.5, quality: 'Razoável', deepSleepPct: 15 },
    { date: '2026-07-14', hours: 7.8, quality: 'Boa', deepSleepPct: 22 },
    { date: '2026-07-13', hours: 5.5, quality: 'Ruim', deepSleepPct: 10 },
    { date: '2026-07-12', hours: 8.2, quality: 'Excelente', deepSleepPct: 28 },
  ]);

  // --- EFEITOS VISUAIS (TOAST) ---
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // --- LÓGICA DE SINCRONIZAÇÃO (PUSH BUTTON) ---
  const handleWatchSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const newRestingHR = Math.floor(Math.random() * (64 - 58 + 1) + 58);
      setRestingHR(newRestingHR);

      const today = new Date().toISOString().split('T')[0];
      if (!activities.find(a => a.date === today)) {
        const newAct = {
          id: Date.now(),
          date: today,
          type: 'Corrida Base (Z2) - Auto Sync',
          distance: 5.2,
          duration: 35,
          calories: 380
        };
        setActivities(prev => [newAct, ...prev]);
      }

      const lastNight = new Date();
      lastNight.setDate(lastNight.getDate() - 1);
      const lastNightStr = lastNight.toISOString().split('T')[0];
      
      if (!sleepData.find(s => s.date === lastNightStr)) {
        setSleepData(prev => [{
          date: lastNightStr, hours: 7.2, quality: 'Boa', deepSleepPct: 20
        }, ...prev]);
      }

      setIsSyncing(false);
      showToast(`Sync Concluído! Repouso atualizado para ${newRestingHR} BPM e dados do dia importados.`);
    }, 2000);
  };

  // --- CÁLCULOS E AGREGAÇÕES MENSAIS (THE MACHINE HUB) ---
  const monthlyStats = useMemo(() => {
    const totalDistance = activities.reduce((acc, curr) => acc + curr.distance, 0);
    const totalCalories = activities.reduce((acc, curr) => acc + curr.calories, 0);
    const totalTime = activities.reduce((acc, curr) => acc + curr.duration, 0);
    const avgSleep = sleepData.reduce((acc, curr) => acc + curr.hours, 0) / (sleepData.length || 1);
    
    return {
      distance: totalDistance.toFixed(1),
      calories: totalCalories,
      time: Math.floor(totalTime / 60) + 'h ' + (totalTime % 60) + 'm',
      workouts: activities.length,
      sleep: avgSleep.toFixed(1)
    };
  }, [activities, sleepData]);

  // --- LÓGICA DE INSIGHTS BASEADA EM DADOS REAIS ---
  const getHealthInsight = () => {
    const recentSleep = sleepData[0]?.hours || 0;
    const totalRecentDistance = activities.slice(0, 3).reduce((acc, curr) => acc + curr.distance, 0);

    if (recentSleep < 6 && totalRecentDistance > 15) {
      return { 
        alert: 'warning', 
        text: "Alerta de Sobrecarga! Você correu um volume alto recentemente, mas sua última noite de sono foi curta. Foque hoje em mobilidade ou descanso absoluto." 
      };
    } else if (recentSleep >= 7) {
      return { 
        alert: 'good', 
        text: "Recuperação em dia. Seu sono profundo estável permite um treino Fartlek forte hoje, se estiver na planilha." 
      };
    }
    return { 
      alert: 'neutral', 
      text: "Métricas estáveis. Mantenha a consistência e não esqueça a hidratação." 
    };
  };

  const insight = getHealthInsight();

  // --- RENDERIZADORES DE ABAS ---
  
  const renderHub = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 to-slate-950 p-6 rounded-3xl border border-slate-800 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
          <Zap size={120} />
        </div>
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Activity className="text-emerald-400" /> Dashboard: The Machine
          </h2>
          <p className="text-sm text-slate-400 mt-1">Acumulado do Mês Atual. Seus dados biométricos processados.</p>
        </div>
        <button 
          onClick={handleWatchSync}
          disabled={isSyncing}
          className={`relative z-10 flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg ${
            isSyncing 
              ? 'bg-slate-800 text-emerald-500 border border-emerald-500/35' 
              : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 hover:scale-105 shadow-emerald-500/20'
          }`}
        >
          <Watch className={isSyncing ? 'animate-spin' : ''} size={20} />
          {isSyncing ? 'Sincronizando Watch...' : 'Push Sync (Galaxy Watch)'}
        </button>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-3xl flex flex-col justify-between shadow-md">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Distância</span>
            <Route className="text-emerald-500" size={18} />
          </div>
          <div>
            <span className="text-3xl font-black text-white">{monthlyStats.distance}</span>
            <span className="text-sm text-slate-400 ml-1">km</span>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-5 rounded-3xl flex flex-col justify-between shadow-md">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Calorias</span>
            <Flame className="text-orange-500" size={18} />
          </div>
          <div>
            <span className="text-3xl font-black text-white">{monthlyStats.calories}</span>
            <span className="text-sm text-slate-400 ml-1">kcal</span>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-5 rounded-3xl flex flex-col justify-between shadow-md">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Média Sono</span>
            <Moon className="text-cyan-500" size={18} />
          </div>
          <div>
            <span className="text-3xl font-black text-white">{monthlyStats.sleep}</span>
            <span className="text-sm text-slate-400 ml-1">h/noite</span>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-5 rounded-3xl flex flex-col justify-between relative overflow-hidden shadow-md">
          <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
            <Heart size={80} className="text-rose-500" />
          </div>
          <div className="flex justify-between items-center mb-4 relative z-10">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">FCM Repouso</span>
            <Heart className="text-rose-500 animate-pulse" size={18} />
          </div>
          <div className="relative z-10">
            <span className="text-3xl font-black text-white">{restingHR}</span>
            <span className="text-sm text-slate-400 ml-1">bpm</span>
          </div>
        </div>
      </div>

      {/* AI INSIGHT */}
      <div className={`p-5 rounded-3xl border flex items-start gap-4 shadow-md ${
        insight.alert === 'warning' ? 'bg-orange-950/30 border-orange-500/50' : 
        insight.alert === 'good' ? 'bg-emerald-950/30 border-emerald-500/50' : 
        'bg-slate-950 border-slate-800'
      }`}>
        <div className="mt-1">
          {insight.alert === 'warning' ? <AlertCircle className="text-orange-500" /> : 
           insight.alert === 'good' ? <CheckCircle2 className="text-emerald-500" /> : 
           <Zap className="text-cyan-500" />}
        </div>
        <div>
          <h4 className="font-bold text-white mb-1">Insight Fisiológico da Máquina</h4>
          <p className="text-sm text-slate-300 leading-relaxed">{insight.text}</p>
        </div>
      </div>
    </div>
  );

  const renderProgress = () => (
    <div className="space-y-6">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
          <BarChart2 className="text-emerald-400" /> Gráfico de Evolução de Carga
        </h3>
        
        <div className="h-48 flex items-end gap-2 md:gap-4 border-b border-slate-800 pb-2 relative">
          <div className="absolute w-full top-0 border-t border-slate-800/50 border-dashed z-0"></div>
          <div className="absolute w-full top-1/2 border-t border-slate-800/50 border-dashed z-0"></div>
          
          {[...activities].reverse().slice(0, 10).map((act, i) => {
            const heightPct = Math.min(100, (act.distance / 20) * 100);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 z-10 group">
                <div className="w-full relative flex justify-center">
                  <div 
                    className="w-full max-w-[40px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-500 group-hover:from-emerald-400 group-hover:to-emerald-300 shadow-md"
                    style={{ height: `${heightPct}%`, minHeight: '10%' }}
                  ></div>
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-[10px] py-1 px-2 rounded-lg font-bold pointer-events-none transition-opacity whitespace-nowrap shadow-lg">
                    {act.distance} km
                  </div>
                </div>
                <span className="text-[9px] text-slate-500 font-mono font-bold rotate-[-45deg] origin-top-left mt-2">
                  {act.date.substring(5)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h3 className="text-lg font-black text-white mb-4">Últimas Atividades Registradas</h3>
        <div className="space-y-3">
          {activities.map(act => (
            <div key={act.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-900 rounded-2xl border border-slate-800 gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-slate-800 p-3 rounded-xl">
                  <Route className="text-emerald-500" size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{act.type}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{act.date}</p>
                </div>
              </div>
              <div className="flex gap-4 md:gap-8 justify-between md:justify-end">
                <div className="text-right">
                  <span className="block text-sm font-black text-white">{act.distance} km</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wide">Distância</span>
                </div>
                <div className="text-right">
                  <span className="block text-sm font-black text-white">{act.duration} min</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wide">Tempo</span>
                </div>
                <div className="text-right">
                  <span className="block text-sm font-black text-orange-400">{act.calories} kcal</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wide">Energia</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSleep = () => (
    <div className="space-y-6">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
          <Moon className="text-cyan-400" /> Histórico de Sono e Recuperação
        </h3>
        <p className="text-xs text-slate-400 mb-6">Métricas puxadas do algoritmo avançado de sono do Galaxy Watch 4.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sleepData.map((sleep, idx) => (
            <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between shadow-md">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1">{sleep.date}</span>
                <h4 className="text-lg font-black text-white">{sleep.hours} <span className="text-xs text-slate-400 font-normal">horas</span></h4>
              </div>
              <div className="text-right">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                  sleep.quality === 'Excelente' ? 'bg-emerald-500/20 text-emerald-400' :
                  sleep.quality === 'Boa' ? 'bg-cyan-500/20 text-cyan-400' :
                  sleep.quality === 'Razoável' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-rose-500/20 text-rose-400'
                }`}>
                  {sleep.quality}
                </span>
                <p className="text-[10px] text-slate-400 mt-2">Sono Profundo: <strong className="text-white">{sleep.deepSleepPct}%</strong></p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSync = () => (
    <div className="space-y-6">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
          <Settings className="text-slate-400" /> Hub de Conexões de Saúde
        </h3>
        <p className="text-xs text-slate-400 mb-8">Gerencie de onde "A Máquina" puxa seus dados biométricos.</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-black text-white">SH</div>
              <div>
                <h4 className="font-bold text-white text-sm">Samsung Health (Watch 4)</h4>
                <p className="text-[10px] text-slate-400">Fonte primária: Coração, Passos, Sono.</p>
              </div>
            </div>
            <button 
              onClick={() => setConnections({...connections, samsungHealth: !connections.samsungHealth})}
              className={`w-12 h-6 rounded-full transition-colors relative ${connections.samsungHealth ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${connections.samsungHealth ? 'translate-x-7' : 'translate-x-1'}`}></div>
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-black text-red-500 border border-slate-300">G</div>
              <div>
                <h4 className="font-bold text-white text-sm">Health Connect / Google Fit</h4>
                <p className="text-[10px] text-slate-400">Backup de dados e integração Android.</p>
              </div>
            </div>
            <button 
              onClick={() => setConnections({...connections, googleFit: !connections.googleFit})}
              className={`w-12 h-6 rounded-full transition-colors relative ${connections.googleFit ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${connections.googleFit ? 'translate-x-7' : 'translate-x-1'}`}></div>
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center font-black text-white">St</div>
              <div>
                <h4 className="font-bold text-white text-sm">Strava</h4>
                <p className="text-[10px] text-slate-400">Importação de Paces e rotas de corrida.</p>
              </div>
            </div>
            <button 
              onClick={() => setConnections({...connections, strava: !connections.strava})}
              className={`w-12 h-6 rounded-full transition-colors relative ${connections.strava ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${connections.strava ? 'translate-x-7' : 'translate-x-1'}`}></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans flex flex-col md:flex-row antialiased">
      
      {toast && (
        <div className="fixed top-6 right-4 left-4 md:left-auto md:w-96 z-50 animate-fade-in">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl border text-sm font-bold flex items-center gap-3 ${
            toast.type === 'success' ? 'bg-emerald-950 text-emerald-400 border-emerald-500/50' : 'bg-slate-900 text-white border-slate-700'
          }`}>
            <CheckCircle2 size={18} />
            {toast.message}
          </div>
        </div>
      )}

      {/* SIDEBAR (Desktop) / BOTTOM NAV (Mobile) */}
      <nav className="fixed bottom-0 w-full md:relative md:w-24 lg:w-64 bg-slate-950 border-t md:border-t-0 md:border-r border-slate-800/80 z-40 flex md:flex-col justify-around md:justify-start p-3 md:p-4 gap-2 md:gap-4 md:h-screen transition-all shadow-2xl">
        
        <div className="hidden md:flex items-center gap-3 mb-8 lg:px-2">
          <div className="bg-emerald-500 text-slate-950 w-10 h-10 rounded-xl font-black flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20">M</div>
          <span className="hidden lg:block font-black text-lg tracking-tight text-white">The Machine</span>
        </div>

        <NavItem icon={<Home />} label="Hub" isActive={activeTab === 'hub'} onClick={() => setActiveTab('hub')} />
        <NavItem icon={<BarChart2 />} label="Evolução" isActive={activeTab === 'progress'} onClick={() => setActiveTab('progress')} />
        <NavItem icon={<Moon />} label="Sono" isActive={activeTab === 'sleep'} onClick={() => setActiveTab('sleep')} />
        <NavItem icon={<Settings />} label="Sync" isActive={activeTab === 'sync'} onClick={() => setActiveTab('sync')} />
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-28 md:pb-8">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'hub' && renderHub()}
          {activeTab === 'progress' && renderProgress()}
          {activeTab === 'sleep' && renderSleep()}
          {activeTab === 'sync' && renderSync()}
        </div>
      </main>

    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col lg:flex-row items-center lg:justify-start justify-center gap-1.5 lg:gap-3 p-2 md:p-3 lg:px-4 rounded-xl transition-all ${
        isActive 
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
      }`}
    >
      <div className={`${isActive ? 'scale-110 transition-transform' : ''}`}>
        {React.cloneElement(icon, { size: 20 })}
      </div>
      <span className="text-[10px] lg:text-sm font-bold">{label}</span>
    </button>
  );
}
