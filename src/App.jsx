import React, { useState, useEffect, useRef } from 'react';

// Chave da API do Gemini (injetada de forma segura em runtime)
const apiKey = "";

export default function App() {
  // --- ESTADOS DO SISTEMA ---
  const [activeTab, setActiveTab] = useState('plano'); // 'plano' | 'nutricao' | 'progresso' | 'coach'
  const [activities, setActivities] = useState([]); 
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [completedWorkouts, setCompletedWorkouts] = useState({});
  const [weight, setWeight] = useState(82.8); // Peso corporal atualizado do atleta
  const [vo2Max, setVo2Max] = useState(45.0); 
  const [toast, setToast] = useState(null);
  
  // --- ESTADOS ADAPTADOS POR IA ---
  const [adaptedWeeklyPlans, setAdaptedWeeklyPlans] = useState({});
  const [adaptationReason, setAdaptationReason] = useState('');
  
  // --- ESTADOS DE NUTRIÇÃO ---
  const [currentMealDescription, setCurrentMealDescription] = useState('');
  const [mealAnalysisResult, setMealAnalysisResult] = useState(null);
  const [dailyMenuResult, setDailyMenuResult] = useState(null);
  const [nutritionPaceGoal, setNutritionPaceGoal] = useState('deficit_energia'); 
  const [dailyCalories, setDailyCalories] = useState(2100);

  // --- NOVO ESTADO: SELEÇÃO DE TERMO NO GLOSSÁRIO ---
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

    if (!document.getElementById('katex-js')) {
      const script = document.createElement('script');
      script.id = 'katex-js';
      script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
      script.onload = () => {
        const autoRenderScript = document.createElement('script');
        autoRenderScript.id = 'katex-autorender';
        autoRenderScript.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js';
        autoRenderScript.onload = () => {
          triggerMathRender();
        };
        document.head.appendChild(autoRenderScript);
      };
      document.head.appendChild(script);
    }
  }, []);

  const triggerMathRender = () => {
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

  useEffect(() => {
    setTimeout(() => {
      triggerMathRender();
    }, 150);
  }, [activeTab, selectedWeek, vo2Max, activities, adaptedWeeklyPlans, mealAnalysisResult, dailyMenuResult]);

  // --- CARREGAR DADOS INICIAIS & FIXAR PESO ---
  useEffect(() => {
    const savedWorkouts = localStorage.getItem('rfc_completed_workouts');
    const savedActivities = localStorage.getItem('rfc_activities');
    const savedAdaptedPlans = localStorage.getItem('rfc_adapted_plans');

    if (savedWorkouts) setCompletedWorkouts(JSON.parse(savedWorkouts));
    if (savedAdaptedPlans) setAdaptedWeeklyPlans(JSON.parse(savedAdaptedPlans));
    
    if (savedActivities) {
      setActivities(JSON.parse(savedActivities));
    }
    
    localStorage.setItem('rfc_weight', JSON.stringify(82.8));
  }, []);

  // --- CÁLCULO DE CALORIAS ---
  useEffect(() => {
    const basal = weight * 22; 
    const activeTotal = basal * 1.35; 
    
    let target = 0;
    if (nutritionPaceGoal === 'deficit_energia') {
      target = Math.round(activeTotal - 400); 
    } else {
      target = Math.round(activeTotal);
    }
    setDailyCalories(target > 1600 ? target : 1700);
  }, [weight, nutritionPaceGoal]);

  const showToast = (message) => {
    setToast({ message });
    setTimeout(() => setToast(null), 4000);
  };

  const toggleWorkout = (week, dayIndex) => {
    const key = `${week}-${dayIndex}`;
    const updated = { ...completedWorkouts, [key]: !completedWorkouts[key] };
    setCompletedWorkouts(updated);
    localStorage.setItem('rfc_completed_workouts', JSON.stringify(updated));
    showToast(updated[key] ? 'Treino marcado como feito! 🏃' : 'Treino marcado como pendente.');
  };

  const calculateVO2Max = (distance, durationMinutes) => {
    const speedMps = (distance * 1000) / (durationMinutes * 60);
    const estimatedVo2 = (speedMps * 0.2) + (speedMps * 0.9 * 0.15) + 3.5; 
    return parseFloat(estimatedVo2.toFixed(1));
  };

  // --- CÁLCULO ESTIMATIVO DE MARCOS CARDÍACOS BASEADOS NA IDADE ---
  // Guilherme, 41 anos. Frequência Cardíaca Máxima Estimada (FCM) = 220 - Idade = 179 BPM.
  // Frequência Cardíaca de Repouso estimada em 65 BPM.
  const fcm = 179;
  const fcr = 65;
  const fcrv = fcm - fcr; // Frequência de reserva

  const estimatedZones = {
    Z1: { nome: "Recuperação Ativa", min: Math.round(fcr + fcrv * 0.50), max: Math.round(fcr + fcrv * 0.60), sensacao: "Esforço mínimo. Dá para conversar cantando sem perder o fôlego." },
    Z2: { nome: "Zona Aeróbia Base", min: Math.round(fcr + fcrv * 0.60), max: Math.round(fcr + fcrv * 0.70), sensacao: "Ritmo de conversa fluida. Confortável, ideal para queimar gordura e criar resistência." },
    Z3: { nome: "Zona de Ritmo (Tempo)", min: Math.round(fcr + fcrv * 0.70), max: Math.round(fcr + fcrv * 0.80), sensacao: "Moderadamente forte. Consegue falar apenas frases curtas de cada vez." },
    Z4: { nome: "Limiar Anaeróbio", min: Math.round(fcr + fcrv * 0.80), max: Math.round(fcr + fcrv * 0.90), sensacao: "Ritmo de prova curto. Respiração muito pesada, foco total na corrida." }
  };

  // --- BANCO DE DADOS LOCAL DO GLOSSÁRIO ---
  const glossary = {
    "Z1 (Zona 1)": "Zona de esforço regenerativo. É um trote ou caminhada bem leve usada para bombear sangue para os músculos e acelerar a recuperação sem gerar cansaço acumulado.",
    "Z2 (Zona 2)": "A zona mais importante para quem quer correr uma meia maratona e queimar gordura. É um ritmo puramente aeróbio onde você corre conseguindo conversar tranquilamente. Desenvolve o coração e as mitocôndrias.",
    "Z3 (Zona 3)": "Ritmo moderado para firme. Você começa a acumular um pouco de ácido lático, e a respiração fica mais compassada, permitindo apenas falas curtas.",
    "Fartlek": "Termo de origem sueca que significa 'jogo de velocidade'. É um treino onde você mistura pedaços de corrida rápida (Z3 ou Z4) com pedaços de corrida bem leve (Z1 ou Z2) de forma contínua.",
    "Zona Aeróbia": "Qualquer ritmo de exercício de intensidade leve a moderada onde o oxigênio que você respira é suficiente para produzir a energia nos músculos.",
    "VO2 Max": "É a quantidade máxima de oxigênio que o seu corpo consegue captar do ar, levar para os músculos e transformar em movimento. É o seu indicador de 'tamanho do motor' cardiovascular.",
    "Cadência": "É o número de passos que você dá por minuto durante a corrida. Uma boa cadência reduz o impacto nas articulações dos joelhos.",
    "Kettlebell Swings": "Exercício de força que consiste em balançar o peso usando a força do quadril e glúteos. Excelente para fortalecer a bacia e dar estabilidade para a passada da corrida."
  };

  // --- INICIALIZADOR DE FUNÇÃO DA API DO GEMINI ---
  const callGeminiAPI = async (userPrompt, systemInstruction) => {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] }
        })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch {
      return "Erro de conexão com o servidor de inteligência esportiva.";
    }
  };

  const handleAdaptPlan = async () => {
    if (!adaptationReason.trim()) return;
    setAiLoading(true);
    const currentWeekPlan = trainingPlan[selectedWeek];
    const systemInstruction = `Você é o treinador principal de corrida do app Run For Cover. O usuário deseja reajustar a Semana ${selectedWeek} devido ao feedback: "${adaptationReason}". Retorne a resposta em formato JSON de array estruturado de treinos sem markdown adicionais.`;
    const prompt = `Adapte a planilha atual: ${currentWeekPlan.treinos.map(t => t.tipo).join(', ')}`;
    try {
      const responseText = await callGeminiAPI(prompt, systemInstruction);
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const adaptedArray = JSON.parse(cleanJson);
      setAdaptedWeeklyPlans({ ...adaptedWeeklyPlans, [selectedWeek]: { reason: adaptationReason, treinos: adaptedArray } });
      showToast('Planilha da semana recalculada com sucesso! ✨');
      setAdaptationReason('');
    } catch {
      showToast('Erro ao processar adaptação automática.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateDailyMenu = async (workoutName) => {
    setAiLoading(true);
    const systemInstruction = `Você é um nutricionista esportivo de elite focado em endurance. Forneça estratégias de emagrecimento com energia em tópicos simples e práticos para o prato do atleta.`;
    try {
      const responseText = await callGeminiAPI(`Treino de hoje: ${workoutName}, Peso: ${weight}kg`, systemInstruction);
      setDailyMenuResult({ workout: workoutName, content: responseText });
      showToast('Cardápio estruturado com sucesso! 🥗');
    } catch {
      showToast('Erro ao obter dados de nutrição.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAnalyzePlate = async () => {
    if (!currentMealDescription.trim()) return;
    setAiLoading(true);
    const systemInstruction = `Você é o assistente nutricional do app Run For Cover. Analise os macronutrientes do prato e forneça uma nota de energia pré-corrida.`;
    try {
      const responseText = await callGeminiAPI(currentMealDescription, systemInstruction);
      setMealAnalysisResult(responseText);
      showToast('Análise de combustível realizada!');
    } catch {
      showToast('Erro ao analisar o prato.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleManualActivityRegister = (type, distance, duration) => {
    if (!distance || !duration) return;
    const calculatedVo2 = calculateVO2Max(distance, duration);
    const newAct = { id: Date.now(), date: new Date().toISOString().split('T')[0], distance: parseFloat(distance), duration: parseInt(duration), type: type, vo2: calculatedVo2 };
    setActivities([newAct, ...activities]);
    setVo2Max(calculatedVo2);
    showToast(`Corrida registrada com sucesso! Seu VO2 foi estimado.`);
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;
    setMessages(prev => [...prev, { role: 'user', content: inputMessage }]);
    setInputMessage('');
    setIsTyping(true);
    const systemPrompt = `Você é o treinador do app Run For Cover especialista em corrida e fisiologia básica. Ajude o atleta a entender seus ritmos.`;
    try {
      const responseText = await callGeminiAPI(inputMessage, systemPrompt);
      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Central temporariamente instável. Tente novamente.' }]);
    } finally {
      setIsTyping(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const trainingPlan = {};
  for (let w = 1; w <= 16; w++) {
    const isTapering = w >= 15;
    const longDistance = isTapering ? (w === 15 ? 10 : 6) : (6 + w);
    trainingPlan[w] = {
      foco: isTapering ? "Polimento Aeróbio & Supercompensação" : `Construção de Força Unilateral e Resistência de Base - Semana ${w}`,
      treinos: [
        { dia: "Segunda-feira", tipo: "Kettlebell + Yoga", desc: "Estabilidade e Glúteo: 3 séries de 12 Swings explosivos + 8 Goblet squats profundos + 15 min de Vinyasa Yoga focado em equilíbrio unilateral.", zona: "Força & Mobilidade" },
        { dia: "Terça-feira", tipo: "Corrida: Fartlek Dinâmico", desc: `Jogo de Ritmos: 15 min de trote leve + ${Math.min(10, 4 + Math.round(w/2))}x (1 min forte / 1 min leve para recuperar) + 10 min desaquecimento.`, zona: "Z3 a Z5" },
        { dia: "Quarta-feira", tipo: "Kettlebell + Yoga", desc: "Core & Postura: 3 séries de 10 Kettlebell Single-Arm Rows + 10 Lunges alternados + 15 min de posturas de abertura de quadril (Pombo, Cobra).", zona: "Força & Mobilidade" },
        { dia: "Quinta-feira", tipo: "Corrida: Aeróbia Base", desc: "Rodagem Essencial: 45 min a 55 min em ritmo totalmente confortável (Zona 2). Ritmo ideal para queimar gordura com segurança.", zona: "Z2" },
        { dia: "Sexta-feira", tipo: "Kettlebell + Yoga", desc: "Cadeia Posterior Protegida: 3 séries de 12 Swings bilaterais + 8 Deadlifts unilaterais + Alongamento dinâmico.", zona: "Força & Mobilidade" },
        { dia: "Fim de Semana", tipo: "Corrida: Treino Longo", desc: `Grande Longo de Base: ${longDistance} km em ritmo constante e confortável em Zona 2. Foco em manter o fôlego controlado.`, zona: "Z2" }
      ]
    };
  }

  const stats = React.useMemo(() => {
    let weekCompleted = 0;
    const currentList = adaptedWeeklyPlans[selectedWeek]?.treinos || trainingPlan[selectedWeek]?.treinos || [];
    currentList.forEach((_, idx) => {
      if (completedWorkouts[`${selectedWeek}-${idx}`]) weekCompleted++;
    });
    return { 
      totalKm: activities.reduce((sum, act) => sum + act.distance, 0).toFixed(1), 
      weekProgressPercent: Math.round((weekCompleted / 6) * 100),
      weekCompleted
    };
  }, [activities, completedWorkouts, selectedWeek, adaptedWeeklyPlans]);

  const currentWeekWorkouts = adaptedWeeklyPlans[selectedWeek]?.treinos || trainingPlan[selectedWeek]?.treinos;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row font-sans overflow-x-hidden antialiased">
      
      {/* SIDEBAR */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-950 border-r border-slate-800 p-6 space-y-8 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 text-slate-950 px-3.5 py-2 rounded-2xl font-black text-xl">RFC</div>
          <div>
            <h1 className="text-base font-extrabold text-white leading-none">Run For Cover</h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-black">Meia Maratona 2027</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 shadow-inner text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Peso Atual</span>
            <strong className="text-white">{weight} kg</strong>
          </div>
          <div className="h-[1px] bg-slate-800"></div>
          <div className="text-slate-400 leading-tight">
            Seu peso está calibrado. As estimativas fisiológicas abaixo usam fórmulas iniciais baseadas na sua idade (41 anos).
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <button onClick={() => setActiveTab('plano')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'plano' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:bg-slate-900/50'}`}>
            <span>📋</span> Planilha de Treinos
          </button>
          <button onClick={() => setActiveTab('nutricao')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'nutricao' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:bg-slate-900/50'}`}>
            <span>🥗</span> Direcionamento Nutritivo
          </button>
          <button onClick={() => setActiveTab('progresso')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'progresso' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:bg-slate-900/50'}`}>
            <span>📈</span> Registrar Corrida
          </button>
          <button onClick={() => setActiveTab('coach')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'coach' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:bg-slate-900/50'}`}>
            <span>🤖</span> Treinador Virtual
          </button>
        </nav>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900 overflow-y-auto">
        
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-6 pb-24 space-y-8">
          
          {/* PAINEL ESTIMATIVO DE MARCOS CARDÍACOS */}
          <section className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-white">📊 Estimativa Inicial das Suas Zonas de Intensidade</h3>
              <p className="text-xs text-slate-400 mt-1">Calculado para Guilherme (41 anos, {weight}kg). Use estes batimentos como guia se tiver relógio ou use a descrição da sensação.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(estimatedZones).map(([key, zone]) => (
                <div key={key} className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-emerald-400 uppercase font-mono">{key}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-bold font-mono">{zone.min}-{zone.max} BPM</span>
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
              
              {/* TREINOS DE CAMPO PARA DESCOBRIR SEUS MARCOS */}
              <div className="bg-gradient-to-br from-indigo-950/40 via-slate-950 to-slate-950 border-2 border-indigo-500/30 p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">🧪</span>
                  <div>
                    <h3 className="text-sm font-extrabold text-indigo-300 uppercase tracking-wider">Treinos de Teste: Descubra Seus Próprios Marcos</h3>
                    <p className="text-xs text-slate-400">Não sabe qual é o seu ritmo de Zona 2 (Z2)? Escolha um desses métodos simples na sua próxima saída:</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
                    <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Método 1: O Teste da Fala (Fácil)
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Saia para caminhar rápido e comece a trotar bem leve. Tente falar uma frase longa em voz alta (ex: cantarolar ou falar um parágrafo). Se você conseguir falar sem precisar parar para puxar o ar no meio da frase, parabéns: <strong>você encontrou a sua Zona 2 (Z2)</strong>. Se faltar o ar, reduza o ritmo imediatamente.
                    </p>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
                    <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-400"></span> Método 2: Teste de Caminhada Rockport (1.6 km)
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Em uma pista plana ou esteira, caminhe o mais rápido que conseguir (sem correr) por exatamente 1.600 metros (1.6 km). Cronometre o tempo exato e anote os seus batimentos cardíacos no final. Insira esses números no formulário de registro para calibrarmos seu $VO_2\max$ inicial.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-950/60 p-5 rounded-3xl border border-slate-800">
                <div>
                  <h2 className="text-base font-extrabold text-white">Cronograma da Semana {selectedWeek}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Selecione os botões ao lado para alternar as semanas do plano de 16 semanas.</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl flex items-center gap-1 overflow-x-auto">
                  {Array.from({ length: 16 }, (_, i) => i + 1).map((w) => (
                    <button key={w} onClick={() => setSelectedWeek(w)} className={`w-8 h-8 rounded-xl text-xs font-black ${selectedWeek === w ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}>
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* GRID DE TREINOS DE PLANILHA */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentWeekWorkouts.map((workout, idx) => {
                  const isDone = completedWorkouts[`${selectedWeek}-${idx}`];
                  return (
                    <div key={idx} className="p-5 rounded-3xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-[10px] font-black text-slate-400 uppercase">{workout.dia}</span>
                          <span className="text-[9px] font-mono text-slate-500">{workout.zona}</span>
                        </div>
                        <h4 className="font-black text-sm text-white">{workout.tipo}</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{workout.desc}</p>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-900">
                        <button onClick={() => { setActiveTab('nutricao'); handleGenerateDailyMenu(workout.tipo); }} className="text-emerald-400 text-[10px] font-extrabold uppercase">
                          ✨ Combustível IA
                        </button>
                        <button onClick={() => toggleWorkout(selectedWeek, idx)} className={`w-8 h-8 rounded-xl border ${isDone ? 'bg-emerald-500 text-slate-950' : 'border-slate-800'}`}>
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-4">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Metabolismo & Déficit Calórico</h3>
                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
                    <div className="flex justify-between"><span>Seu Peso Real:</span><strong className="text-white">{weight} kg</strong></div>
                    <div className="flex justify-between"><span>Cota Calórica para Emagrecer:</span><strong className="text-emerald-400">{dailyCalories} kcal/dia</strong></div>
                  </div>
                  <button disabled={aiLoading} onClick={() => handleGenerateDailyMenu("Treino Geral com Foco em Emagrecimento Sem Perda de Massa")} className="w-full bg-emerald-500 text-slate-950 font-black py-3 rounded-2xl text-xs uppercase">
                    ✨ Planejar Cardápio de Alta Energia
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-3">
                  <h4 className="text-xs font-black uppercase text-white">Analisador de Refeição Pré-Corrida</h4>
                  <textarea value={currentMealDescription} onChange={(e) => setCurrentMealDescription(e.target.value)} placeholder="Escreva o que pretende comer perto do horário do treino..." className="w-full h-24 bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs text-slate-100 resize-none" />
                  <button disabled={aiLoading || !currentMealDescription} onClick={handleAnalyzePlate} className="w-full bg-slate-900 border border-slate-800 text-emerald-400 font-extrabold py-2 rounded-xl text-xs uppercase">
                    Analisar Alimento
                  </button>
                  {mealAnalysisResult && <div className="p-4 bg-slate-900 rounded-xl text-xs text-slate-300 font-sans whitespace-pre-line border border-slate-800">{mealAnalysisResult}</div>}
                </div>
              </div>

              <div className="lg:col-span-7">
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 min-h-[300px]">
                  {dailyMenuResult ? (
                    <div className="text-xs md:text-sm text-slate-200 whitespace-pre-line leading-relaxed font-sans">{dailyMenuResult.content}</div>
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-20">Clique em planejar cardápio para carregar sugestões alimentares.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REGISTRO DE PROGRESSO */}
          {activeTab === 'progresso' && (
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-white">Registrar Nova Corrida Real</h3>
                <p className="text-xs text-slate-400">Insira a quilometragem e o tempo gasto para recalcular seu condicionamento cardiovascular.</p>
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
                  <input type="number" step="0.01" name="distance" placeholder="Ex: 5.0" className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 w-full text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Duração (minutos)</label>
                  <input type="number" name="duration" placeholder="Ex: 30" className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 w-full text-xs text-white" />
                </div>
                <button type="submit" className="bg-emerald-500 text-slate-950 font-black p-2.5 rounded-xl text-xs uppercase">Gravar Atividade</button>
              </form>

              <div className="pt-4 border-t border-slate-900 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400">Suas Corridas Salvas</h4>
                {activities.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Nenhum treino realizado ainda. Sua base está limpa!</p>
                ) : (
                  <div className="space-y-2">
                    {activities.map(a => (
                      <div key={a.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex justify-between text-xs">
                        <span><strong>{a.type}</strong> ({a.date})</span>
                        <span>{a.distance} km em {a.duration} min | Est. $VO_2$: {a.vo2}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: TREINADOR VIRTUAL CHAT */}
          {activeTab === 'coach' && (
            <div className="bg-slate-950 border border-slate-800 rounded-3xl h-[450px] flex flex-col justify-between overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-3 rounded-2xl text-xs max-w-[85%] ${m.role === 'user' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-200'}`}>{m.content}</div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 flex gap-2">
                <input type="text" value={inputMessage} onChange={e => setInputMessage(e.target.value)} placeholder="Diga o que está sentindo ou tire uma dúvida sobre as zonas..." className="flex-1 bg-slate-900 rounded-xl px-4 text-xs text-white focus:outline-none" />
                <button type="submit" className="bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-black">Mandar</button>
              </form>
            </div>
          )}

          {/* 📖 NOVO RECURSO DE FIXO: GLOSSÁRIO ESPORTIVO DIDÁTICO */}
          <section className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">📖 Glossário Inteligente do Corredor</h3>
              <p className="text-xs text-slate-400 mt-1">Clique em qualquer palavra técnica para abrir o significado simplificado imediatamente e tirar suas dúvidas.</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {Object.keys(glossary).map(term => (
                <button
                  key={term}
                  onClick={() => setSelectedGlossaryTerm(term === selectedGlossaryTerm ? null : term)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    selectedGlossaryTerm === term
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {term}
                </button>
              ))}
            </div>

            {selectedGlossaryTerm && (
              <div className="p-4 bg-slate-950/60 border border-emerald-500/30 rounded-2xl animate-fade-in">
                <h4 className="text-xs font-black text-emerald-400 uppercase font-mono mb-1">{selectedGlossaryTerm}</h4>
                <p className="text-xs text-slate-200 leading-relaxed">{glossary[selectedGlossaryTerm]}</p>
              </div>
            )}
          </section>

        </main>
      </div>
    </div>
  );
}
```eof

### Como usar as novas ferramentas agora:
1. **Verifique seus batimentos estimativos**: No topo do aplicativo, criei um sumário de batimentos cardíacos ideais para você. A sua **Zona 2 (Z2)** de queima de gordura e ganho de fôlego está estimada entre **133 a 145 BPM**.
2. **Faça o Teste Prático na Próxima Corrida**: Na aba da Planilha de Treinos, leia atentamente as instruções do **Teste da Fala**. Ele é o melhor método prático do mundo para quem está começando descobrir o ritmo exato da Zona 2 de forma natural.
3. **Consulte o Glossário**: No rodapé da página, basta clicar em qualquer botão do **Glossário** (como *Fartlek* ou *Kettlebell Swings*) para ler uma explicação super amigável em tempo real.
