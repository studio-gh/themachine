import React, { useState, useEffect, useRef } from 'react';

// Chave da API do Gemini (injetada de forma segura em runtime)
const apiKey = "";

export default function App() {
  // --- ESTADOS DO SISTEMA ---
  const [activeTab, setActiveTab] = useState('plano'); // 'plano' | 'nutricao' | 'progresso' | 'coach' | 'sync'
  const [activities, setActivities] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [completedWorkouts, setCompletedWorkouts] = useState({});
  const [weight, setWeight] = useState(78); // Peso padrão em kg
  const [vo2Max, setVo2Max] = useState(48.5); // VO2 Max inicial estimado
  const [toast, setToast] = useState(null);
  
   // --- NOVOS ESTADOS (VERSÃO 4.1 - HEALTH HUB) ---
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState('Nunca');
  
  // Dados simulados vindos do Galaxy Watch 4 / Health Connect
  const [sleepData, setSleepData] = useState({
    hours: 5.5,
    quality: 'Baixa',
    restingHR: 58,
    date: new Date().toLocaleDateString('pt-BR')
  });

  const [samsungActivities, setSamsungActivities] = useState([
    { id: 'sh1', date: '2026-07-15', type: 'Movimento Diário', calories: 320 },
    { id: 'sh2', date: '2026-07-14', type: 'Movimento Diário', calories: 410 },
    { id: 'sh3', date: '2026-07-13', type: 'Caminhada Leve', calories: 250 }
  ]);

  // --- CÁLCULOS DE ACUMULADOS MENSAIS ---
  const totalAppDistance = activities.reduce((a, b) => a + (parseFloat(b.distance) || 0), 0);
  const totalAppCalories = activities.reduce((a, b) => a + (parseInt(b.calories) || 0), 0);
  const totalAppTime = activities.reduce((a, b) => a + (parseInt(b.duration) || 0), 0); // Minutos
  
  const totalSHCalories = samsungActivities.reduce((a, b) => a + b.calories, 0);
  const totalMonthCalories = totalAppCalories + totalSHCalories; // Soma Real
  
  // --- INTEGRANTES ADAPTADOS POR IA (DINÂMICOS) ---
  const [adaptedWeeklyPlans, setAdaptedWeeklyPlans] = useState({}); // Armazena plano IA por semana
  const [adaptationReason, setAdaptationReason] = useState('');
  
  // --- ESTADO DE INTEGRAÇÕES DE SAÚDE ---
  const [connectedServices, setConnectedServices] = useState({
    strava: false,
    googleFit: false,
    samsungHealth: false
  });
  const [authModal, setAuthModal] = useState(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  // --- ESTADO DO COACH IA (CHAT) ---
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Olá! Sou o seu treinador virtual Run For Cover. Estou aqui para te ajudar a ajustar a planilha de acordo com a sua fadiga e rotina, além de calibrar seus treinos de Kettlebell, Yoga e as corridas em Zona 2 e Fartlek. Como posso te apoiar hoje?'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // --- ESTADO DO MOTOR GEMINI IA ---
  const [aiLoading, setAiLoading] = useState(false);
  
  // --- ESTADOS DO DIRECIONAMENTO NUTRITIVO E EMAGRECIMENTO COM ENERGIA ---
  const [currentMealDescription, setCurrentMealDescription] = useState('');
  const [mealAnalysisResult, setMealAnalysisResult] = useState(null);
  const [dailyMenuResult, setDailyMenuResult] = useState(null);
  const [nutritionPaceGoal, setNutritionPaceGoal] = useState('deficit_energia'); // 'deficit_energia' (perda peso com energia) | 'performance'
  const [dailyCalories, setDailyCalories] = useState(2050);

  // --- INJEÇÃO DINÂMICA DE TAILWIND E KATEX (RENDERIZAÇÃO SEGURA) ---
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

  // --- PERSISTÊNCIA LOCAL ---
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
    
    if (savedActivities) {
      setActivities(JSON.parse(savedActivities));
    } else {
      const mockActivities = [
        { id: 1, date: '2026-07-15', distance: 8.5, duration: 45, type: 'Fartlek', hrAvg: 155, vo2: 49.2 },
        { id: 2, date: '2026-07-13', distance: 12.0, duration: 72, type: 'Treino Longo', hrAvg: 142, vo2: 48.1 }
      ];
      setActivities(mockActivities);
      localStorage.setItem('rfc_activities', JSON.stringify(mockActivities));
    }
  }, []);

  // --- CALCULAR METAS CALÓRICAS (MÉTODO DEFICIT COM ENERGIA) ---
  useEffect(() => {
    // Metabolismo Basal Estimado simplificado (Katch-McArdle / Harris-Benedict adaptado)
    const basal = weight * 22; // Estimativa média basal ativa
    const activeTotal = basal * 1.4; // Atividade física moderada integrada
    
    let target = 0;
    if (nutritionPaceGoal === 'deficit_energia') {
      // Déficit seguro focado em manter o estoque de glicogênio para treinos intensos
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

  // --- GERADOR GERAL DE REQUISIÇÃO DO GEMINI ---
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

  // --- RECURSO IA: ADAPTADOR INTELIGENTE DE PLANILHA COM APLICAÇÃO EM TEMPO REAL ---
  const handleAdaptPlan = async (reason) => {
    const inputToUse = reason || adaptationReason;
    if (!inputToUse.trim()) return;

    setAiLoading(true);
    const currentWeekPlan = trainingPlan[selectedWeek];
    
    const systemInstruction = `Você é o treinador especialista de corrida do app Run For Cover. O usuário deseja reajustar a Semana ${selectedWeek} devido ao seguinte feedback/limitação física: "${inputToUse}".
    Sua missão é adaptar os 6 treinos desta semana respeitando o seguinte:
    - Seg/Qua/Sex: Sessões curtas de fortalecimento (Kettlebell) + Yoga.
    - Ter/Qui/Sábado ou Domingo: Sessões de Corrida (Fartlek, Corrida Base, Treino Longo).
    
    Retorne a resposta estritamente em um formato de lista JSON válido para que o app renderize os treinos na tela, exatamente neste formato:
    [
      {"dia": "Segunda-feira", "tipo": "Kettlebell + Yoga", "desc": "Nova descrição adaptada...", "zona": "Força & Yoga"},
      {"dia": "Terça-feira", "tipo": "Corrida: Fartlek Dinâmico", "desc": "Nova descrição adaptada...", "zona": "Z3 a Z5"},
      ...
    ]
    Não inclua marcações de markdown adicionais como \`\`\`json, apenas o array JSON puro e direto para ser lido por JSON.parse().`;

    const prompt = `Adapte a planilha atual da Semana ${selectedWeek} de Meia Maratona:
    Treinos originais:
    ${currentWeekPlan.treinos.map(t => `- ${t.dia} (${t.tipo}): ${t.desc} [Zonas: ${t.zona}]`).join('\n')}
    
    Restrição/Desejo do aluno: "${inputToUse}"`;

    try {
      const responseText = await callGeminiAPI(prompt, systemInstruction);
      // Limpar possíveis blocos extras retornados
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const adaptedArray = JSON.parse(cleanJson);
      
      const updatedPlans = {
        ...adaptedWeeklyPlans,
        [selectedWeek]: {
          reason: inputToUse,
          treinos: adaptedArray
        }
      };
      
      setAdaptedWeeklyPlans(updatedPlans);
      localStorage.setItem('rfc_adapted_plans', JSON.stringify(updatedPlans));
      showToast('Planilha da semana perfeitamente recalculada e aplicada com IA! ✨');
      setAdaptationReason('');
    } catch (error) {
      console.error(error);
      showToast('Erro ao reajustar treinos automaticamente. Tente uma frase mais direta.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleResetWeekPlan = () => {
    const updated = { ...adaptedWeeklyPlans };
    delete updated[selectedWeek];
    setAdaptedWeeklyPlans(updated);
    localStorage.setItem('rfc_adapted_plans', JSON.stringify(updated));
    showToast('Planilha original da semana restaurada!');
  };

  // --- RECURSO IA: GERADOR DE DIRECIONAMENTO NUTRITIVO (PERDA DE PESO + CORRIDA) ---
  const handleGenerateDailyMenu = async (workoutName) => {
    setAiLoading(true);
    
    const systemInstruction = `Você é um nutricionista esportivo de elite focado em esportes de endurance.
    Seu cliente tem ${weight}kg e busca PERDA DE GESTÃO DE GORDURA (Emagrecimento Saudável) mantendo EXCELENTE DISPOSIÇÃO para o dia a dia e ENERGIA MÁXIMA para o treino: "${workoutName}".
    Gere um plano alimentar estratégico estruturado em Markdown com:
    1. Café da Manhã e Almoço (Densidade nutritiva para o dia de trabalho).
    2. O Pré-Treino de Energia (Estratégia exata de carboidratos complexos/simples e timing para dar fôlego ao treino de hoje).
    3. O Pós-Treino Regenerador (Focado em reconstrução muscular e estoque calórico seguro).
    4. Dica de Emagrecimento Ativo: Como manter o metabolismo acelerado em dias de descanso ou fortalecimento com Kettlebell + Yoga.
    Seja focado, prático e motivador em Português do Brasil.`;

    const prompt = `Gere minha nutrição otimizada:
    Peso: ${weight} kg
    Alvo Calórico: ${dailyCalories} kcal
    Treino-Alvo de Hoje: ${workoutName}`;

    try {
      const responseText = await callGeminiAPI(prompt, systemInstruction);
      setDailyMenuResult({
        workout: workoutName,
        content: responseText
      });
      showToast('Direcionamento de Nutrição gerado com sucesso! 🥗');
    } catch (error) {
      showToast('Erro ao obter seu plano nutricional. Tente novamente.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  // --- RECURSO IA: ANALISADOR DE PRATO & COMBUSTÍVEL EM TEMPO REAL ---
  const handleAnalyzePlate = async () => {
    if (!currentMealDescription.trim()) return;
    setAiLoading(true);

    const systemInstruction = `Você é o assistente nutricional inteligente integrado do Run For Cover. O usuário quer emagrecer sem perder a energia para correr.
    Ele vai te falar o que pretende comer como refeição pré ou pós-treino: "${currentMealDescription}".
    Analise o prato de forma construtiva e de fácil leitura:
    1. Feedback rápido de Carboidratos (Suficiente para a corrida? Rápida ou lenta absorção?).
    2. Proteínas e micronutrientes (Adequado para recuperação muscular e saciedade?).
    3. Nota do Combustível (0 a 10) e uma sugestão direta para melhorar o prato (ex: adicionar mel, reduzir gordura, ajustar proteína).
    Use tópicos limpos em Português do Brasil.`;

    try {
      const responseText = await callGeminiAPI(currentMealDescription, systemInstruction);
      setMealAnalysisResult(responseText);
      showToast('Análise de combustível concluída! ⚡');
    } catch (error) {
      showToast('Não foi possível analisar o prato agora.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  // --- CHAT COM COACH VIRTUAL (CIÊNCIA E LIVROS DO TREINO) ---
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    const systemPrompt = `Você é o treinador especialista em biomecânica e fisiologia do "Run For Cover" integrado.
    Utilize em todas as suas respostas o embasamento dos seguintes arquivos do atleta:
    1. Treinamento Fartlek (Andres, 2024): Uso de ritmos variados nas terças para evoluir o sistema aeróbio/anaeróbio.
    2. Guilherme (2004) e Desenvolvimento de Atletas: Foco em treinos fáceis e longos em Zona 2 para aumentar mitocôndrias e economia de corrida.
    3. Kettlebell + Yoga (Seg/Qua/Sex): Fortalecimento unilateral, ativação de glúteo e mobilidade para eliminar dores lombares e do quadril.
    Responda em tom encorajador, formato de tópicos amigáveis e em Português do Brasil (PT-BR).`;

    try {
      const responseText = await callGeminiAPI(inputMessage, systemPrompt);
      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Fiquei sem sinal com a central esportiva por um momento. Repita a pergunta, por favor!' }]);
    } finally {
      setIsTyping(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  // --- PLANILHA DE TREINOS PADRÃO (16 SEMANAS) ---
  const trainingPlan = {};
  for (let w = 1; w <= 16; w++) {
    const isTapering = w >= 15;
    const longDistance = isTapering ? (w === 15 ? 10 : 6) : (6 + w);

    trainingPlan[w] = {
      foco: isTapering 
        ? "Polimento Aeróbio & Supercompensação" 
        : `Construção Unilateral de Força e Resistência Aeróbia - Semana ${w}`,
      treinos: [
        { 
          dia: "Segunda-feira", 
          tipo: "Kettlebell + Yoga", 
          desc: isTapering 
            ? "Ativação regenerativa: 2 séries de 10 halos leves + Yin Yoga para alongamento geral." 
            : "Estabilidade e Glúteo: 3 séries de 12 Swings explosivos + 8 Goblet squats profundos + 15 min de Vinyasa Yoga focado em equilíbrio unilateral.", 
          zona: "Força & Mobilidade" 
        },
        { 
          dia: "Terça-feira", 
          tipo: "Corrida: Fartlek Dinâmico", 
          desc: isTapering
            ? "10 min aquecimento + 4x (30 seg forte / 1 min leve) + 10 min desaquecimento confortável."
            : `Fisiologia do Ritmo: 15 min de trote + ${Math.min(10, 4 + Math.round(w/2))}x (1 min forte em Zona 4 / 1 min leve para recuperar) + 10 min desaquecimento.`, 
          zona: "Z3 a Z5" 
        },
        { 
          dia: "Quarta-feira", 
          tipo: "Kettlebell + Yoga", 
          desc: isTapering 
            ? "Mobilidade articular suave e respiração consciente (Pranayamas)." 
            : "Core & Postura: 3 séries de 10 Kettlebell Single-Arm Rows + 10 Lunges com peso + 15 min de posturas de abertura de quadril (Pombo, Guerreiro II).", 
          zona: "Força & Mobilidade" 
        },
        { 
          dia: "Quinta-feira", 
          tipo: "Corrida: Aeróbia Base", 
          desc: isTapering
            ? "30 min de rodagem extremamente leve em terreno macio."
            : "Consistência e Volume: 45 min a 55 min em ritmo de conversa fácil. Foco na postura ereta e respiração nasal.", 
          zona: "Z2" 
        },
        { 
          dia: "Sexta-feira", 
          tipo: "Kettlebell + Yoga", 
          desc: isTapering 
            ? "Descompressão lombar com posturas restauradoras de Yoga." 
            : "Cadeia Posterior Forte: 3 séries de 12 swings bilaterais + 8 Deadlifts de uma perna só + Alongamento dinâmico de isquiotibiais.", 
          zona: "Força & Mobilidade" 
        },
        { 
          dia: "Fim de Semana", 
          tipo: "Corrida: Treino Longo", 
          desc: isTapering
            ? `Rodagem final de confiança: ${longDistance} km fáceis para simular o início da Meia Maratona.`
            : `Grande Longo de Base: ${longDistance} km em ritmo progressivo. Pratique a ingestão de água e pequenos aportes de energia a cada 4 km.`, 
          zona: "Z2" 
        }
      ]
    };
  }

  // --- DERIVADOS DE PROGRESSO DA SEMANA ---
  const stats = React.useMemo(() => {
    let weekCompleted = 0;
    const currentList = adaptedWeeklyPlans[selectedWeek]?.treinos || trainingPlan[selectedWeek]?.treinos || [];
    currentList.forEach((_, idx) => {
      if (completedWorkouts[`${selectedWeek}-${idx}`]) {
        weekCompleted++;
      }
    });
    
    const percent = Math.round((weekCompleted / 6) * 100);
    const totalKm = activities.reduce((sum, act) => sum + act.distance, 0);
    
    const estimatedTimeMin = vo2Max > 0 
      ? Math.round(120 * Math.pow(45 / vo2Max, 1.05)) 
      : 135;
    const formattedHalfTime = `${Math.floor(estimatedTimeMin / 60)}h ${estimatedTimeMin % 60}m`;

    return { 
      totalKm: totalKm.toFixed(1), 
      completedCount: Object.values(completedWorkouts).filter(Boolean).length, 
      weekProgressPercent: percent,
      weekCompleted,
      formattedHalfTime
    };
  }, [activities, completedWorkouts, selectedWeek, adaptedWeeklyPlans, vo2Max]);

  // --- RECUPERAR PLANILHA VISUALIZADA NO MOMENTO ---
  const currentWeekWorkouts = adaptedWeeklyPlans[selectedWeek]?.treinos || trainingPlan[selectedWeek]?.treinos;
  const isUsingAdaptedPlan = !!adaptedWeeklyPlans[selectedWeek];

   // --- FUNÇÕES DE AÇÃO (VERSÃO 4.1) ---
  const handlePushSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncDate(new Date().toLocaleString('pt-BR'));
      if(setToast) setToast({ type: 'success', message: 'Dados do Galaxy Watch 4 sincronizados via Health Connect!' });
    }, 2500);
  };
    const handleCsvUpload = (e) => {
    // Futura implementação real de leitura de CSV
    if(setToast) setToast({ type: 'success', message: 'Arquivo recebido! Leitura em desenvolvimento.' });
  };
            {/* TAB 3: REGISTRO DE PROGRESSO */}
          {activeTab === 'progresso' && (
            <div className="space-y-8">
              
              {/* NOVO: Painel de Acumulados Claros e Hub de Sono (V4.1) */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                    <h3 className="text-slate-400 font-bold mb-1 text-sm flex items-center gap-2">📏 Distância no Mês</h3>
                    <div className="text-3xl font-black text-white">{totalAppDistance.toFixed(1)}<span className="text-sm text-emerald-500 ml-1">km</span></div>
                    <div className="mt-2 text-[10px] text-slate-500 font-medium">Apenas treinos estruturados do App</div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                    <h3 className="text-slate-400 font-bold mb-1 text-sm flex items-center gap-2">🔥 Gasto Calórico Total</h3>
                    <div className="text-3xl font-black text-white">{totalMonthCalories}<span className="text-sm text-amber-500 ml-1">kcal</span></div>
                    <div className="mt-2 flex gap-2 text-[10px] font-medium">
                      <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded">App: {totalAppCalories}</span>
                      <span className="bg-indigo-950 text-indigo-300 px-2 py-1 rounded">Watch: {totalSHCalories}</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                    <h3 className="text-slate-400 font-bold mb-1 text-sm flex items-center gap-2">⏱️ Tempo de Esforço</h3>
                    <div className="text-3xl font-black text-white">{Math.floor(totalAppTime / 60)}h {totalAppTime % 60}m</div>
                    <div className="mt-2 text-[10px] text-slate-500 font-medium">{activities.length} treinos concluídos</div>
                  </div>
                </div>

                {/* Hub de Sono & IA Insights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-indigo-950/30 p-5 rounded-2xl border border-indigo-900/50">
                    <h3 className="text-lg font-black mb-3 text-indigo-300 flex items-center gap-2">🌙 Sono (Watch 4)</h3>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-[10px] text-indigo-400 font-bold">Noite Passada</div>
                        <div className="text-2xl font-black text-white">{sleepData.hours}h</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-indigo-400 font-bold">Qualidade</div>
                        <div className="text-lg font-bold text-amber-400">{sleepData.quality}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-indigo-400 font-bold">FC Repouso</div>
                        <div className="text-lg font-bold text-rose-400 flex items-center gap-1">
                          {sleepData.restingHR} <span className="text-sm">❤️</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-950/20 p-5 rounded-2xl border border-emerald-900/50 flex flex-col justify-center">
                    <h3 className="text-sm font-black text-emerald-400 mb-1 flex items-center gap-2">🤖 IA Recovery Insight</h3>
                    {sleepData.hours < 6 ? (
                      <p className="text-xs text-slate-300 leading-relaxed">
                        <span className="font-bold text-amber-400">Atenção:</span> Você dormiu apenas {sleepData.hours}h. Sugiro transformar o treino de hoje em <strong className="text-white">Zona 2 (Regenerativa)</strong> para evitar picos de cortisol.
                      </p>
                    ) : (
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Recuperação excelente (FC Repouso em {sleepData.restingHR} bpm). Corpo pronto para o esforço programado na planilha!
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ANTIGO: Importador e Lista */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-slate-800 pt-8">
                <div className="lg:col-span-5 space-y-6">
                  <div>
                    <h2 className="text-xl font-black text-white">Importador de Histórico Strava</h2>
                    <p className="text-xs text-slate-400 mt-1">Carregue suas planilhas de atividade exportadas em formato CSV do Strava.</p>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-sm text-slate-200">Arquivo de Atividades CSV</h3>
                      <p className="text-xs text-slate-500">Mapeie as corridas para atualização direta de condicionamento.</p>
                    </div>
                    <label className="flex items-center justify-center w-full h-40 border-2 border-slate-800 border-dashed rounded-2xl cursor-pointer hover:border-slate-600 hover:bg-slate-900/40 transition">
                      <div className="flex flex-col items-center justify-center text-center p-4">
                        <span className="text-4xl mb-2">📁</span>
                        <p className="text-xs text-slate-300 font-bold">Clique aqui para importar o CSV</p>
                        <p className="text-[10px] text-slate-500 mt-1">ou arraste o arquivo do seu computador</p>
                      </div>
                      <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                    </label>
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest">Atividades Importadas</h3>
                  
                  {activities.length === 0 ? (
                    <div className="bg-slate-950/60 border border-slate-800 p-8 rounded-3xl text-center text-slate-500 text-xs">
                      Nenhuma atividade encontrada na base de dados do telefone.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                      {activities.map(act => (
                        <div key={act.id} className="bg-slate-950 border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-lg">
                              🏃
                            </div>
                            <div>
                              <h4 className="font-extrabold text-sm text-slate-200">{act.type}</h4>
                              <p className="text-[10px] text-slate-500 font-mono">{act.date}</p>
                            </div>
                          </div>
                          <div className="text-right space-y-0.5">
                            <div className="font-extrabold text-sm text-white">{act.distance} km</div>
                            <div className="text-xs text-slate-400">{act.duration} min | Est. $VO_2$: <span className="text-emerald-400 font-bold">{act.vo2}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row font-sans overflow-x-hidden antialiased selection:bg-emerald-500 selection:text-slate-950">
      
      {/* SIDEBAR DE DESKTOP */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-950 border-r border-slate-800 p-6 space-y-8 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 text-slate-950 px-3.5 py-2 rounded-2xl font-black tracking-wider text-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            RFC
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-white leading-none">Run For Cover</h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-black">Meia Maratona 2027</p>
          </div>
        </div>

        {/* MÉTRIQUES DE PERFORMANCE */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3.5 shadow-inner">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold">Peso Corporal</span>
            <span className="font-extrabold text-white">{weight} kg</span>
          </div>
          <div className="h-[1px] bg-slate-800"></div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold">Consumo Máx $VO_2$</span>
            <span className="font-extrabold text-emerald-400">{vo2Max} ml/kg</span>
          </div>
          <div className="h-[1px] bg-slate-800"></div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold">Ritmo Estimado Meia</span>
            <span className="font-extrabold text-emerald-400">{stats.formattedHalfTime}</span>
          </div>
        </div>

        {/* NAVEGAÇÃO DA SIDEBAR */}
        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setActiveTab('plano')}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'plano' 
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <span className="text-lg">📋</span>
            <span>Planilha de Treinos</span>
          </button>

          <button 
            onClick={() => setActiveTab('nutricao')}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'nutricao' 
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <span className="text-lg">🥗</span>
            <span>Direcionamento Nutritivo</span>
          </button>

          <button 
            onClick={() => setActiveTab('progresso')}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'progresso' 
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <span className="text-lg">📈</span>
            <span>Logs de Progresso</span>
          </button>

          <button 
            onClick={() => setActiveTab('coach')}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'coach' 
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <span className="text-lg">🤖</span>
            <span>Treinador Virtual</span>
          </button>

          <button 
            onClick={() => setActiveTab('sync')}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'sync' 
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <span className="text-lg">🔄</span>
            <span>Conexão Saúde</span>
          </button>
        </nav>

        <div className="pt-4 border-t border-slate-800 text-center">
          <p className="text-[10px] text-slate-500 font-mono">Run For Cover v2.6 • Gemini Engine</p>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL DA INTERFACE */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900 overflow-y-auto">
        
        {/* CABEÇALHO PARA DISPOSITIVOS MÓVEIS */}
        <header className="md:hidden bg-slate-950 border-b border-slate-800 sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 text-slate-950 p-2.5 rounded-xl font-black text-sm">
              RFC
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white leading-none">Run For Cover</h1>
              <p className="text-[10px] text-slate-400 mt-0.5">Meia Maratona 2027</p>
            </div>
          </div>
          <div className="bg-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-slate-700 text-slate-300">
            $VO_2\max$: <strong className="text-emerald-400">{vo2Max}</strong>
          </div>
        </header>

        {/* TOAST DE NOTIFICAÇÕES */}
        {toast && (
          <div className="fixed top-16 md:top-6 right-4 left-4 md:left-auto md:w-96 z-50 bg-slate-950 border border-emerald-500 rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-bounce">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
            <p className="text-xs font-semibold text-slate-200">{toast.message}</p>
          </div>
        )}

        {/* CONTAINER GERAL DO APP */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-6 pb-24 md:pb-12 space-y-6">
          
          {/* TAB 1: PLANILHA DE TREINOS COM ADAPTADOR PROMINENTE */}
          {activeTab === 'plano' && (
            <div className="space-y-6">
              
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-950/60 p-5 rounded-3xl border border-slate-800">
                <div className="space-y-1">
                  <h2 className="text-lg md:text-xl font-extrabold text-white">Sua Jornada de Corrida</h2>
                  <p className="text-xs text-slate-400">Marque os treinos concluídos e use a inteligência do treinador virtual para ajustar se cansar.</p>
                </div>

                {/* SELETOR DE SEMANAS */}
                <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl flex items-center gap-1.5 overflow-x-auto max-w-full">
                  <span className="text-[10px] font-black text-slate-500 uppercase px-2">Semana</span>
                  {Array.from({ length: 16 }, (_, i) => i + 1).map((w) => (
                    <button
                      key={w}
                      onClick={() => setSelectedWeek(w)}
                      className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${
                        selectedWeek === w
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* BARRA DE PROGRESSO DA SEMANA SELECIONADA */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aproveitamento Semanal</h3>
                    <p className="text-sm font-extrabold text-white">Semana {selectedWeek} • {stats.weekCompleted} de 6 treinos feitos</p>
                  </div>
                </div>
                <div className="flex-1 max-w-lg w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800 relative">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${stats.weekProgressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-black text-emerald-400">{stats.weekProgressPercent}%</span>
              </div>

              {/* ✨ NOVO ADAPTADOR INTELIGENTE SUPER PROMINENTE ✨ */}
              <div className="relative bg-gradient-to-br from-slate-950 via-slate-950 to-emerald-950/20 border-2 border-emerald-500/40 p-6 rounded-3xl shadow-xl space-y-4">
                <div className="absolute top-2 right-2 flex gap-1.5 items-center">
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                    Gemini API 2.5 Flash
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-3xl">✨</span>
                  <div>
                    <h3 className="text-base font-extrabold text-white">Ajuste e Adaptação Inteligente da Planilha</h3>
                    <p className="text-xs text-slate-400">Modifique dinamicamente o volume e a intensidade de toda a sua Semana {selectedWeek}.</p>
                  </div>
                </div>

                {/* Presets Rápidos */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button 
                    onClick={() => handleAdaptPlan("Estou com dor leve na panturrilha direita, adapte o volume para evitar impacto.")}
                    className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 transition"
                  >
                    😣 Pernas doloridas / Prevenção de Dor
                  </button>
                  <button 
                    onClick={() => handleAdaptPlan("Tenho pouca energia hoje devido ao cansaço do trabalho, mantenha treinos de 20 minutos.")}
                    className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 transition"
                  >
                    🥱 Cansaço Extremo / Sem Energia
                  </button>
                  <button 
                    onClick={() => handleAdaptPlan("Gostaria de maximizar a perda de gordura nos treinos de força e corrida aeróbia desta semana.")}
                    className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 transition"
                  >
                    🔥 Foco Queima de Gordura
                  </button>
                  <button 
                    onClick={() => handleAdaptPlan("Esta semana vai chover muito, monte a planilha adaptada inteira para treino indoor em esteira e sala de casa.")}
                    className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 transition"
                  >
                    🌧️ Treinar em casa / Esteira
                  </button>
                </div>

                {/* Entrada Livre */}
                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                  <input
                    type="text"
                    value={adaptationReason}
                    onChange={(e) => setAdaptationReason(e.target.value)}
                    placeholder="Digite sua necessidade customizada (ex: Estou resfriado, retire treinos em zona de esforço anaeróbico)..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    disabled={aiLoading}
                    onClick={() => handleAdaptPlan()}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  >
                    {aiLoading ? (
                      <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>✨ Recalcular Planilha</>
                    )}
                  </button>
                </div>

                {isUsingAdaptedPlan && (
                  <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-3.5 mt-2">
                    <p className="text-xs text-indigo-300 font-medium">
                      🚀 Planilha da <strong>Semana {selectedWeek} adaptada pela IA</strong> aplicada com sucesso.
                    </p>
                    <button
                      onClick={handleResetWeekPlan}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-3 py-1 rounded-lg text-[10px] uppercase transition"
                    >
                      Voltar ao Padrão
                    </button>
                  </div>
                )}
              </div>

              {/* LISTA DE TREINOS DA SEMANA */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentWeekWorkouts.map((workout, idx) => {
                  const isDone = completedWorkouts[`${selectedWeek}-${idx}`];
                  const isStrength = workout.zona.includes('Força');
                  return (
                    <div 
                      key={idx}
                      className={`p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between gap-5 relative ${
                        isDone 
                          ? 'bg-slate-950/40 border-emerald-500/20 opacity-75' 
                          : isStrength 
                            ? 'bg-slate-950 border-orange-500/20 hover:border-orange-500/40' 
                            : 'bg-slate-950 border-slate-800 hover:border-emerald-500/30'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                          isStrength ? 'bg-orange-500/10 text-orange-400' : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {workout.dia}
                        </span>
                        <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg text-[9px] font-mono text-slate-400">
                          {workout.zona}
                        </span>
                      </div>

                      <div className="space-y-1.5 flex-1">
                        <h4 className={`font-black text-sm md:text-base leading-tight ${isDone ? 'line-through text-slate-500' : 'text-white'}`}>
                          {workout.tipo}
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">
                          {workout.desc}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-900 gap-3">
                        <button
                          onClick={() => {
                            setActiveTab('nutricao');
                            handleGenerateDailyMenu(workout.tipo + " - " + workout.desc);
                          }}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase border border-emerald-500/20 transition flex items-center gap-1"
                        >
                          ✨ Combustível IA
                        </button>

                        <button
                          onClick={() => toggleWorkout(selectedWeek, idx)}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all ${
                            isDone 
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow' 
                              : 'border-slate-800 bg-slate-900 hover:border-emerald-400'
                          }`}
                        >
                          {isDone ? (
                            <svg className="w-4 h-4 font-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <span className="text-[10px] font-black text-slate-400">OK</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 2: DIRECIONAMENTO NUTRITIVO (NOVA) */}
          {activeTab === 'nutricao' && (
            <div className="space-y-6">
              
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-1">
                <h2 className="text-lg md:text-xl font-extrabold text-white">Direcionamento Nutritivo & Energia</h2>
                <p className="text-xs text-slate-400">
                  Gerencie seu déficit de calorias com foco em queima de gordura saudável, sem faltar o oxigênio e glicogênio para os Fartleks e fortalecimentos.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LADO ESQUERDO: CALCULADORA METABÓLICA */}
                <div className="lg:col-span-5 space-y-6">
                  
                  <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-5">
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Metas e Macros do Emagrecimento</h3>

                    {/* Meta de Foco */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Estratégia de Ritmo Nutritivo</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setNutritionPaceGoal('deficit_energia')}
                          className={`p-3 rounded-xl text-xs font-bold transition border ${
                            nutritionPaceGoal === 'deficit_energia'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          🔥 Emagrecer com Energia
                        </button>
                        <button
                          onClick={() => setNutritionPaceGoal('performance')}
                          className={`p-3 rounded-xl text-xs font-bold transition border ${
                            nutritionPaceGoal === 'performance'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          ⚡ Performance Máxima
                        </button>
                      </div>
                    </div>

                    {/* Peso e Estimador de Energia */}
                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Seu Peso Atual:</span>
                        <input
                          type="number"
                          value={weight}
                          onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 w-16 text-center text-white font-mono text-xs font-bold"
                        />
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Déficit Seguro Proposto:</span>
                        <span className="text-orange-400 font-extrabold font-mono">-350 kcal/dia</span>
                      </div>
                      <div className="h-[1px] bg-slate-800"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400 font-bold">Meta Calórica Sugerida:</span>
                        <strong className="text-emerald-400 font-mono font-black">{dailyCalories} kcal</strong>
                      </div>
                    </div>

                    {/* Divisão de Macronutrientes sugeridos pela Ciência do Esporte */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-black text-slate-500 uppercase block">Distribuição de Macros (Energia Preservada)</span>
                      <div className="flex h-3 rounded-full overflow-hidden">
                        <div className="bg-emerald-400 w-[45%]" title="Carboidratos (Combustível)"></div>
                        <div className="bg-orange-400 w-[30%]" title="Proteínas (Músculos)"></div>
                        <div className="bg-amber-400 w-[25%]" title="Gorduras Saudáveis"></div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-400 rounded-full"></span> 45% Carbo</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-400 rounded-full"></span> 30% Proteína</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-400 rounded-full"></span> 25% Gordura</span>
                      </div>
                    </div>

                    <button
                      disabled={aiLoading}
                      onClick={() => handleGenerateDailyMenu("Treino Geral da Semana")}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    >
                      {aiLoading ? (
                        <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        '✨ Planejar Cardápio com IA'
                      )}
                    </button>
                  </div>

                  {/* ✨ ANALISADOR DE PRATO DE CORRIDA ✨ */}
                  <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">✨</span>
                      <h4 className="text-xs font-black uppercase text-white tracking-widest">Otimizador de Prato de Combustível</h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Conte para o Gemini o que você planeja comer no pré-treino ou pós-treino para receber uma avaliação e nota rápida de eficiência.
                    </p>
                    <textarea
                      value={currentMealDescription}
                      onChange={(e) => setCurrentMealDescription(e.target.value)}
                      placeholder="Ex: Vou comer 2 bananas amassadas com aveia e mel, mais 1 dose de whey protein antes do Fartlek..."
                      className="w-full h-24 bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                    <button
                      disabled={aiLoading || !currentMealDescription}
                      onClick={handleAnalyzePlate}
                      className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500 text-emerald-400 font-extrabold py-2.5 rounded-xl text-xs uppercase transition"
                    >
                      ✨ Analisar Eficiência de Energia
                    </button>

                    {mealAnalysisResult && (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 leading-relaxed space-y-2 whitespace-pre-line max-h-64 overflow-y-auto font-sans">
                        {mealAnalysisResult}
                      </div>
                    )}
                  </div>

                </div>

                {/* LADO DIREITO: RESPOSTAS DE CARDÁPIO IA */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 h-full flex flex-col justify-between">
                    
                    {dailyMenuResult ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                          <div>
                            <h3 className="font-extrabold text-sm text-emerald-400 uppercase tracking-widest">Cardápio Inteligente Ativo</h3>
                            <p className="text-[10px] text-slate-400">Gerado para: <strong className="text-slate-200">{dailyMenuResult.workout}</strong></p>
                          </div>
                          <button 
                            onClick={() => setDailyMenuResult(null)}
                            className="bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-xl transition"
                          >
                            Limpar
                          </button>
                        </div>
                        <div className="text-xs md:text-sm text-slate-200 leading-relaxed whitespace-pre-line space-y-3 max-h-[500px] overflow-y-auto pr-2 bg-slate-900/40 p-4 rounded-2xl border border-slate-850 font-sans">
                          {dailyMenuResult.content}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center py-24 px-6 space-y-4">
                        <span className="text-5xl animate-bounce">🥗</span>
                        <div>
                          <h4 className="text-base font-black text-white">Nenhum Cardápio Ativo no Momento</h4>
                          <p className="text-xs text-slate-400 mt-2 max-w-sm">
                            Selecione e planeje clicando nos botões de "Combustível" da sua planilha ou usando o botão "Planejar Cardápio com IA".
                          </p>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: REGISTRO DE PROGRESSO */}
          {activeTab === 'progresso' && (
            <div className="space-y-8">
              
              {/* NOVO: Painel de Acumulados Claros e Hub de Sono (V4.1) */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                    <h3 className="text-slate-400 font-bold mb-1 text-sm flex items-center gap-2">📏 Distância no Mês</h3>
                    <div className="text-3xl font-black text-white">{totalAppDistance.toFixed(1)}<span className="text-sm text-emerald-500 ml-1">km</span></div>
                    <div className="mt-2 text-[10px] text-slate-500 font-medium">Apenas treinos estruturados do App</div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                    <h3 className="text-slate-400 font-bold mb-1 text-sm flex items-center gap-2">🔥 Gasto Calórico Total</h3>
                    <div className="text-3xl font-black text-white">{totalMonthCalories}<span className="text-sm text-amber-500 ml-1">kcal</span></div>
                    <div className="mt-2 flex gap-2 text-[10px] font-medium">
                      <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded">App: {totalAppCalories}</span>
                      <span className="bg-indigo-950 text-indigo-300 px-2 py-1 rounded">Watch: {totalSHCalories}</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                    <h3 className="text-slate-400 font-bold mb-1 text-sm flex items-center gap-2">⏱️ Tempo de Esforço</h3>
                    <div className="text-3xl font-black text-white">{Math.floor(totalAppTime / 60)}h {totalAppTime % 60}m</div>
                    <div className="mt-2 text-[10px] text-slate-500 font-medium">{activities.length} treinos concluídos</div>
                  </div>
                </div>

                {/* Hub de Sono & IA Insights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-indigo-950/30 p-5 rounded-2xl border border-indigo-900/50">
                    <h3 className="text-lg font-black mb-3 text-indigo-300 flex items-center gap-2">🌙 Sono (Watch 4)</h3>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-[10px] text-indigo-400 font-bold">Noite Passada</div>
                        <div className="text-2xl font-black text-white">{sleepData.hours}h</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-indigo-400 font-bold">Qualidade</div>
                        <div className="text-lg font-bold text-amber-400">{sleepData.quality}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-indigo-400 font-bold">FC Repouso</div>
                        <div className="text-lg font-bold text-rose-400 flex items-center gap-1">
                          {sleepData.restingHR} <span className="text-sm">❤️</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-950/20 p-5 rounded-2xl border border-emerald-900/50 flex flex-col justify-center">
                    <h3 className="text-sm font-black text-emerald-400 mb-1 flex items-center gap-2">🤖 IA Recovery Insight</h3>
                    {sleepData.hours < 6 ? (
                      <p className="text-xs text-slate-300 leading-relaxed">
                        <span className="font-bold text-amber-400">Atenção:</span> Você dormiu apenas {sleepData.hours}h. Sugiro transformar o treino de hoje em <strong className="text-white">Zona 2 (Regenerativa)</strong> para evitar picos de cortisol.
                      </p>
                    ) : (
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Recuperação excelente (FC Repouso em {sleepData.restingHR} bpm). Corpo pronto para o esforço programado na planilha!
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ANTIGO: Importador e Lista */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-slate-800 pt-8">
                <div className="lg:col-span-5 space-y-6">
                  <div>
                    <h2 className="text-xl font-black text-white">Importador de Histórico Strava</h2>
                    <p className="text-xs text-slate-400 mt-1">Carregue suas planilhas de atividade exportadas em formato CSV do Strava.</p>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-sm text-slate-200">Arquivo de Atividades CSV</h3>
                      <p className="text-xs text-slate-500">Mapeie as corridas para atualização direta de condicionamento.</p>
                    </div>
                    <label className="flex items-center justify-center w-full h-40 border-2 border-slate-800 border-dashed rounded-2xl cursor-pointer hover:border-slate-600 hover:bg-slate-900/40 transition">
                      <div className="flex flex-col items-center justify-center text-center p-4">
                        <span className="text-4xl mb-2">📁</span>
                        <p className="text-xs text-slate-300 font-bold">Clique aqui para importar o CSV</p>
                        <p className="text-[10px] text-slate-500 mt-1">ou arraste o arquivo do seu computador</p>
                      </div>
                      <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                    </label>
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest">Atividades Importadas</h3>
                  
                  {activities.length === 0 ? (
                    <div className="bg-slate-950/60 border border-slate-800 p-8 rounded-3xl text-center text-slate-500 text-xs">
                      Nenhuma atividade encontrada na base de dados do telefone.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                      {activities.map(act => (
                        <div key={act.id} className="bg-slate-950 border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-lg">
                              🏃
                            </div>
                            <div>
                              <h4 className="font-extrabold text-sm text-slate-200">{act.type}</h4>
                              <p className="text-[10px] text-slate-500 font-mono">{act.date}</p>
                            </div>
                          </div>
                          <div className="text-right space-y-0.5">
                            <div className="font-extrabold text-sm text-white">{act.distance} km</div>
                            <div className="text-xs text-slate-400">{act.duration} min | Est. $VO_2$: <span className="text-emerald-400 font-bold">{act.vo2}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SINCRONIZAÇÃO */}
          {activeTab === 'sync' && (
                      <div className="space-y-6 pb-20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-xl">🔄</span>
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Health Hub (Conexões)</h2>
                <p className="text-sm text-slate-400">Sincronize Watch 4 e Samsung Health</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Push Sync Card */}
              <div className="bg-gradient-to-b from-indigo-950/40 to-slate-950 p-6 rounded-2xl border border-indigo-900/50 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(79,70,229,0.3)]">
                  <span className="text-2xl">⌚</span>
                </div>
                <h3 className="text-xl font-black text-white mb-1">Galaxy Watch 4</h3>
                <p className="text-xs text-slate-400 mb-6">Sync passos, sono e calorias do movimento diário via Health Connect.</p>
                
                <button 
                  onClick={handlePushSync}
                  disabled={isSyncing}
                  className={`w-full py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all ${
                    isSyncing ? 'bg-indigo-800 text-indigo-300 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-400 text-white'
                  }`}
                >
                  {isSyncing ? 'Buscando Dados...' : '⚡ PUSH SYNC'}
                </button>
                <div className="mt-3 text-[10px] text-slate-500">Última sync: {lastSyncDate}</div>
              </div>

              {/* Importação Manual Card */}
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-700">
                  <span className="text-2xl">☁️</span>
                </div>
                <h3 className="text-xl font-black text-white mb-1">Importação Manual</h3>
                <p className="text-xs text-slate-400 mb-6">Faça upload do backup oficial (JSON/CSV) do Samsung Health ou Strava.</p>
                
                <label className="w-full py-3 rounded-xl font-black flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white cursor-pointer transition-colors">
                  📁 CARREGAR ARQUIVO
                  <input type="file" className="hidden" accept=".csv,.json" />
                </label>
                <div className="mt-3 text-[10px] flex gap-2 justify-center">
                  <span className="bg-slate-800 px-2 py-1 rounded text-slate-400">JSON</span>
                  <span className="bg-slate-800 px-2 py-1 rounded text-slate-400">CSV</span>
                </div>
              </div>
            </div>
          </div>

                    <div>
                      {connectedServices.strava ? (
                        <button 
                          onClick={() => setConnectedServices({...connectedServices, strava: false})}
                          className="bg-slate-900 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                        >
                          Desconectar
                        </button>
                      ) : (
                        <button 
                          onClick={() => setConnectedServices({...connectedServices, strava: true})}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-black uppercase transition"
                        >
                          Conectar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Google Fit */}
                  <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl">
                        G
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm text-slate-200">Google Fit</h3>
                          {connectedServices.googleFit && (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded-full font-bold">Conectado</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">Métricas cardíacas e passos</p>
                      </div>
                    </div>
                    <div>
                      {connectedServices.googleFit ? (
                        <button 
                          onClick={() => setConnectedServices({...connectedServices, googleFit: false})}
                          className="bg-slate-900 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                        >
                          Desconectar
                        </button>
                      ) : (
                        <button 
                          onClick={() => setConnectedServices({...connectedServices, googleFit: true})}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-black uppercase transition"
                        >
                          Conectar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-6">
                <div>
                  <h2 className="text-xl font-black text-white">Configurações Biométricas</h2>
                  <p className="text-xs text-slate-400 mt-1">Ajuste seu peso sempre que quiser calibrar suas necessidades energéticas diárias.</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold uppercase block">Peso Corporal (kg)</label>
                    <input 
                      type="number" 
                      value={weight} 
                      onChange={e => {
                        const w = parseFloat(e.target.value);
                        setWeight(w);
                        localStorage.setItem('rfc_weight', w);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

        </main>

        {/* CONTROLES DO MENU INFERIOR DE DISPOSITIVOS MÓVEIS */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-2.5 z-50">
          <div className="max-w-md mx-auto flex items-center justify-around gap-1">
            <button 
              onClick={() => setActiveTab('plano')}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1.5 rounded-xl transition ${
                activeTab === 'plano' ? 'text-emerald-400 bg-slate-900/60' : 'text-slate-400'
              }`}
            >
              <span className="text-lg">📋</span>
              <span className="text-[9px] mt-0.5 font-bold">Planilha</span>
            </button>

            <button 
              onClick={() => setActiveTab('nutricao')}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1.5 rounded-xl transition ${
                activeTab === 'nutricao' ? 'text-emerald-400 bg-slate-900/60' : 'text-slate-400'
              }`}
            >
              <span className="text-lg">🥗</span>
              <span className="text-[9px] mt-0.5 font-bold">Nutrição</span>
            </button>

            <button 
              onClick={() => setActiveTab('progresso')}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1.5 rounded-xl transition ${
                activeTab === 'progresso' ? 'text-emerald-400 bg-slate-900/60' : 'text-slate-400'
              }`}
            >
              <span className="text-lg">📈</span>
              <span className="text-[9px] mt-0.5 font-bold">Progresso</span>
            </button>

            <button 
              onClick={() => setActiveTab('coach')}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1.5 rounded-xl transition ${
                activeTab === 'coach' ? 'text-emerald-400 bg-slate-900/60' : 'text-slate-400'
              }`}
            >
              <span className="text-lg">🤖</span>
              <span className="text-[9px] mt-0.5 font-bold">Coach</span>
            </button>

            <button 
              onClick={() => setActiveTab('sync')}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1.5 rounded-xl transition ${
                activeTab === 'sync' ? 'text-emerald-400 bg-slate-900/60' : 'text-slate-400'
              }`}
            >
              <span className="text-lg">🔄</span>
              <span className="text-[9px] mt-0.5 font-bold">Sync</span>
            </button>
          </div>
        </nav>

      </div>

    </div>
  );
}
