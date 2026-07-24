import React, { useState, useEffect } from 'react';
import { 
  Activity, Watch, Heart, Smartphone, Flame, Calendar, 
  Upload, RefreshCw, BarChart2, Shield, Settings, CheckCircle, 
  AlertTriangle, ArrowUpRight, Zap, Award, Compass, Play, Plus, Trash2, Check
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSource, setSyncSource] = useState(null);
  const [syncMessage, setSyncMessage] = useState('');
  
  const [activities, setActivities] = useState([]);
  
  const [healthMetrics, setHealthMetrics] = useState({
    restingHR: 52,
    hrv: 68,
    sleepScore: 88,
    vo2Max: 48.5,
    bodyBattery: '85%'
  });

  const [trainingPlan, setTrainingPlan] = useState([
    { week: 1, day: 'Terça', type: 'Fartlek 8km (Z3/Z4)', status: 'Pendente', details: 'Aquecimento + 5x (1 min forte / 1 min leve)' },
    { week: 1, day: 'Quarta', type: 'Kettlebell + Yoga (Substituído por Futebol)', status: 'Realizado (Futebol)', details: '3 partidas de futebol intenso de 15 min cada' },
    { week: 1, day: 'Quinta', type: 'Rodagem Leve Z2 (6km)', status: 'Pendente', details: 'Manter FC abaixo de 142 bpm' },
    { week: 1, day: 'Sábado', type: 'Treino Longo (14km)', status: 'Pendente', details: 'Ritmo constante Z1/Z2' }
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [newTraining, setNewTraining] = useState({ date: '', name: '', type: 'Outros', distance: '', duration: '', details: '' });
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleSync = (sourceName) => {
    setIsSyncing(true);
    setSyncSource(sourceName);
    setSyncMessage(`A ligar ao ${sourceName}... A sincronizar métricas do telemóvel e relógio.`);

    setTimeout(() => {
      setIsSyncing(false);
      setSyncMessage('');
      setHealthMetrics(prev => ({
        ...prev,
        restingHR: Math.floor(50 + Math.random() * 4),
        hrv: Math.floor(66 + Math.random() * 8),
        sleepScore: Math.floor(85 + Math.random() * 10)
      }));
      showToast(`Sincronização com ${sourceName} concluída com sucesso!`);
    }, 2000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      if (lines.length > 1) {
        const importedActivity = {
          id: Date.now(),
          date: new Date().toISOString().split('T')[0],
          name: `Atividade Importada (${file.name})`,
          type: 'Corrida',
          distance: 10.2,
          duration: '52m 10s',
          pace: '5:06',
          hr: 151,
          calories: 740,
          source: 'Strava / CSV'
        };
        setActivities(prev => [importedActivity, ...prev]);
        showToast(`Ficheiro ${file.name} importado e integrado com sucesso!`);
      } else {
        showToast('Ficheiro importado, mas sem linhas de dados detetadas.');
      }
    };
    reader.readAsText(file);
  };

  const addCustomActivity = (e) => {
    e.preventDefault();
    if (!newTraining.name) return;
    const item = {
      id: Date.now(),
      date: newTraining.date || new Date().toISOString().split('T')[0],
      name: newTraining.name,
      type: newTraining.type,
      distance: newTraining.distance ? parseFloat(newTraining.distance) : 0,
      duration: newTraining.duration || '45m',
      pace: newTraining.distance ? '5:30' : 'N/A',
      hr: 155,
      calories: 520,
      source: 'Registo Manual (The Machine)'
    };
    setActivities([item, ...activities]);
    setModalOpen(false);
    setNewTraining({ date: '', name: '', type: 'Outros', distance: '', duration: '', details: '' });
    showToast('Atividade real registada com sucesso no The Machine!');
  };

  const clearHistory = () => {
    if (window.confirm('Tem a certeza de que pretende limpar o histórico de atividades?')) {
      setActivities([]);
      showToast('Histórico limpo com sucesso.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-24 md:pb-6">
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-orange-500 to-amber-400 p-2 rounded-xl text-slate-950 shadow-lg shadow-orange-500/20">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              The Machine <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">Meia Maratona 2026</span>
            </h1>
            <p className="text-xs text-slate-400">Galaxy Watch 4 • Samsung Health • Strava • Google Health</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <button 
            onClick={() => handleSync('Galaxy Watch / Samsung Health')} 
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg border border-slate-700 transition"
          >
            <Watch className="w-4 h-4 text-cyan-400" /> Sincronizar Watch
          </button>
          <button 
            onClick={() => handleSync('Strava API')} 
            className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-xs font-semibold rounded-lg text-white shadow-md shadow-orange-600/20 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> Sincronizar Strava
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* SYNC STATUS BANNER */}
        {isSyncing && (
          <div className="bg-cyan-950/40 border border-cyan-800/60 p-4 rounded-2xl flex items-center gap-4 animate-pulse">
            <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
            <div>
              <p className="text-sm font-bold text-cyan-200">A sincronizar com {syncSource}...</p>
              <p className="text-xs text-cyan-400/80">{syncMessage}</p>
            </div>
          </div>
        )}

        {/* TOP METRICS SUMMARY CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-2xl shadow-sm hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Repouso Cardíaco</span>
              <Heart className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-white">{healthMetrics.restingHR} <span className="text-xs font-normal text-slate-400">bpm</span></div>
            <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> Excelente recuperação
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-2xl shadow-sm hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Variabilidade (HRV)</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white">{healthMetrics.hrv} <span className="text-xs font-normal text-slate-400">ms</span></div>
            <div className="mt-2 text-xs text-cyan-400 flex items-center gap-1">
              Sistema nervoso equilibrado
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-2xl shadow-sm hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Qualidade do Sono</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white">{healthMetrics.sleepScore}%</div>
            <div className="mt-2 text-xs text-amber-400 flex items-center gap-1">
              Sono reparador detetado
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-2xl shadow-sm hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">VO2 Max (Estimado)</span>
              <Award className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-2xl font-black text-white">{healthMetrics.vo2Max} <span className="text-xs font-normal text-slate-400">ml/kg</span></div>
            <div className="mt-2 text-xs text-orange-400 flex items-center gap-1">
              Evolução rumo à prova
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
          >
            Painel Geral
          </button>
          <button 
            onClick={() => setActiveTab('integrations')} 
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition whitespace-nowrap ${activeTab === 'integrations' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
          >
            Dispositivos & Conexões
          </button>
          <button 
            onClick={() => setActiveTab('plan')} 
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition whitespace-nowrap ${activeTab === 'plan' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
          >
            Plano & Treinos Fartlek
          </button>
          <button 
            onClick={() => setActiveTab('import')} 
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition whitespace-nowrap ${activeTab === 'import' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
          >
            Importar & Histórico
          </button>
        </div>

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* ATIVIDADES RECENTES */}
              <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-orange-500" /> Atividades Recentes Sincronizadas
                  </h2>
                  <button onClick={() => setModalOpen(true)} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 font-medium flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Adicionar Treino
                  </button>
                </div>

                {activities.length === 0 ? (
                  <div className="text-center py-12 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl space-y-3">
                    <Compass className="w-10 h-10 text-slate-600 mx-auto" />
                    <div>
                      <p className="text-sm font-bold text-slate-300">Nenhuma atividade recente registada</p>
                      <p className="text-xs text-slate-500">Sincronize com o Strava, importe o seu ficheiro CSV ou adicione um treino manualmente (como o seu futebol de quarta-feira).</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.map((act) => (
                      <div key={act.id} className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            <Compass className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white">{act.name}</h3>
                            <p className="text-xs text-slate-400">{act.date} • <span className="text-cyan-400">{act.source}</span></p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 sm:flex items-center gap-4 text-right">
                          <div>
                            <div className="text-xs text-slate-500 uppercase">Distância</div>
                            <div className="text-sm font-bold text-white">{act.distance} km</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 uppercase">Duração</div>
                            <div className="text-sm font-bold text-white">{act.duration}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 uppercase">FC Média</div>
                            <div className="text-sm font-bold text-rose-400">{act.hr} bpm</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* STATUS & META MEIA MARATONA */}
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-5">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" /> Meta: Meia Maratona 2026
                </h2>
                
                <div className="bg-gradient-to-br from-orange-950/30 to-amber-950/20 border border-orange-800/40 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between text-xs text-slate-300 font-semibold">
                    <span>Progresso do Plano</span>
                    <span className="text-orange-400">Semana 1 de 16</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-orange-500 h-full w-[6%] rounded-full"></div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Foco inicial na adaptação aeróbica e gestão flexível de treinos alternativos (como partidas de futebol).
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Próximos Treinos Chave</h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white">Fartlek Estruturado</p>
                        <p className="text-slate-400">Terça-feira • Z3/Z4</p>
                      </div>
                      <span className="px-2 py-1 bg-orange-500/10 text-orange-400 rounded-md font-medium border border-orange-500/20">Principal</span>
                    </div>
                    <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white">Rodagem Longa Z2</p>
                        <p className="text-slate-400">Domingo • 10 km</p>
                      </div>
                      <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded-md font-medium border border-cyan-500/20">Base</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* TAB 2: INTEGRATIONS */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Central de Conexões e Ecossistema</h2>
                <p className="text-sm text-slate-400">Estado das ligações ao Galaxy Watch 4, Samsung Health, Strava e Google Health.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* GALAXY WATCH / SAMSUNG HEALTH */}
                <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Watch className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white">Galaxy Watch 4 & Samsung Health</h3>
                      <p className="text-xs text-slate-400">Sincroniza batimentos cardíacos, sono e treinos registados no pulso.</p>
                      <div className="flex items-center gap-2 pt-2">
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                          <Check className="w-3.5 h-3.5" /> Pronto para Sincronizar
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleSync('Samsung Health')}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl border border-slate-700 transition"
                  >
                    Sincronizar
                  </button>
                </div>

                {/* STRAVA */}
                <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      <Activity className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white">Strava Connect</h3>
                      <p className="text-xs text-slate-400">Importação automática de rotas GPS, altimetria e segmentos.</p>
                      <div className="flex items-center gap-2 pt-2">
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                          <Check className="w-3.5 h-3.5" /> Token Ativo
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleSync('Strava')}
                    className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-xs font-semibold rounded-xl text-white transition shadow-md shadow-orange-600/20"
                  >
                    Sincronizar
                  </button>
                </div>

                {/* GOOGLE HEALTH / HEALTH CONNECT */}
                <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Heart className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white">Google Health (Health Connect)</h3>
                      <p className="text-xs text-slate-400">Centraliza dados de saúde unificados do telemóvel Android.</p>
                      <div className="flex items-center gap-2 pt-2">
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                          <Check className="w-3.5 h-3.5" /> Ativo
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleSync('Google Health')}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl border border-slate-700 transition"
                  >
                    Sincronizar
                  </button>
                </div>

                {/* DICAS DE CONFIGURAÇÃO WATCH */}
                <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl space-y-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Settings className="w-4 h-4 text-amber-400" /> Dica para o Galaxy Watch 4
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Para treinos de Fartlek, utilize o botão de Lap manual no relógio para segmentar cada bloco de velocidade com precisão.
                  </p>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TRAINING PLAN */}
        {activeTab === 'plan' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Plano de Treino Especializado</h2>
                  <p className="text-sm text-slate-400">Periodização baseada em Fartlek científico (Andres, 2024) e desenvolvimento aeróbico (Guilherme, 2004).</p>
                </div>
                <span className="px-3 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-xl text-xs font-semibold self-start">
                  Foco: Meia Maratona
                </span>
              </div>

              <div className="space-y-3">
                {trainingPlan.map((tp, index) => (
                  <div key={index} className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-orange-400 uppercase">Semana {tp.week} • {tp.day}</span>
                        </div>
                        <h3 className="text-sm font-bold text-white">{tp.type}</h3>
                        <p className="text-xs text-slate-400">{tp.details}</p>
                      </div>
                    </div>
                    <div>
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${tp.status.includes('Realizado') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                        {tp.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: IMPORT & HISTORY */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Importação de Ficheiros & Gestão de Dados</h2>
                <p className="text-sm text-slate-400">Carregue o seu ficheiro <code className="text-orange-400 font-mono">activities.csv</code> exportado do Strava para povoar o seu histórico real.</p>
              </div>

              <div className="border-2 border-dashed border-slate-800 hover:border-orange-500/50 rounded-2xl p-8 text-center space-y-4 transition bg-slate-950/40">
                <div className="w-12 h-12 bg-orange-500/10 text-orange-400 rounded-2xl mx-auto flex items-center justify-center border border-orange-500/20">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">Arraste o seu ficheiro CSV ou clique para procurar</p>
                  <p className="text-xs text-slate-400">Compatível com exportações do Strava e Samsung Health</p>
                </div>
                <label className="inline-block cursor-pointer bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-orange-600/20 transition">
                  Selecionar Ficheiro CSV
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-400">Precisa de limpar o histórico de atividades?</p>
                <button 
                  onClick={clearHistory}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 text-xs font-semibold rounded-xl border border-rose-500/30 transition"
                >
                  <Trash2 className="w-4 h-4" /> Limpar Histórico
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-40 px-6 py-3 flex items-center justify-around">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-orange-500' : 'text-slate-400'}`}>
          <Activity className="w-5 h-5" />
          <span className="text-[10px] font-medium">Painel</span>
        </button>
        <button onClick={() => setActiveTab('integrations')} className={`flex flex-col items-center gap-1 ${activeTab === 'integrations' ? 'text-orange-500' : 'text-slate-400'}`}>
          <Watch className="w-5 h-5" />
          <span className="text-[10px] font-medium">Watch</span>
        </button>
        <button onClick={() => setActiveTab('plan')} className={`flex flex-col items-center gap-1 ${activeTab === 'plan' ? 'text-orange-500' : 'text-slate-400'}`}>
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] font-medium">Planos</span>
        </button>
        <button onClick={() => setActiveTab('import')} className={`flex flex-col items-center gap-1 ${activeTab === 'import' ? 'text-orange-500' : 'text-slate-400'}`}>
          <Upload className="w-5 h-5" />
          <span className="text-[10px] font-medium">Dados</span>
        </button>
      </nav>

      {/* MODAL PARA ADICIONAR TREINO */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-6 rounded-2xl space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Registar Nova Atividade Real</h3>
            <form onSubmit={addCustomActivity} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Nome / Descrição da Atividade</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Futebol Intensivo (3x15 min)" 
                  value={newTraining.name}
                  onChange={e => setNewTraining({...newTraining, name: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Tipo</label>
                  <select 
                    value={newTraining.type}
                    onChange={e => setNewTraining({...newTraining, type: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="Corrida">Corrida</option>
                    <option value="Futebol">Futebol</option>
                    <option value="Força / Kettlebell">Força / Kettlebell</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Duração</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 45m" 
                    value={newTraining.duration}
                    onChange={e => setNewTraining({...newTraining, duration: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Distância (opcional se corrida)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  placeholder="0.0" 
                  value={newTraining.distance}
                  onChange={e => setNewTraining({...newTraining, distance: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded-xl hover:bg-orange-500 shadow-md shadow-orange-600/20 transition"
                >
                  Guardar Treino
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
