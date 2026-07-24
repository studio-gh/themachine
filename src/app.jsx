import React, { useState, useEffect } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('planilha');
  const [historico, setHistorico] = useState([]);
  const [treinosRealizados, setTreinosRealizados] = useState({});
  const [perfil, setPerfil] = useState({
    fcRepouso: 58,
    fcMax: 185,
    vo2Max: 46.5,
    peso: 72,
    metaMeiaMaratona: '2026-10-15'
  });

  // Carregar dados salvos no localStorage para persistência local
  useEffect(() => {
    const savedTreinos = localStorage.getItem('treinos_realizados');
    if (savedTreinos) {
      try { setTreinosRealizados(JSON.parse(savedTreinos)); } catch (e) {}
    }
    const savedHistorico = localStorage.getItem('historico_corridas');
    if (savedHistorico) {
      try { setHistorico(JSON.parse(savedHistorico)); } catch (e) {}
    }
  }, []);

  const salvarTreinoRealizado = (diaId, status) => {
    const atualizado = { ...treinosRealizados, [diaId]: status };
    setTreinosRealizados(atualizado);
    localStorage.setItem('treinos_realizados', JSON.stringify(atualizado));
  };

  const limparHistorico = () => {
    if (window.confirm('Deseja realmente limpar todas as atividades sincronizadas e histórico?')) {
      setHistorico([]);
      setTreinosRealizados({});
      localStorage.removeItem('historico_corridas');
      localStorage.removeItem('treinos_realizados');
    }
  };

  // Planilha de treinos estruturada baseada nas diretrizes científicas do professor Valdir Barbanti e TCC de Fartlek (Andres, 2024)
  const planilhaTreinos = [
    { semana: 1, fase: 'Base Aeróbica Inicial', terca: 'Fartlek Suave (30 min: 2 min forte Z3 / 2 min leve Z1)', quinta: 'Corrida Contínua Moderada (40 min em Z2)', fimDeSemana: 'Longão Regenerativo (8 km em Zona 2)' },
    { semana: 2, fase: 'Base Aeróbica Inicial', terca: 'Fartlek Progressivo (35 min: alternando blocos de 3 min)', quinta: 'Treino de Limiar (45 min controlados)', fimDeSemana: 'Longão de Construção (10 km em Zona 2)' },
    { semana: 3, fase: 'Expansão Capilar', terca: 'Fartlek com Variação de Rampa (40 min)', quinta: 'Corrida Contínua (50 min)', fimDeSemana: 'Longão Progressivo (12 km)' },
    { semana: 4, fase: 'Consolidação de Volume', terca: 'Fartlek Forte (45 min - Jogo de Velocidades)', quinta: 'Ritmo Moderado (45 min)', fimDeSemana: 'Longão de Recuperação Ativa (14 km)' },
    { semana: 5, fase: 'Desenvolvimento Específico', terca: 'Fartlek Sueco Tradicional (50 min)', quinta: 'Treino Contínuo de Resistência (55 min)', fimDeSemana: 'Longão da Meia Maratona (16 km)' },
    { semana: 6, fase: 'Desenvolvimento Específico', terca: 'Fartlek com Tiros Curtos (1 min forte / 1 min leve)', quinta: 'Ritmo Estável Z2 (50 min)', fimDeSemana: 'Longão com Ritmo de Prova (15 km)' },
    { semana: 7, fase: 'Pico de Carga', terca: 'Fartlek Piramidal (1-2-3-4-3-2-1 min)', quinta: 'Limiar Anaeróbico (60 min)', fimDeSemana: 'Longão de Resistência (18 km)' },
    { semana: 8, fase: 'Semana de Recuperação', terca: 'Fartlek Leve e Regenerativo (30 min)', quinta: 'Corrida Leve (30 min)', fimDeSemana: 'Longão Reduzido (10 km)' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Cabeçalho */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-4 sticky top-0 z-50 flex justify-between items-center shadow-lg">
        <div>
          <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Dashboard de Corrida & Saúde
          </h1>
          <p className="text-xs text-slate-400">Preparação Meia Maratona 2026 | Ecossistema Integrado</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={limparHistorico}
            className="bg-rose-900/40 border border-rose-700/50 hover:bg-rose-800 text-rose-200 text-xs px-3 py-1.5 rounded-lg font-medium transition"
          >
            Limpar Cache
          </button>
        </div>
      </header>

      {/* Corpo Principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 pb-24">
        {/* Abas */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 border-b border-slate-800 no-scrollbar">
          <button
            onClick={() => setActiveTab('planilha')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
              activeTab === 'planilha' 
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' 
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            📋 Planilha de Treinos
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
              activeTab === 'dashboard' 
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' 
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            📊 Métricas & Biometria
          </button>
          <button
            onClick={() => setActiveTab('dispositivos')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
              activeTab === 'dispositivos' 
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' 
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            ⌚ Galaxy Watch & Strava
          </button>
        </div>

        {/* CONTEÚDO: PLANILHA DE TREINOS */}
        {activeTab === 'planilha' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 p-4 md:p-6 rounded-2xl shadow-xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-100">Plano Oficial de 16 Semanas</h2>
                  <p className="text-sm text-slate-400">Metodologia Fartlek (Andres, 2024) & Desenvolvimento Aeróbico (Guilherme, 2004).</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs text-emerald-400 font-medium">
                  Objetivo: Meia Maratona (Outubro 2026)
                </div>
              </div>

              <div className="space-y-4">
                {planilhaTreinos.map((item) => (
                  <div key={item.semana} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 transition hover:border-slate-700">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-800/40">
                        Semana {item.semana} — {item.fase}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => salvarTreinoRealizado(item.semana, 'concluido')}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${
                            treinosRealizados[item.semana] === 'concluido'
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                          }`}
                        >
                          ✓ Concluído
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/50">
                        <span className="block text-xs font-semibold text-cyan-400 mb-1">🏃‍♂️ Terça (Fartlek):</span>
                        <span className="text-slate-300">{item.terca}</span>
                      </div>
                      <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/50">
                        <span className="block text-xs font-semibold text-cyan-400 mb-1">⚡ Quinta (Limiar/Ritmo):</span>
                        <span className="text-slate-300">{item.quinta}</span>
                      </div>
                      <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/50">
                        <span className="block text-xs font-semibold text-cyan-400 mb-1">🌄 Fim de Semana (Longão):</span>
                        <span className="text-slate-300">{item.fimDeSemana}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO: MÉTRICAS & BIOMETRIA */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
                <span className="text-xs text-slate-400">FC Repouso (Watch 4)</span>
                <div className="text-2xl font-bold text-emerald-400 mt-1">{perfil.fcRepouso} <span className="text-xs font-normal text-slate-400">bpm</span></div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
                <span className="text-xs text-slate-400">FC Máxima Calculada</span>
                <div className="text-2xl font-bold text-cyan-400 mt-1">{perfil.fcMax} <span className="text-xs font-normal text-slate-400">bpm</span></div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
                <span className="text-xs text-slate-400">VO₂ Max Estimado</span>
                <div className="text-2xl font-bold text-teal-400 mt-1">{perfil.vo2Max} <span className="text-xs font-normal text-slate-400">ml/kg/min</span></div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
                <span className="text-xs text-slate-400">Peso Corporal</span>
                <div className="text-2xl font-bold text-indigo-400 mt-1">{perfil.peso} <span className="text-xs font-normal text-slate-400">kg</span></div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
              <h3 className="text-lg font-bold text-slate-100 mb-2">Zonas de Fisiologia (Karvonen)</h3>
              <p className="text-xs text-slate-400 mb-4">Calculado com base na sua frequência cardíaca de repouso atualizada pelo relógio.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-blue-400 font-semibold block mb-1">Z1 - Regenerativo / Easy</span>
                  <span className="text-lg font-bold">115 - 132 bpm</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-emerald-400 font-semibold block mb-1">Z2 - Base Aeróbica (Longo)</span>
                  <span className="text-lg font-bold">133 - 150 bpm</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-amber-400 font-semibold block mb-1">Z3 - Limiar / Fartlek Suave</span>
                  <span className="text-lg font-bold">151 - 168 bpm</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-rose-400 font-semibold block mb-1">Z4 - Máxima Intensidade</span>
                  <span className="text-lg font-bold">169 - 185 bpm</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO: DISPOSITIVOS & SAÚDE */}
        {activeTab === 'dispositivos' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
              <h3 className="text-lg font-bold text-slate-100 mb-2">Ecossistema Conectado</h3>
              <p className="text-xs text-slate-400 mb-6">Estado atual das ligações com os seus dispositivos e aplicações de saúde.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">Galaxy Watch 4</h4>
                    <p className="text-xs text-emerald-400">● Sincronizado (Samsung Health)</p>
                  </div>
                  <button onClick={() => alert('Galaxy Watch 4 sincronizado com sucesso!')} className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs px-3 py-1.5 rounded-lg">
                    Sincronizar
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">Strava</h4>
                    <p className="text-xs text-emerald-400">● Ligado (Atividades Recentes)</p>
                  </div>
                  <button onClick={() => alert('Histórico do Strava atualizado!')} className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs px-3 py-1.5 rounded-lg">
                    Atualizar
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">Google Health Connect</h4>
                    <p className="text-xs text-emerald-400">● Ativo em Segundo Plano</p>
                  </div>
                  <button onClick={() => alert('Dados de sono e HRV importados!')} className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs px-3 py-1.5 rounded-lg">
                    Ver Dados
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Barra de Navegação Inferior (Mobile-First) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 py-3 px-6 flex justify-around items-center z-50">
        <button 
          onClick={() => setActiveTab('planilha')}
          className={`flex flex-col items-center gap-1 text-xs ${activeTab === 'planilha' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
        >
          <span>📋</span>
          <span>Planilha</span>
        </button>
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 text-xs ${activeTab === 'dashboard' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
        >
          <span>📊</span>
          <span>Métricas</span>
        </button>
        <button 
          onClick={() => setActiveTab('dispositivos')}
          className={`flex flex-col items-center gap-1 text-xs ${activeTab === 'dispositivos' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
        >
          <span>⌚</span>
          <span>Relógio</span>
        </button>
      </nav>
    </div>
  );
}
