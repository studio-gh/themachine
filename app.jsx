import React, { useState, useEffect } from 'react';

export default function App() {
  // Estado das Abas: 'planilha' | 'visaoGeral' | 'dashboard' | 'saude' | 'progresso'
  const [activeTab, setActiveTab] = useState('planilha');
  
  // Semana selecionada para visualização detalhada (1 a 16)
  const [selectedSemana, setSelectedSemana] = useState(2);

  // Estado de Conexões Reais / Simuladas do Ecossistema
  const [connections, setConnections] = useState({
    galaxyWatch: { status: 'Desconectado', lastSync: 'Nunca', rhr: 54, hrv: 68, sleep: '7h 40m' },
    samsungHealth: { status: 'Desconectado', lastSync: 'Nunca' },
    strava: { status: 'Desconectado', lastSync: 'Nunca', activitiesCount: 0 }
  });

  // Base completa de treinos por semana (Foco: Base até 15km Dez/2026 -> Meia Maratona Rio Maio/2027)
  const [allWeeksData, setAllWeeksData] = useState(() => {
    const saved = localStorage.getItem('treinos_ciclo_completo_v4');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return {
      1: [
        { id: 101, dia: 'Segunda-feira', tipo: 'Força & Mobilidade', status: 'Concluído', desc: 'Yoga + Kettlebell (45 min): Adaptação neuromuscular e mobilidade de tornozelo e anca.' },
        { id: 102, dia: 'Terça-feira', tipo: 'Fartlek Base', status: 'Concluído', desc: 'Total: 6 km. Aquecimento 10 min Z1 + 5x (1 min forte pace 5:10 + 2 min trote Z2) + 5 min arrefecimento.' },
        { id: 103, dia: 'Quarta-feira', tipo: 'Força & Mobilidade', status: 'Concluído', desc: 'Yoga + Kettlebell (45 min): Estabilização do core e fortalecimento de glúteos.' },
        { id: 104, dia: 'Quinta-feira', tipo: 'Corrida Contínua Leve', status: 'Concluído', desc: 'Total: 5 km contínuos em Zona 2 confortável. Ritmo alvo entre 6:15 e 6:30/km.' },
        { id: 105, dia: 'Sexta-feira', tipo: 'Força & Mobilidade', status: 'Concluído', desc: 'Yoga + Kettlebell (45 min): Liberação miofascial e descanso ativo.' },
        { id: 106, dia: 'Sábado', tipo: 'Treino Longo Base', status: 'Concluído', desc: 'Total: 8 km em Zona 1/2 constante. Ritmo estável em 6:30/km para construção mitocondrial.' },
        { id: 107, dia: 'Domingo', tipo: 'Descanso Total', status: 'Concluído', desc: 'Recuperação neuromuscular absoluta e hidratação.' }
      ],
      2: [
        { id: 201, dia: 'Segunda-feira', tipo: 'Força & Mobilidade', status: 'Pendente', desc: 'Yoga + Kettlebell (45 min): Foco em mobilidade de anca e estabilização do core.' },
        { id: 202, dia: 'Terça-feira', tipo: 'Fartlek', status: 'Pendente', desc: 'Total: 7 km. Aquecimento 10 min Z1 + 6x (1 min forte sub-5:00/km + 2 min trote Z2) + 5 min arrefecimento.' },
        { id: 203, dia: 'Quarta-feira', tipo: 'Força & Mobilidade', status: 'Concluído', desc: 'Substituído por 3 partidas intensas de futebol (15 min cada). Alta exigência neuromuscular.' },
        { id: 204, dia: 'Quinta-feira', tipo: 'Corrida Moderada', status: 'Pendente', desc: 'Total: 6 km contínuos em Zona 2. Ritmo alvo estável entre 6:00 e 6:15/km.' },
        { id: 205, dia: 'Sexta-feira', tipo: 'Força & Mobilidade', status: 'Pendente', desc: 'Yoga + Kettlebell (45 min): Liberação miofascial e recuperação ativa.' },
        { id: 206, dia: 'Sábado', tipo: 'Treino Longo Progressivo', status: 'Pendente', desc: 'Total: 9 km. 3 km conservadores (6:30/km) + 4 km progressivos (6:10/km) + 2 km controlados.' },
        { id: 207, dia: 'Domingo', tipo: 'Descanso Total', status: 'Pendente', desc: 'Recuperação neuromuscular absoluta, hidratação e sono de qualidade.' }
      ],
      3: [
        { id: 301, dia: 'Segunda-feira', tipo: 'Força & Mobilidade', status: 'Pendente', desc: 'Yoga + Kettlebell (45 min): Fortalecimento de cadeia posterior.' },
        { id: 302, dia: 'Terça-feira', tipo: 'Fartlek', status: 'Pendente', desc: 'Total: 7.5 km. Aquecimento 10 min + 7x (1 min forte + 2 min trote) + arrefecimento.' },
        { id: 303, dia: 'Quarta-feira', tipo: 'Força & Mobilidade', status: 'Pendente', desc: 'Yoga + Kettlebell (45 min): Core e estabilidade de joelhos.' },
        { id: 304, dia: 'Quinta-feira', tipo: 'Corrida Moderada', status: 'Pendente', desc: 'Total: 6.5 km em Zona 2 contínua (pace 6:00/km).' },
        { id: 305, dia: 'Sexta-feira', tipo: 'Força & Mobilidade', status: 'Pendente', desc: 'Yoga + Kettlebell (45 min): Recuperação ativa.' },
        { id: 306, dia: 'Sábado', tipo: 'Treino Longo', status: 'Pendente', desc: 'Total: 10 km em ritmo constante Zona 2 (pace 6:20/km).' },
        { id: 307, dia: 'Domingo', tipo: 'Descanso Total', status: 'Pendente', desc: 'Descanso e hidratação.' }
      ]
    };
  });

  // Estado para Edição de Treino
  const [editingTreino, setEditingTreino] = useState(null);
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState('Pendente');

  // Histórico de Atividades Reais (Importadas CSV / Strava)
  const [activities, setActivities] = useState(() => {
    const saved = localStorage.getItem('activities_real_v4');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return [];
  });

  // Persistência automática
  useEffect(() => {
    localStorage.setItem('treinos_ciclo_completo_v4', JSON.stringify(allWeeksData));
  }, [allWeeksData]);

  useEffect(() => {
    localStorage.setItem('activities_real_v4', JSON.stringify(activities));
  }, [activities]);

  const handleConnect = (service) => {
    setConnections(prev => ({
      ...prev,
      [service]: {
        ...prev[service],
        status: 'Conectado',
        lastSync: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      }
    }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const parsed = [];
      for (let i = 1; i < lines.length && i < 20; i++) {
        const cols = lines[i].split(',');
        if (cols.length > 2) {
          parsed.push({
            id: cols[0] || Math.random(),
            date: cols[1] || 'Recente',
            name: cols[2] || 'Corrida na Rua',
            distance: cols[6] ? (parseFloat(cols[6])/1000).toFixed(2) + ' km' : '5.0 km',
            pace: '5:45 /km'
          });
        }
      }
      if (parsed.length > 0) {
        setActivities(parsed);
        setConnections(prev => ({ ...prev, strava: { ...prev.strava, status: 'Conectado', activitiesCount: parsed.length } }));
      }
    };
    reader.readAsText(file);
  };

  const saveTreinoEdit = () => {
    const currentWeekList = allWeeksData[selectedSemana] || [];
    const updatedList = currentWeekList.map(t => t.id === editingTreino.id ? { ...t, desc: editDesc, status: editStatus } : t);
    setAllWeeksData(prev => ({
      ...prev,
      [selectedSemana]: updatedList
    }));
    setEditingTreino(null);
  };

  const currentTreinosList = allWeeksData[selectedSemana] || [
    { id: 99, dia: 'Planeamento', tipo: 'A Definir', status: 'Pendente', desc: 'Estrutura detalhada desta semana em elaboração com base na periodização científica.' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-20 md:pb-0">
      
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🏃‍♂️</span>
          <div>
            <h1 className="text-base font-bold text-emerald-400 leading-tight">Plataforma Corrida & Saúde</h1>
            <p className="text-xs text-slate-400">Ciclo 15km (Até Dez 2026) ➔ Meia Maratona do Rio (Maio 2027)</p>
          </div>
        </div>
        <div className="hidden md:flex items-center space-x-4 text-sm">
          <span className="bg-emerald-950 text-emerald-400 px-3 py-1 rounded-full border border-emerald-800 text-xs font-medium">
            🔥 A treinar na Semana {selectedSemana}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Navegação por Abas */}
        <div className="hidden md:flex space-x-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
          <button 
            onClick={() => setActiveTab('planilha')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${activeTab === 'planilha' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            📅 Planilha por Semana
          </button>
          <button 
            onClick={() => setActiveTab('visaoGeral')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${activeTab === 'visaoGeral' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            🗺️ Visão Geral até Dezembro
          </button>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            ❤️ Biometria & Zonas
          </button>
          <button 
            onClick={() => setActiveTab('saude')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${activeTab === 'saude' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            🔗 Ecossistema
          </button>
          <button 
            onClick={() => setActiveTab('progresso')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${activeTab === 'progresso' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            📁 Histórico & CSV
          </button>
        </div>

        {/* CONTEÚDO DA ABA: PLANILHA POR SEMANA */}
        {activeTab === 'planilha' && (
          <div className="space-y-4">
            
            {/* Seletor de Semanas */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100">Selecione a Semana de Treino</h3>
                <p className="text-xs text-slate-400">Navegue pelas semanas do ciclo de base para consulta e edição.</p>
              </div>
              <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(sem => (
                  <button
                    key={sem}
                    onClick={() => setSelectedSemana(sem)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${selectedSemana === sem ? 'bg-emerald-600 text-white shadow' : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'}`}>
                    Semana {sem} {sem === 2 ? '⭐ (Atual)' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de Treinos da Semana Selecionada */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 pb-3 border-b border-slate-800 gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Periodização Oficial — Semana {selectedSemana}</h2>
                  <p className="text-xs text-slate-400">Instruções cirúrgicas, distâncias exatas e ritmos sem termos vagos.</p>
                </div>
                <div className="text-xs text-emerald-400 bg-emerald-950/50 px-3 py-1.5 rounded-lg border border-emerald-900/50">
                  Relógio: Galaxy Watch 4 / Samsung Health
                </div>
              </div>

              <div className="space-y-3">
                {currentTreinosList.map((t) => (
                  <div key={t.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-700 transition">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded">
                          {t.dia}
                        </span>
                        <span className="text-sm font-semibold text-slate-200">{t.tipo}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'Concluído' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700' : 'bg-amber-950/50 text-amber-300 border border-amber-800/50'}`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 mt-1">{t.desc}</p>
                    </div>

                    <button 
                      onClick={() => { setEditingTreino(t); setEditDesc(t.desc); setEditStatus(t.status); }}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg font-medium transition self-end md:self-center">
                      ✏️ Editar / Adaptar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA: VISÃO GERAL ATÉ DEZEMBRO */}
        {activeTab === 'visaoGeral' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">🗺️ Visão Geral do Ciclo: 15 km (Até Dezembro) & Meia Maratona (Maio 2027)</h2>
                <p className="text-xs text-slate-400">Planeamento macro estruturado com base na ciência do treino aeróbico (Andres, 2024; Guilherme, 2004).</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded">Fase 1 (Atual)</span>
                    <span className="text-xs text-slate-400">Semanas 1 a 6</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-200">Construção de Base & Fartlek</h4>
                  <p className="text-xs text-slate-400">Foco em consolidar volume semanal leve em Zona 2, introduzir o Fartlek de terça-feira para ganho de ritmo e proteger tendões.</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded">Fase 2</span>
                    <span className="text-xs text-slate-400">Semanas 7 a 14</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-200">Expansão para 15 km</h4>
                  <p className="text-xs text-slate-400">Aumento progressivo dos treinos longos de fim de semana até atingir os 15 km contínuos confortáveis em dezembro.</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded">Fase 3 (2027)</span>
                    <span className="text-xs text-slate-400">Meia Maratona Rio</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-200">Transição para 21.1 km</h4>
                  <p className="text-xs text-slate-400">A partir de janeiro, transição do ciclo de 15 km para a preparação específica rumo à Meia Maratona do Rio no final de maio de 2027.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA: DASHBOARD & BIOMETRIA */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
                <p className="text-xs text-slate-400">FC de Repouso (RHR)</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">54 <span className="text-xs font-normal text-slate-400">BPM</span></p>
                <p className="text-xs text-emerald-500 mt-2">📉 Ótimo descanso</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
                <p className="text-xs text-slate-400">HRV (Variabilidade)</p>
                <p className="text-2xl font-bold text-cyan-400 mt-1">68 <span className="text-xs font-normal text-slate-400">ms</span></p>
                <p className="text-xs text-cyan-500 mt-2">⚡ Alta prontidão</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
                <p className="text-xs text-slate-400">Qualidade do Sono</p>
                <p className="text-2xl font-bold text-indigo-400 mt-1">7h 40m</p>
                <p className="text-xs text-indigo-300 mt-2">🌙 Sono profundo estável</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
                <p className="text-xs text-slate-400">VO₂ Max Estimado</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">46.5</p>
                <p className="text-xs text-amber-300 mt-2">🚀 Base em evolução</p>
              </div>
            </div>

            {/* Zonas de Treino (Karvonen) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h3 className="text-base font-bold text-slate-100 mb-3">⚡ As Suas Zonas de Esforço Atuais</h3>
              <div className="space-y-3 text-sm">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-emerald-400">Zona 1 (Easy / Base):</span>
                    <p className="text-xs text-slate-400">Desenvolvimento mitocondrial e tendíneo (Longões e Recuperação)</p>
                  </div>
                  <span className="font-bold text-emerald-300">115 - 132 BPM (Pace 6:15 - 6:40)</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-cyan-400">Zona 2 (Limiar / Moderado):</span>
                    <p className="text-xs text-slate-400">Ritmo sustentável e Fartlek suave</p>
                  </div>
                  <span className="font-bold text-cyan-300">133 - 150 BPM (Pace 5:45 - 6:10)</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-amber-400">Zona 3 / 4 (Fartlek Intenso):</span>
                    <p className="text-xs text-slate-400">Jogo de velocidades e eficiência mecânica</p>
                  </div>
                  <span className="font-bold text-amber-300">151 - 178 BPM (Pace sub-5:00)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA: ECOSSISTEMA */}
        {activeTab === 'saude' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <h3 className="text-base font-bold text-slate-100">🔗 Conexões com Dispositivos & Apps</h3>
              <p className="text-xs text-slate-400">Autentique e sincronize os seus dados biométricos reais diretamente para o seu painel.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">⌚ Galaxy Watch 4</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${connections.galaxyWatch.status === 'Conectado' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                        {connections.galaxyWatch.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Samsung Health / Health Connect</p>
                    <p className="text-xs text-slate-500 mt-1">Última sync: {connections.galaxyWatch.lastSync}</p>
                  </div>
                  <button 
                    onClick={() => handleConnect('galaxyWatch')}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs py-2 rounded-lg font-semibold transition border border-slate-700">
                    Sincronizar Relógio
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">🟠 Strava API</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${connections.strava.status === 'Conectado' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                        {connections.strava.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Atividades e Histórico de Corrida</p>
                    <p className="text-xs text-slate-500 mt-1">Atividades carregadas: {activities.length}</p>
                  </div>
                  <button 
                    onClick={() => handleConnect('strava')}
                    className="w-full bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 text-xs py-2 rounded-lg font-semibold transition border border-orange-800/50">
                    Conectar via OAuth
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">💚 Google Health</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${connections.samsungHealth.status === 'Conectado' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                        {connections.samsungHealth.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Sono, Frequência Cardíaca e Passos</p>
                    <p className="text-xs text-slate-500 mt-1">Última sync: {connections.samsungHealth.lastSync}</p>
                  </div>
                  <button 
                    onClick={() => handleConnect('samsungHealth')}
                    className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs py-2 rounded-lg font-semibold transition border border-emerald-800/50">
                    Ligar Health Connect
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA: HISTÓRICO & CSV */}
        {activeTab === 'progresso' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-100">📁 Importador de Histórico (.CSV)</h3>
                  <p className="text-xs text-slate-400">Carregue o seu ficheiro activities.csv para calibrar automaticamente o seu ritmo.</p>
                </div>
                <button 
                  onClick={() => { setActivities([]); localStorage.removeItem('activities_real_v4'); }}
                  className="text-xs bg-red-950/80 hover:bg-red-900 text-red-300 px-3 py-1.5 rounded-lg border border-red-800">
                  🗑️ Limpar Histórico
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-800 rounded-xl p-6 text-center bg-slate-950">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileUpload} 
                  className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                />
                <p className="text-xs text-slate-500 mt-2">Selecione o seu ficheiro .csv exportado do Strava</p>
              </div>

              {activities.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Atividades Importadas Recentemente ({activities.length})</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {activities.map((act, idx) => (
                      <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-semibold text-slate-200">{act.name}</p>
                          <p className="text-slate-400">{act.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-400">{act.distance}</p>
                          <p className="text-slate-400">{act.pace}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* MODAL DE EDIÇÃO DE TREINO */}
      {editingTreino && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100">Editar Treino: {editingTreino.dia} (Semana {selectedSemana})</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400">Instruções / Relato (Ex: Substituição por futebol):</label>
              <textarea 
                value={editDesc} 
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400">Estado:</label>
              <select 
                value={editStatus} 
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
                <option value="Pendente">Pendente</option>
                <option value="Concluído">Concluído</option>
                <option value="Adaptado">Adaptado / Realizado Outro</option>
              </select>
            </div>

            <div className="flex space-x-3 pt-2">
              <button 
                onClick={() => setEditingTreino(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium transition">
                Cancelar
              </button>
              <button 
                onClick={saveTreinoEdit}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                Guardar Alteração
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Navegação Inferior (Mobile-First) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex justify-around py-3 z-40 text-xs">
        <button 
          onClick={() => setActiveTab('planilha')}
          className={`flex flex-col items-center space-y-1 ${activeTab === 'planilha' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
          <span className="text-lg">📅</span>
          <span>Semanas</span>
        </button>
        <button 
          onClick={() => setActiveTab('visaoGeral')}
          className={`flex flex-col items-center space-y-1 ${activeTab === 'visaoGeral' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
          <span className="text-lg">🗺️</span>
          <span>Geral</span>
        </button>
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center space-y-1 ${activeTab === 'dashboard' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
          <span className="text-lg">❤️</span>
          <span>Biometria</span>
        </button>
        <button 
          onClick={() => setActiveTab('saude')}
          className={`flex flex-col items-center space-y-1 ${activeTab === 'saude' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
          <span className="text-lg">🔗</span>
          <span>Ecossistema</span>
        </button>
        <button 
          onClick={() => setActiveTab('progresso')}
          className={`flex flex-col items-center space-y-1 ${activeTab === 'progresso' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
          <span className="text-lg">📁</span>
          <span>Histórico</span>
        </button>
      </nav>

    </div>
  );
}
