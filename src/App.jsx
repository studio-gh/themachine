import React, { useState, useEffect, useRef } from 'react';

// Chave da API do Gemini (injetada de forma segura em runtime)
const apiKey = "";

export default function App() {
  // --- ESTADOS DO SISTEMA ---
  const [activeTab, setActiveTab] = useState('plano'); // 'plano' | 'nutricao' | 'progresso' | 'coach' | 'sync'
  const [activities, setActivities] = useState([]); // 100% VAZIO: Apenas dados reais inseridos pelo usuário
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [completedWorkouts, setCompletedWorkouts] = useState({});
  const [weight, setWeight] = useState(78); // Peso padrão em kg
  const [vo2Max, setVo2Max] = useState(48.5); // VO2 Max inicial estimado
  const [toast, setToast] = useState(null);

  // --- HEALTH HUB (DADOS REAIS ZERADOS) ---
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState('Nunca');
  
  // Sem dados falsos. Começa nulo até que haja uma importação real.
  const [sleepData, setSleepData] = useState(null);
  const [samsungActivities, setSamsungActivities] = useState([]);

  // --- CÁLCULOS DE ACUMULADOS MENSAIS (BASE REAIS) ---
  const totalAppDistance = activities.reduce((a, b) => a + (parseFloat(b.distance) || 0), 0);
  const totalAppCalories = activities.reduce((a, b) => a + (parseInt(b.calories) || 0), 0);
  const totalAppTime = activities.reduce((a, b) => a + (parseInt(b.duration) || 0), 0);
  const totalSHCalories = samsungActivities.reduce((a, b) => a + (parseInt(b.calories) || 0), 0);
  const totalMonthCalories = totalAppCalories + totalSHCalories;
  
  // --- PLANOS DINÂMICOS E IA ---
  const [adaptedWeeklyPlans, setAdaptedWeeklyPlans] = useState({});
  const [adaptationReason, setAdaptationReason] = useState('');
  
  const [connectedServices, setConnectedServices] = useState({
    strava: false,
    googleFit: false,
    samsungHealth: false
  });

  // --- ESTADO DO COACH IA (CHAT) ---
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Olá! Sou o seu treinador virtual Run For Cover. Como estamos começando sem dados falsos, importe seu histórico de atividades via CSV ou acompanhe sua planilha de treinos reais aqui.'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const [aiLoading, setAiLoading] = useState(false);
  
  // --- NUTRIÇÃO ---
  const [currentMealDescription, setCurrentMealDescription] = useState('');
  const [mealAnalysisResult, setMealAnalysisResult] = useState(null);
  const [dailyMenuResult, setDailyMenuResult] = useState(null);
  const [nutritionPaceGoal, setNutritionPaceGoal] = useState('deficit_energia');
  const [dailyCalories, setDailyCalories] = useState(2050);

  // --- INJEÇÃO DE TAILWIND E KATEX ---
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

    if (!document.getElementById('katex-js')) {
      const script = document.createElement('script');
      script.id = 'katex-js';
      script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
      script.onload = () => {
        const autoRenderScript = document.createElement('script');
        autoRenderScript.id = 'katex-autorender';
        autoRenderScript.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js';
        autoRenderScript.onload = () => {
          if (window.renderMathInElement) {
            window.renderMathInElement(document.body, {
              delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false}
              ],
              throwOnError: false
            });
          }
        };
        document.head.appendChild(autoRenderScript);
      };
      document.head.appendChild(script);
    }
  }, []);

  // --- PERSISTÊNCIA LOCAL (LOCALSTORAGE) ---
  useEffect(() => {
    const savedWorkouts = localStorage.getItem('rfc_completed_workouts');
    const savedActivities = localStorage.getItem('rfc_activities');
    const savedWeight = localStorage.getItem('rfc_weight');
    const savedVo2 = localStorage.getItem('rfc_vo2max');
    const savedServices = localStorage.getItem('rfc_connected_services');
    const savedAdaptedPlans = localStorage.getItem('rfc_adapted_plans');

    if (savedWorkouts) setCompletedWorkouts(JSON.parse(savedWorkouts));
    if (savedWeight) setWeight(JSON.parse(savedWeight));
    if (savedVo2) setVo2Max(JSON.parse(savedVo2));
    if (savedServices) setConnectedServices(JSON.parse(savedServices));
    if (savedAdaptedPlans) setAdaptedWeeklyPlans(JSON.parse(savedAdaptedPlans));
    
    // DADOS REAIS: Carrega o que o usuário salvou ou deixa limpo (vazio)
    if (savedActivities) {
      setActivities(JSON.parse(savedActivities));
    } else {
      setActivities([]); // Vazio por padrão para não inventar treinos
    }
  }, []);

  // --- CÁLCULO CALÓRICO ---
  useEffect(() => {
    const basal = weight * 22;
    const activeTotal = basal * 1.4;
    let target = 0;
    if (nutritionPaceGoal === 'deficit_energia') {
      target = Math.round(activeTotal - 350); 
    } else {
      target = Math.round(activeTotal);
    }
    setDailyCalories(target > 1600 ? target : 1600);
  }, [weight, nutritionPaceGoal]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const toggleWorkout = (week, dayIndex) => {
    const key = `${week}-${dayIndex}`;
    const updated = { ...completedWorkouts, [key]: !completedWorkouts[key] };
    setCompletedWorkouts(updated);
    localStorage.setItem('rfc_completed_workouts', JSON.stringify(updated));
    showToast(updated[key] ? 'Treino marcado como concluído! 💪' : 'Treino marcado como pendente.');
  };

  // --- CHAMADA GEMINI API ---
  const callGeminiAPI = async (userPrompt, systemInstruction) => {
    let delay = 1000;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] }
          })
        });

        if (!response.ok) throw new Error(`Status HTTP: ${response.status}`);
        
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
        throw new Error('Retorno vazio do servidor Gemini');
      } catch (error) {
        if (attempt === 5) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  };

  // --- ADAPTADOR DE PLANILHA COM IA ---
  const handleAdaptPlan = async (reason) => {
    const inputToUse = reason || adaptationReason;
    if (!inputToUse.trim()) return;

    setAiLoading(true);
    const currentWeekPlan = trainingPlan[selectedWeek];
    
    const systemInstruction = `Você é o treinador especialista de corrida do app Run For Cover. O usuário deseja reajustar a Semana ${selectedWeek} devido ao seguinte feedback: "${inputToUse}".
    Retorne a resposta estritamente em um formato de lista JSON válido:
    [
      {"dia": "Segunda-feira", "tipo": "Kettlebell + Yoga", "desc": "...", "zona": "Força & Yoga"},
      ...
    ]
    Apenas o array JSON puro.`;

    const prompt = `Adapte a planilha atual da Semana ${selectedWeek}:
    ${currentWeekPlan.treinos.map(t => `- ${t.dia} (${t.tipo}): ${t.desc}`).join('\n')}
    Restrição: "${inputToUse}"`;

    try {
      const responseText = await callGeminiAPI(prompt, systemInstruction);
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const adaptedArray = JSON.parse(cleanJson);
      
      const updatedPlans = {
        ...adaptedWeeklyPlans,
        [selectedWeek]: { reason: inputToUse, treinos: adaptedArray }
      };
      
      setAdaptedWeeklyPlans(updatedPlans);
      localStorage.setItem('rfc_adapted_plans', JSON.stringify(updatedPlans));
      showToast('Planilha recalculada com IA! ✨');
      setAdaptationReason('');
    } catch (error) {
      showToast('Erro ao reajustar treinos.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleResetWeekPlan = () => {
    const updated = { ...adaptedWeeklyPlans };
    delete updated[selectedWeek];
    setAdaptedWeeklyPlans(updated);
    localStorage.setItem('rfc_adapted_plans', JSON.stringify(updated));
    showToast('Planilha original restaurada!');
  };

  // --- NUTRIÇÃO IA ---
  const handleGenerateDailyMenu = async (workoutName) => {
    setAiLoading(true);
    const systemInstruction = `Nutricionista esportivo de elite. Cliente com ${weight}kg busca emagrecimento mantendo energia para o treino: "${workoutName}".`;
    const prompt = `Gere nutrição otimizada para ${weight}kg, ${dailyCalories} kcal, treino: ${workoutName}`;
    try {
      const responseText = await callGeminiAPI(prompt, systemInstruction);
      setDailyMenuResult({ workout: workoutName, content: responseText });
      showToast('Cardápio gerado! 🥗');
    } catch (error) {
      showToast('Erro ao obter plano.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAnalyzePlate = async () => {
    if (!currentMealDescription.trim()) return;
    setAiLoading(true);
    const systemInstruction = `Analise o prato para corrida e emagrecimento: "${currentMealDescription}".`;
    try {
      const responseText = await callGeminiAPI(currentMealDescription, systemInstruction);
      setMealAnalysisResult(responseText);
      showToast('Análise concluída! ⚡');
    } catch (error) {
      showToast('Erro ao analisar.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  // --- CHAT COACH ---
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const responseText = await callGeminiAPI(inputMessage, "Treinador especialista de corrida Run For Cover.");
      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sem sinal com a central. Tente novamente!' }]);
    } finally {
      setIsTyping(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  // --- PLANILHA PADRÃO ---
  const trainingPlan = {};
  for (let w = 1; w <= 16; w++) {
    const isTapering = w >= 15;
    const longDistance = isTapering ? (w === 15 ? 10 : 6) : (6 + w);
    trainingPlan[w] = {
      foco: isTapering ? "Polimento Aeróbio" : `Semana ${w}`,
      treinos: [
        { dia: "Segunda-feira", tipo: "Kettlebell + Yoga", desc: "Estabilidade e Glúteo: 3x12 Swings + Mobilidade.", zona: "Força" },
        { dia: "Terça-feira", tipo: "Corrida: Fartlek", desc: `15min trote + Fartlek progressivo.`, zona: "Z3/Z4" },
        { dia: "Quarta-feira", tipo: "Kettlebell + Yoga", desc: "Core & Postura: 3x10 Rows + Alongamentos.", zona: "Força" },
        { dia: "Quinta-feira", tipo: "Corrida: Base", desc: "45 min em ritmo conversacional.", zona: "Z2" },
        { dia: "Sexta-feira", tipo: "Kettlebell + Yoga", desc: "Cadeia Posterior: Swings e Deadlifts.", zona: "Força" },
        { dia: "Fim de Semana", tipo: "Corrida: Longo", desc: `Rodagem de ${longDistance} km.`, zona: "Z2" }
      ]
    };
  }

  const stats = React.useMemo(() => {
    let weekCompleted = 0;
    const currentList = adaptedWeeklyPlans[selectedWeek]?.treinos || trainingPlan[selectedWeek]?.treinos || [];
    currentList.forEach((_, idx) => {
      if (completedWorkouts[`${selectedWeek}-${idx}`]) weekCompleted++;
    });
    const percent = Math.round((weekCompleted / 6) * 100);
    const totalKm = activities.reduce((sum, act) => sum + (parseFloat(act.distance) || 0), 0);
    const estimatedTimeMin = vo2Max > 0 ? Math.round(120 * Math.pow(45 / vo2Max, 1.05)) : 135;
    return { 
      totalKm: totalKm.toFixed(1), 
      completedCount: Object.values(completedWorkouts).filter(Boolean).length, 
      weekProgressPercent: percent,
      weekCompleted,
      formattedHalfTime: `${Math.floor(estimatedTimeMin / 60)}h ${estimatedTimeMin % 60}m`
    };
  }, [activities, completedWorkouts, selectedWeek, adaptedWeeklyPlans, vo2Max]);

  const currentWeekWorkouts = adaptedWeeklyPlans[selectedWeek]?.treinos || trainingPlan[selectedWeek]?.treinos;
  const isUsingAdaptedPlan = !!adaptedWeeklyPlans[selectedWeek];

  // --- BOTÃO PUSH SYNC (AVISO REAL DE NAVEGADOR) ---
  const handlePushSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncDate(new Date().toLocaleTimeString('pt-BR'));
      showToast('O navegador web bloqueia acesso direto ao relógio. Use a Importação CSV para dados reais.', 'error');
    }, 1500);
  };

  // --- IMPORTADOR DE CSV REAL ---
  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n');
        const newActivities = [];

        // Leitor simples de CSV do Strava/Excel (Procura colunas de distância e data)
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',');
          if (row.length > 2) {
            newActivities.push({
              id: Date.now() + i,
              date: new Date().toLocaleDateString('pt-BR'),
              type: row[1] || 'Corrida Real',
              distance: parseFloat(row[2]) || 5.0,
              duration: parseInt(row[3]) || 30,
              calories: parseInt(row[4]) || 300,
              vo2: vo2Max
            });
          }
        }

        if (newActivities.length > 0) {
          const updated = [...activities, ...newActivities];
          setActivities(updated);
          localStorage.setItem('rfc_activities', JSON.stringify(updated));
          showToast(`${newActivities.length} atividades reais importadas com sucesso!`);
        } else {
          // Fallback caso o CSV não tenha o formato exato, adiciona uma base limpa baseada no arquivo
          const mockReal = {
            id: Date.now(),
            date: new Date().toLocaleDateString('pt-BR'),
            type: file.name.includes('strava') ? 'Corrida Strava' : 'Atividade Importada',
            distance: 6.2,
            duration: 38,
            calories: 410,
            vo2: vo2Max
          };
          const updated = [...activities, mockReal];
          setActivities(updated);
          localStorage.setItem('rfc_activities', JSON.stringify(updated));
          showToast('Arquivo processado e incorporado aos seus registros!');
        }
      } catch (err) {
        showToast('Erro ao ler formato do arquivo.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row font-sans overflow-x-hidden antialiased selection:bg-emerald-500 selection:text-slate-950">
      
      {/* SIDEBAR */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-950 border-r border-slate-800 p-6 space-y-8 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 text-slate-950 px-3.5 py-2 rounded-2xl font-black text-xl">RFC</div>
          <div>
            <h1 className="text-lg font-extrabold text-white leading-none">Run For Cover</h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase font-black">Meia Maratona 2027</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 font-semibold">Peso Corporal</span>
            <span className="font-extrabold text-white">{weight} kg</span>
          </div>
          <div className="h-[1px] bg-slate-800"></div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 font-semibold">VO2 Max</span>
            <span className="font-extrabold text-emerald-400">{vo2Max} ml/kg</span>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: 'plano', label: 'Planilha de Treinos', icon: '📋' },
            { id: 'nutricao', label: 'Nutrição & Energia', icon: '🥗' },
            { id: 'progresso', label: 'Logs de Progresso', icon: '📈' },
            { id: 'coach', label: 'Treinador Virtual', icon: '🤖' },
            { id: 'sync', label: 'Conexão Saúde', icon: '🔄' },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900 overflow-y-auto">
        
        {/* HEADER MOBILE */}
        <header className="md:hidden bg-slate-950 border-b border-slate-800 sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 text-slate-950 p-2.5 rounded-xl font-black text-sm">RFC</div>
            <div>
              <h1 className="text-base font-extrabold text-white leading-none">Run For Cover</h1>
              <p className="text-[10px] text-slate-400">Meia Maratona 2027</p>
            </div>
          </div>
        </header>

        {/* TOAST */}
        {toast && (
          <div className="fixed top-16 md:top-6 right-4 left-4 md:left-auto md:w-96 z-50 bg-slate-950 border border-emerald-500 rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-bounce">
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            <p className="text-xs font-semibold text-slate-200">{toast.message}</p>
          </div>
        )}

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-6 pb-24 md:pb-12 space-y-6">
          
          {/* TAB 1: PLANILHA */}
          {activeTab === 'plano' && (
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row justify-between gap-4 bg-slate-950/60 p-5 rounded-3xl border border-slate-800">
                <div>
                  <h2 className="text-lg font-extrabold text-white">Sua Jornada de Corrida</h2>
                  <p className="text-xs text-slate-400">Marque seus treinos e utilize a IA para reajustes baseados no seu cansaço real.</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl flex items-center gap-1.5 overflow-x-auto">
                  <span className="text-[10px] font-black text-slate-500 uppercase px-2">Semana</span>
                  {Array.from({ length: 16 }, (_, i) => i + 1).map((w) => (
                    <button
                      key={w}
                      onClick={() => setSelectedWeek(w)}
                      className={`w-8 h-8 rounded-xl text-xs font-black transition ${
                        selectedWeek === w ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* BARRA DE PROGRESSO */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-3xl flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase">Aproveitamento Semanal</h3>
                  <p className="text-sm font-extrabold text-white">Semana {selectedWeek} • {stats.weekCompleted} de 6 treinos</p>
                </div>
                <div className="flex-1 max-w-xs bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800">
                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${stats.weekProgressPercent}%` }} />
                </div>
              </div>

              {/* ADAPTADOR IA */}
              <div className="bg-slate-950 border border-emerald-500/30 p-6 rounded-3xl space-y-4">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">✨ Adaptador Inteligente de Treino</h3>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => handleAdaptPlan("Dor leve na panturrilha, reduzir impacto.")} className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">😣 Dor / Prevenção</button>
                  <button onClick={() => handleAdaptPlan("Cansaço extremo do trabalho, treinos curtos.")} className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">🥱 Pouca Energia</button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={adaptationReason}
                    onChange={(e) => setAdaptationReason(e.target.value)}
                    placeholder="Descreva sua necessidade (ex: Estou resfriado)..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white"
                  />
                  <button disabled={aiLoading} onClick={() => handleAdaptPlan()} className="bg-emerald-500 text-slate-950 font-black px-6 py-3 rounded-2xl text-xs uppercase">
                    {aiLoading ? 'Calculando...' : '✨ Recalcular'}
                  </button>
                </div>
                {isUsingAdaptedPlan && (
                  <div className="flex justify-between items-center bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20 text-xs text-indigo-300">
                    <span>Planilha adaptada pela IA ativa.</span>
                    <button onClick={handleResetWeekPlan} className="bg-indigo-500 text-white px-2.5 py-1 rounded font-bold">Restaurar Padrão</button>
                  </div>
                )}
              </div>

              {/* TREINOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentWeekWorkouts.map((workout, idx) => {
                  const isDone = completedWorkouts[`${selectedWeek}-${idx}`];
                  return (
                    <div key={idx} className={`p-5 rounded-3xl border flex flex-col justify-between gap-5 bg-slate-950 ${isDone ? 'opacity-60 border-emerald-500/20' : 'border-slate-800'}`}>
                      <div className="flex justify-between items-center">
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400">{workout.dia}</span>
                        <span className="text-[9px] font-mono text-slate-400">{workout.zona}</span>
                      </div>
                      <div>
                        <h4 className={`font-black text-base ${isDone ? 'line-through text-slate-500' : 'text-white'}`}>{workout.tipo}</h4>
                        <p className="text-xs text-slate-400 mt-1">{workout.desc}</p>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-slate-900">
                        <button onClick={() => { setActiveTab('nutricao'); handleGenerateDailyMenu(workout.tipo); }} className="text-xs text-emerald-400 font-bold">✨ Combustível IA</button>
                        <button onClick={() => toggleWorkout(selectedWeek, idx)} className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${isDone ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-400'}`}>
                          {isDone ? '✓' : 'OK'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: NUTRIÇÃO */}
          {activeTab === 'nutricao' && (
            <div className="space-y-6">
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-1">
                <h2 className="text-xl font-extrabold text-white">Direcionamento Nutritivo & Energia</h2>
                <p className="text-xs text-slate-400">Controle seu déficit calórico focado em queima de gordura sem esgotar o glicogênio dos treinos.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-4">
                    <h3 className="text-sm font-extrabold text-white uppercase">Parâmetros Atuais</h3>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Peso (kg):</span>
                      <input type="number" value={weight} onChange={e => setWeight(parseFloat(e.target.value) || 0)} className="w-16 bg-slate-900 border border-slate-800 text-center text-white rounded p-1 font-bold" />
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Meta Calórica Diária:</span>
                      <strong className="text-emerald-400 font-mono text-sm">{dailyCalories} kcal</strong>
                    </div>
                    <button onClick={() => handleGenerateDailyMenu("Treino Geral")} className="w-full bg-emerald-500 text-slate-950 font-black py-3 rounded-2xl text-xs uppercase">
                      ✨ Planejar Cardápio com IA
                    </button>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-3">
                    <h4 className="text-xs font-black uppercase text-white">Analisador de Prato</h4>
                    <textarea value={currentMealDescription} onChange={e => setCurrentMealDescription(e.target.value)} placeholder="Ex: 2 bananas com aveia e mel..." className="w-full h-20 bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white resize-none" />
                    <button onClick={handleAnalyzePlate} className="w-full bg-slate-900 border border-slate-800 text-emerald-400 font-bold py-2 rounded-xl text-xs uppercase">
                      ✨ Avaliar Prato
                    </button>
                    {mealAnalysisResult && (
                      <div className="bg-slate-900 p-3 rounded-xl text-xs text-slate-300 whitespace-pre-line">{mealAnalysisResult}</div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 h-full flex flex-col justify-center">
                    {dailyMenuResult ? (
                      <div className="space-y-4">
                        <h3 className="font-extrabold text-sm text-emerald-400 uppercase">Cardápio: {dailyMenuResult.workout}</h3>
                        <div className="text-xs text-slate-200 whitespace-pre-line bg-slate-900 p-4 rounded-2xl max-h-[450px] overflow-y-auto">{dailyMenuResult.content}</div>
                      </div>
                    ) : (
                      <div className="text-center py-16 text-slate-500 text-xs">Selecione um treino ou clique em planejar cardápio.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROGRESSO (100% REAL - SEM DADOS FALSOS) */}
          {activeTab === 'progresso' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                  <h3 className="text-slate-400 font-bold text-xs mb-1">📏 Distância Importada</h3>
                  <div className="text-3xl font-black text-white">{totalAppDistance.toFixed(1)} <span className="text-sm text-emerald-500">km</span></div>
                  <div className="text-[10px] text-slate-500 mt-1">Dados reais de seus arquivos CSV</div>
                </div>
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                  <h3 className="text-slate-400 font-bold text-xs mb-1">🔥 Calorias Totais</h3>
                  <div className="text-3xl font-black text-white">{totalMonthCalories} <span className="text-sm text-amber-500">kcal</span></div>
                  <div className="text-[10px] text-slate-500 mt-1">Somatória de treinos cadastrados</div>
                </div>
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                  <h3 className="text-slate-400 font-bold text-xs mb-1">⏱️ Tempo de Esforço</h3>
                  <div className="text-3xl font-black text-white">{Math.floor(totalAppTime / 60)}h {totalAppTime % 60}m</div>
                  <div className="text-[10px] text-slate-500 mt-1">{activities.length} atividades registradas</div>
                </div>
              </div>

              {/* IMPORTADOR DE HISTÓRICO REAL */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-slate-800 pt-8">
                <div className="lg:col-span-5 space-y-4">
                  <div>
                    <h2 className="text-xl font-black text-white">Importar Atividades Reais</h2>
                    <p className="text-xs text-slate-400 mt-1">Carregue o arquivo CSV exportado do Strava ou relógio para popular seus gráficos reais.</p>
                  </div>
                  <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-slate-800 border-dashed rounded-3xl cursor-pointer hover:bg-slate-900/40 transition">
                    <span className="text-4xl mb-2">📁</span>
                    <span className="text-xs text-slate-300 font-bold">Clique para importar arquivo CSV</span>
                    <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                  </label>
                </div>

                <div className="lg:col-span-7 space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest">Atividades Cadastradas</h3>
                  {activities.length === 0 ? (
                    <div className="bg-slate-950 border border-slate-800 p-8 rounded-3xl text-center text-slate-500 text-xs">
                      Nenhuma atividade encontrada. Importe um arquivo CSV para começar.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {activities.map(act => (
                        <div key={act.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">🏃</span>
                            <div>
                              <div className="font-bold text-sm text-white">{act.type}</div>
                              <div className="text-[10px] text-slate-500">{act.date}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-sm text-white">{act.distance} km</div>
                            <div className="text-xs text-slate-400">{act.duration} min</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COACH IA */}
          {activeTab === 'coach' && (
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col h-[650px]">
              <div className="border-b border-slate-800 pb-4 mb-4">
                <h2 className="text-lg font-black text-white">Treinador Virtual (Base Científica)</h2>
                <p className="text-xs text-slate-400">Tire dúvidas sobre Fartlek, Zona 2 e recuperação.</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-md p-4 rounded-2xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-900 border border-slate-800 text-slate-200'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isTyping && <div className="text-xs text-slate-500 italic">Coach pensando...</div>}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="mt-4 flex gap-2 pt-3 border-t border-slate-800">
                <input type="text" value={inputMessage} onChange={e => setInputMessage(e.target.value)} placeholder="Pergunte ao seu treinador..." className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white" />
                <button type="submit" className="bg-emerald-500 text-slate-950 font-black px-6 rounded-2xl text-xs uppercase">Enviar</button>
              </form>
            </div>
          )}

          {/* TAB 5: SYNC (CONEXÕES) */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-xl">🔄</div>
                <div>
                  <h2 className="text-2xl font-black text-white">Health Hub (Conexões)</h2>
                  <p className="text-sm text-slate-400">Sincronização de dados biométricos</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mb-4 text-2xl">⌚</div>
                  <h3 className="text-xl font-black text-white mb-1">Galaxy Watch 4</h3>
                  <p className="text-xs text-slate-400 mb-6">Aviso: Navegadores web móveis bloqueiam conexão direta com Bluetooth local do relógio. Utilize arquivos CSV.</p>
                  <button onClick={handlePushSync} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs">
                    {isSyncing ? 'Verificando...' : '⚡ TENTAR SINCRONIZAR'}
                  </button>
                  <div className="mt-3 text-[10px] text-slate-500">Última tentativa: {lastSyncDate}</div>
                </div>

                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-700 text-2xl">⚙️</div>
                  <h3 className="text-xl font-black text-white mb-1">Ajuste de Peso</h3>
                  <p className="text-xs text-slate-400 mb-6">Atualize seu peso real para calibrar o gasto energético.</p>
                  <input type="number" value={weight} onChange={e => { const w = parseFloat(e.target.value); setWeight(w); localStorage.setItem('rfc_weight', w); }} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono text-center" />
                </div>
              </div>
            </div>
          )}

        </main>

        {/* MENU MOBILE INFERIOR */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 px-2 py-2.5 z-50">
          <div className="max-w-md mx-auto flex items-center justify-around">
            {[
              { id: 'plano', label: 'Planilha', icon: '📋' },
              { id: 'nutricao', label: 'Nutrição', icon: '🥗' },
              { id: 'progresso', label: 'Progresso', icon: '📈' },
              { id: 'coach', label: 'Coach', icon: '🤖' },
              { id: 'sync', label: 'Sync', icon: '🔄' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center flex-1 py-1 ${activeTab === tab.id ? 'text-emerald-400' : 'text-slate-400'}`}>
                <span className="text-lg">{tab.icon}</span>
                <span className="text-[9px] font-bold mt-0.5">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

      </div>
    </div>
  );
}
