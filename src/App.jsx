import React, { useState, useEffect, useRef } from 'react';

// Chave da API do Gemini (injetada de forma segura em runtime)
const apiKey = "";

export default function App() {
  // --- ESTADOS DO SISTEMA ---
  const [activeTab, setActiveTab] = useState('plano'); 
  const [activities, setActivities] = useState([]); 
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [completedWorkouts, setCompletedWorkouts] = useState({});
  const [weight, setWeight] = useState(82.8); 
  const [vo2Max, setVo2Max] = useState(45.0); 
  const [toast, setToast] = useState(null);
  
  // --- DADOS BIOMÉTRICOS DINÂMICOS DO GALAXY WATCH 4 ---
  const [restingHR, setRestingHR] = useState(65); 
  const [maxHR, setMaxHR] = useState(179); 
  const [watchSyncing, setWatchSyncing] = useState(false);

  // --- ESTADOS ADAPTADOS POR IA ---
  const [adaptedWeeklyPlans, setAdaptedWeeklyPlans] = useState({});
  const [adaptationReason, setAdaptationReason] = useState('');
  
  // --- ESTADOS DE NUTRIÇÃO ---
  const [currentMealDescription, setCurrentMealDescription] = useState('');
  const [mealAnalysisResult, setMealAnalysisResult] = useState(null);
  const [dailyMenuResult, setDailyMenuResult] = useState(null);
  const [nutritionPaceGoal, setNutritionPaceGoal] = useState('deficit_energia'); 
  const [dailyCalories, setDailyCalories] = useState(2100);

  const [selectedGlossaryTerm, setSelectedGlossaryTerm] = useState(null);

  // --- INJEÇÃO DINÂMICA DE TAILWIND E KATEX ---
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
    if (!document.getElementById('katex-css')) {
      const link = document.createElement('link');
      link.id = 'katex-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
      document.head.appendChild(link);
    }
  }, []);

  // --- RESTAURAR HISTÓRICO ---
  useEffect(() => {
    const savedWorkouts = localStorage.getItem('rfc_completed_workouts');
    const savedActivities = localStorage.getItem('rfc_activities');
    const savedRestHR = localStorage.getItem('rfc_resting_hr');

    if (savedWorkouts) setCompletedWorkouts(JSON.parse(savedWorkouts));
    if (savedRestHR) setRestingHR(parseInt(savedRestHR));
    if (savedActivities) {
      const parsed = JSON.parse(savedActivities);
      setActivities(parsed);
      if(parsed.length > 0) setVo2Max(Math.max(...parsed.map(a => a.vo2 || 45)));
    }
  }, []);

  // --- CÁLCULO DE CALORIAS BASEADO NO PERFIL ---
  useEffect(() => {
    const basal = weight * 22; 
    const activeTotal = basal * 1.35; 
    let target = nutritionPaceGoal === 'deficit_energia' ? activeTotal - 400 : activeTotal;
    setDailyCalories(Math.round(target > 1600 ? target : 1700));
  }, [weight, nutritionPaceGoal]);

  const showToast = (message) => {
    setToast({ message });
    setTimeout(() => setToast(null), 4000);
  };

  // --- SIMULADOR DE SINCRO DA SAMSUNG API (WEAR OS / HEALTH CONNECT) ---
  const handleSamsungWatchSync = () => {
    setWatchSyncing(true);
    setTimeout(() => {
      // Coleta dados reais simulados capturados pelo sensor BioActive do Watch 4
      const detectedRestingHR = 62; 
      setRestingHR(detectedRestingHR);
      localStorage.setItem('rfc_resting_hr', detectedRestingHR.toString());
      
      // Se houver uma atividade no arquivo, vincula ao painel
      setWatchSyncing(false);
      showToast("Galaxy Watch 4 Sincronizado! Batimento de repouso atualizado para 62 BPM. Zonas calibradas. ⌚");
    }, 1800);
  };

  // --- CÁLCULO DE MARCOS CARDÍACOS POR KARVONEN ---
  const fcrv = maxHR - restingHR;
  const estimatedZones = {
    Z1: { nome: "Recuperação Ativa", min: Math.round(restingHR + fcrv * 0.50), max: Math.round(restingHR + fcrv * 0.60), sensacao: "Muito leve. Ótimo para regenerar após o fortalecimento com Kettlebell." },
    Z2: { nome: "Zona Aeróbia Base", min: Math.round(restingHR + fcrv * 0.60), max: Math.round(restingHR + fcrv * 0.70), sensacao: "Ritmo de conversa fluida. Confortável, ideal para emagrecimento ativo." },
    Z3: { nome: "Zona de Ritmo (Tempo)", min: Math.round(restingHR + fcrv * 0.70), max: Math.round(restingHR + fcrv * 0.80), sensacao: "Moderadamente forte. Ritmo ideal para os blocos firmes do Fartlek." },
    Z4: { nome: "Limiar Anaeróbio", min: Math.round(restingHR + fcrv * 0.80), max: Math.round(restingHR + fcrv * 0.90), sensacao: "Esforço exaustivo. Respiração muito pesada." }
  };

  const glossary = {
    "Z1 (Zona 1)": "Esforço muito leve. Ajuda a remover metabólitos pós-treino intenso.",
    "Z2 (Zona 2)": "A zona mágica da resistência. Ensina o corpo a queimar gordura como combustível primário.",
    "Z3 (Zona 3)": "Intensidade moderada. Melhora a capacidade de sustentar ritmos mais rápidos.",
    "Fartlek": "Jogo de corrida variando entre rápido e devagar sem parar.",
    "Health Connect": "Sistema do Android que unifica os dados do Samsung Health e joga no Run For Cover.",
    "Sensor BioActive": "O sensor óptico do seu Galaxy Watch 4 que mede batimentos e bioimpedância."
  };

  const calculateVO2Max = (distance, durationMinutes) => {
    const speedMps = (distance * 1000) / (durationMinutes * 60);
    return parseFloat(((speedMps * 0.2) + 3.5).toFixed(1));
  };

  const handleManualActivityRegister = (type, distance, duration) => {
    if (!distance || !duration) return;
    const calculatedVo2 = calculateVO2Max(distance, duration);
    const newAct = { id: Date.now(), date: new Date().toISOString().split('T')[0], distance: parseFloat(distance), duration: parseInt(duration), type: type, vo2: calculatedVo2 };
    const updated = [newAct, ...activities];
    setActivities(updated);
    localStorage.setItem('rfc_activities', JSON.stringify(updated));
    setVo2Max(calculatedVo2);
    showToast(`Corrida salva! Seu VO2 Max estimado subiu para ${calculatedVo2}.`);
  };

  const trainingPlan = {};
  for (let w = 1; w <= 16; w++) {
    const longDistance = 6 + w;
    trainingPlan[w] = {
      treinos: [
        { dia: "Segunda", tipo: "Kettlebell + Yoga", desc: "Força e Core: 3x12 Swings explosivos + alongamentos dinâmicos.", zona: "Força" },
        { dia: "Terça", tipo: "Corrida: Fartlek Dinâmico", desc: "Jogo de Ritmos: 10 min leve + 5x (1 min forte / 1 min leve).", zona: "Z3/Z4" },
        { dia: "Quarta", tipo: "Kettlebell + Yoga", desc: "Core e postura: Fortalecimento de glúteo médio e estabilidade.", zona: "Força" },
        { dia: "Quinta", tipo: "Corrida: Aeróbia Base", desc: "Volume Confortável: 45 min em ritmo estável de conversa em Zona 2.", zona: "Z2" },
        { dia: "Sexta", tipo: "Kettlebell + Yoga", desc: "Prevenção de lesões: Isometria e abertura de quadril.", zona: "Mobilidade" },
        { dia: "Sábado", tipo: "Corrida: Treino Longo", desc: `Rodagem de Resistência: ${longDistance} km contínuos focados em fôlego controlado.`, zona: "Z2" }
      ]
    };
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row font-sans overflow-x-hidden antialiased">
      
      {/* SIDEBAR */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-950 border-r border-slate-800 p-6 space-y-8 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 text-slate-950 px-3.5 py-2 rounded-2xl font-black text-xl">RFC</div>
          <div>
            <h1 className="text-base font-extrabold text-white leading-none">Run For Cover</h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-black">Galaxy Watch Edition</p>
          </div>
        </div>

        {/* METRICAS DO RELÓGIO */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 shadow-inner text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Peso Cadastrado</span>
            <strong className="text-white">{weight} kg</strong>
          </div>
          <div className="h-[1px] bg-slate-800"></div>
          <div className="flex justify-between">
            <span className="text-slate-400">Batimento Repouso</span>
            <strong className="text-emerald-400">{restingHR} BPM</strong>
          </div>
          <div className="h-[1px] bg-slate-800"></div>
          <button 
            onClick={handleSamsungWatchSync}
            disabled={watchSyncing}
            className="w-full bg-slate-950 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5"
          >
            {watchSyncing ? 'Sincronizando...' : '🔄 Sincronizar Galaxy Watch'}
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          <button onClick={() => setActiveTab('plano')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'plano' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:bg-slate-900/50'}`}>
            <span>📋</span> Planilha de Treinos
          </button>
          <button onClick={() => setActiveTab('progresso')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'progresso' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:bg-slate-900/50'}`}>
            <span>📈</span> Registrar Sessão
          </button>
        </nav>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900 overflow-y-auto">
        
        {toast && (
          <div className="fixed top-6 right-4 left-4 md:left-auto md:w-96 z-50 bg-slate-950 border border-emerald-500 rounded-2xl p-4 shadow-2xl text-xs font-semibold text-slate-200">
            {toast.message}
          </div>
        )}

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-6 pb-24 space-y-8">
          
          {/* PAINEL DE MARCOS CALIBRADOS DO WATCH 4 */}
          <section className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-white">⌚ Zonas de Batimento Ativas (Fórmula de Karvonen)</h3>
                <p className="text-xs text-slate-400 mt-1">Calibradas dinamicamente usando os batimentos de repouso coletados pelo seu sensor óptico.</p>
              </div>
              <button onClick={handleSamsungWatchSync} className="md:hidden bg-emerald-500 text-slate-950 text-xs font-black px-3 py-1.5 rounded-xl">Sync Relógio</button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(estimatedZones).map(([key, zone]) => (
                <div key={key} className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-emerald-400 font-mono">{key}</span>
                    <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-bold">{zone.min}-{zone.max} BPM</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">{zone.nome}</h4>
                  <p className="text-[11px] text-slate-400 leading-tight">{zone.sensacao}</p>
                </div>
              ))}
            </div>
          </section>

          {/* TAB 1: PLANILHA DE TREINOS */}
          {activeTab === 'plano' && (
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-950/60 p-5 rounded-3xl border border-slate-800">
                <div>
                  <h2 className="text-base font-extrabold text-white">Sua Planilha de Evolução</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Use o teste da fala para fixar o ritmo de Zona 2 nas rodagens.</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl flex items-center gap-1 overflow-x-auto">
                  {Array.from({ length: 16 }, (_, i) => i + 1).map((w) => (
                    <button key={w} onClick={() => setSelectedWeek(w)} className={`w-8 h-8 rounded-xl text-xs font-black ${selectedWeek === w ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}>
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trainingPlan[selectedWeek]?.treinos.map((workout, idx) => {
                  const isDone = completedWorkouts[`${selectedWeek}-${idx}`];
                  return (
                    <div key={idx} className="p-5 rounded-3xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-[10px] font-black text-slate-400">{workout.dia}</span>
                          <span className="text-[10px] text-slate-500 font-mono font-bold">{workout.zona}</span>
                        </div>
                        <h4 className="font-black text-sm text-white">{workout.tipo}</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{workout.desc}</p>
                      </div>
                      <div className="flex justify-end pt-2 border-t border-slate-900">
                        <button onClick={() => toggleWorkout(selectedWeek, idx)} className={`w-8 h-8 rounded-xl border ${isDone ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'border-slate-800 bg-slate-900'}`}>
                          {isDone ? '✓' : 'OK'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PROGRESSED LOGS */}
          {activeTab === 'progresso' && (
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-white">Registrar Nova Corrida Real do Relógio</h3>
                <p className="text-xs text-slate-400">Insira a quilometragem marcada na tela do seu Samsung Galaxy Watch no final da atividade.</p>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const form = e.target;
                handleManualActivityRegister(form.type.value, form.distance.value, form.duration.value);
                form.reset();
              }} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Tipo de Treino</label>
                  <select name="type" className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 w-full text-xs text-white">
                    <option value="Corrida Base (Z2)">Corrida Base (Z2)</option>
                    <option value="Fartlek Dinâmico">Fartlek Dinâmico</option>
                    <option value="Treino Longo">Treino Longo</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Distância (km)</label>
                  <input type="number" step="0.01" name="distance" placeholder="Ex: 6.02" className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 w-full text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Duração (minutos)</label>
                  <input type="number" name="duration" placeholder="Ex: 33" className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 w-full text-xs text-white" />
                </div>
                <button type="submit" className="bg-emerald-500 text-slate-950 font-black p-2.5 rounded-xl text-xs uppercase w-full">Salvar Treino</button>
              </form>

              {/* GRÁFICO HISTÓRICO MINIMALISTA */}
              <div className="pt-4 border-t border-slate-900 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-400">Histórico de Carga Real ({activities.length} treinos)</h4>
                {activities.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Sua base está limpa! Suba uma atividade para ativar o gráfico.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex h-16 items-end gap-2 bg-slate-900 p-3 rounded-2xl border border-slate-800">
                      {activities.slice(0, 7).reverse().map((a, i) => (
                        <div 
                          key={i} 
                          className="bg-emerald-500 w-full rounded-t" 
                          style={{ height: `${Math.min(100, (a.distance / 15) * 100)}%` }}
                          title={`${a.distance} km`}
                        />
                      ))}
                    </div>
                    <div className="space-y-2">
                      {activities.map(a => (
                        <div key={a.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-850 flex justify-between text-xs font-mono">
                          <span>🏃 {a.date} - {a.type}</span>
                          <span className="text-emerald-400 font-bold">{a.distance} km em {a.duration} min</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GLOSSÁRIO DIDÁTICO */}
          <section className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">📖 Dicionário de Termos Esportivos</h3>
            <div className="flex flex-wrap gap-2">
              {Object.keys(glossary).map(term => (
                <button key={term} onClick={() => setSelectedGlossaryTerm(term === selectedGlossaryTerm ? null : term)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${selectedGlossaryTerm === term ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-300'}`}>
                  {term}
                </button>
              ))}
            </div>
            {selectedGlossaryTerm && (
              <div className="p-4 bg-slate-900/60 border border-emerald-500/20 rounded-2xl animate-fade-in">
                <p className="text-xs text-slate-200 leading-relaxed">{glossary[selectedGlossaryTerm]}</p>
              </div>
            )}
          </section>

        </main>
      </div>
    </div>
  );
}
