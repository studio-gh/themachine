import React, { useState, useEffect, useRef } from 'react';

// Chave da API vazia conforme as diretrizes do ambiente seguro
const apiKey = "";

export default function App() {
  // --- ESTADOS DO SISTEMA ---
  const [activeTab, setActiveTab] = useState('plano'); // 'plano' | 'progresso' | 'coach' | 'sync'
  const [activities, setActivities] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [completedWorkouts, setCompletedWorkouts] = useState({});
  const [weight, setWeight] = useState(75); // Peso padrão em kg
  const [vo2Max, setVo2Max] = useState(48.5); // VO2 Max estimado inicial
  const [toast, setToast] = useState(null);
  
  // --- ESTADO DO COACH IA ---
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Olá! Reorganizei o teu plano com o teu cronograma exato: Segundas, Quartas e Sextas com Kettlebell + Yoga para blindar as tuas articulações; Terças, Quintas e Fim de Semana dedicados à corrida. Vamos com tudo rumo à Meia Maratona em 2027!'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // --- CARREGAR DADOS INICIAIS ---
  useEffect(() => {
    const savedWorkouts = localStorage.getItem('rfc_completed_workouts');
    const savedActivities = localStorage.getItem('rfc_activities');
    const savedWeight = localStorage.getItem('rfc_weight');
    const savedVo2 = localStorage.getItem('rfc_vo2max');

    if (savedWorkouts) setCompletedWorkouts(JSON.parse(savedWorkouts));
    if (savedWeight) setWeight(JSON.parse(savedWeight));
    if (savedVo2) setVo2Max(JSON.parse(savedVo2));
    if (savedActivities) {
      setActivities(JSON.parse(savedActivities));
    } else {
      // Atividades iniciais de demonstração
      const mockActivities = [
        { id: 1, date: '2026-07-15', distance: 8.5, duration: 45, type: 'Fartlek', hrAvg: 155, vo2: 49.2 },
        { id: 2, date: '2026-07-13', distance: 12.0, duration: 72, type: 'Longo Aeróbio', hrAvg: 142, vo2: 48.1 },
        { id: 3, date: '2026-07-10', distance: 5.0, duration: 28, type: 'Recuperação', hrAvg: 130, vo2: 47.9 }
      ];
      setActivities(mockActivities);
      localStorage.setItem('rfc_activities', JSON.stringify(mockActivities));
    }
  }, []);

  // --- SINALIZAR MENSAGENS (TOAST) ---
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // --- PERSISTIR PROGRESSO ---
  const toggleWorkout = (week, dayIndex) => {
    const key = `${week}-${dayIndex}`;
    const updated = { ...completedWorkouts, [key]: !completedWorkouts[key] };
    setCompletedWorkouts(updated);
    localStorage.setItem('rfc_completed_workouts', JSON.stringify(updated));
    showToast(updated[key] ? 'Treino concluído! Excelente esforço.' : 'Treino marcado como não realizado.');
  };

  // --- CÁLCULOS DE FISIOLOGIA DESPORTIVA (JACK DANIELS & ACSM) ---
  const calculateVO2Max = (distance, durationMinutes) => {
    const speedMps = (distance * 1000) / (durationMinutes * 60);
    const estimatedVo2 = (speedMps * 0.2) + (speedMps * 0.9 * 0.15) + 3.5; 
    return parseFloat(estimatedVo2.toFixed(1));
  };

  // --- LEITOR E IMPORTADOR DE CSV (STRAVA LOG) ---
  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const rows = text.split('\n');
        if (rows.length < 2) throw new Error('O ficheiro parece estar vazio.');

        const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
        const parsedActivities = [];

        const distIdx = headers.findIndex(h => h.includes('dist') || h.includes('distance'));
        const durIdx = headers.findIndex(h => h.includes('time') || h.includes('elapsed') || h.includes('duration'));
        const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('timestamp'));
        const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('name'));

        for (let i = 1; i < rows.length; i++) {
          if (!rows[i].trim()) continue;
          const cols = rows[i].split(',');
          
          const rawDist = parseFloat(cols[distIdx]);
          const rawDur = parseFloat(cols[durIdx]);
          
          if (!isNaN(rawDist) && !isNaN(rawDur)) {
            const distanceKm = rawDist > 100 ? rawDist / 1000 : rawDist;
            const durationMin = rawDur > 200 ? rawDur / 60 : rawDur;
            const dateStr = dateIdx !== -1 ? cols[dateIdx] : new Date().toISOString().split('T')[0];
            const typeStr = typeIdx !== -1 ? cols[typeIdx].replace(/"/g, '') : 'Corrida';
            const estimatedVo2 = calculateVO2Max(distanceKm, durationMin);

            parsedActivities.push({
              id: Date.now() + i,
              date: dateStr,
              distance: parseFloat(distanceKm.toFixed(2)),
              duration: Math.round(durationMin),
              type: typeStr.includes('Fartlek') ? 'Fartlek' : (distanceKm >= 10 ? 'Longo Aeróbio' : 'Corrida Base'),
              hrAvg: 145,
              vo2: estimatedVo2
            });
          }
        }

        if (parsedActivities.length > 0) {
          const merged = [...parsedActivities, ...activities];
          setActivities(merged);
          localStorage.setItem('rfc_activities', JSON.stringify(merged));
          
          const highestVo2 = Math.max(...parsedActivities.map(a => a.vo2));
          if (highestVo2 > vo2Max) {
            setVo2Max(highestVo2);
            localStorage.setItem('rfc_vo2max', highestVo2);
          }

          showToast(`Sucesso! ${parsedActivities.length} atividades importadas do Strava.`);
        } else {
          showToast('Nenhum dado válido de corrida detetado no CSV.', 'error');
        }
      } catch (err) {
        showToast('Erro ao ler o ficheiro CSV. Verifica a formatação.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // --- SINCRONIZAÇÃO SIMULADA DE DISPOSITIVOS ---
  const handleDeviceSync = (provider) => {
    showToast(`A ligar à API do ${provider}...`, 'info');
    setTimeout(() => {
      const randomDistance = parseFloat((5 + Math.random() * 8).toFixed(2));
      const randomDuration = Math.round(randomDistance * (5 + Math.random()));
      const newActivity = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        distance: randomDistance,
        duration: randomDuration,
        type: randomDistance > 10 ? 'Longo Aeróbio' : 'Fartlek',
        hrAvg: Math.round(135 + Math.random() * 25),
        vo2: calculateVO2Max(randomDistance, randomDuration)
      };

      const updated = [newActivity, ...activities];
      setActivities(updated);
      localStorage.setItem('rfc_activities', JSON.stringify(updated));
      showToast(`Sincronização concluída! Nova corrida de ${randomDistance} km importada.`);
    }, 2000);
  };

  // --- CHAT COM COACH INTELIGENTE (INTEGRAÇÃO GEMINI COM RETRIES) ---
  const callCoachAPI = async (userPrompt) => {
    const systemPrompt = `És o treinador virtual do aplicativo "Run For Cover" especialista em corrida, treino de força (Kettlebell) e Yoga. O atleta está a preparar-se para uma Meia Maratona em 2027. O seu peso atual é de ${weight} kg e o seu VO2 Max estimado é de ${vo2Max} ml/kg/min.
    Utiliza as tuas bases científicas:
    1. O estudo sobre Fartlek de Andres (2024) para explicar treinos de ritmo de terça-feira.
    2. A dissertação de Guilherme (2004) para enfatizar o desenvolvimento aeróbio nas corridas de quinta-feira e fim de semana.
    3. Os benefícios comprovados do treino de força e Kettlebell integrado com Yoga (segundas, quartas e sextas) na melhoria da economia de corrida, estabilização da bacia e redução do risco de lesões.
    Responde sempre em Português de Portugal de forma motivadora e em pequenos tópicos de fácil leitura móvel.`;

    let delay = 1000;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] }
          })
        });

        if (!response.ok) throw new Error(`HTTP status ${response.status}`);
        
        const data = await response.json();
        const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (outputText) return outputText;
        throw new Error('Formato de resposta inválido');
      } catch (error) {
        if (attempt === 5) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Backoff exponencial
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    try {
      const responseText = await callCoachAPI(inputMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Pedimos desculpa, mas o serviço do Coach inteligente está indisponível de momento. Por favor, garante que a ligação à internet está ativa ou tenta novamente daqui a pouco!' 
      }]);
    } finally {
      setIsTyping(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  // --- PLANO DE TREINOS DE 16 SEMANAS TOTALMENTE REESTRUTURADO (SEG-QUA-SEX KETTLEBELL/YOGA | TER-QUI-FIM CORRIDA) ---
  const trainingPlan = {};

  // Geração das 16 Semanas respeitando os dias exatos solicitados
  for (let w = 1; w <= 16; w++) {
    const isTapering = w >= 15;
    
    // Progressão de volume do longo ao fim de semana
    const longDistance = isTapering ? (w === 15 ? 10 : 6) : (6 + w);

    trainingPlan[w] = {
      foco: isTapering 
        ? "Supercompensação e Polimento (Tapering)" 
        : `Acumulação e Fortalecimento Unilateral - Semana ${w}`,
      treinos: [
        { 
          dia: "Segunda-feira", 
          tipo: "Kettlebell + Yoga", 
          desc: isTapering 
            ? "Ativação Leve: 2 séries de 10 Halos + 10 Swings suaves + Alongamento passivo global de cadeia posterior (Yin Yoga)." 
            : "Potência Dinâmica: 3 séries de 15 Swings Explosivos + 10 Goblet Squats + 8 RDL unilateral (cada perna) + Alongamento de Isquiotibiais.", 
          zona: "Força & Yoga" 
        },
        { 
          dia: "Terça-feira", 
          tipo: "Corrida: Fartlek Dinâmico", 
          desc: isTapering
            ? "10 min aquecimento + 4x (30 seg forte / 1 min leve) + 10 min corrida de recuperação."
            : `15 min aquecimento + ${Math.min(10, 4 + Math.round(w/2))}x (1 min forte / 1 min leve) + 10 min arrefecimento. Ritmo controlado mas vigoroso.`, 
          zona: "Z3 a Z5" 
        },
        { 
          dia: "Quarta-feira", 
          tipo: "Kettlebell + Yoga", 
          desc: isTapering 
            ? "Mobilidade de Ancas: 10 min de posturas de abertura (Pombo, Guerreiro I) + 10 Kettlebell Goblet Squats lentos para lubrificação articular." 
            : "Resistência Postural: 3 séries de 12 Swings com 1 mão + 10 Lunges alternados com KB + 15 min de Vinyasa Flow dinâmico focando no equilíbrio unilateral.", 
          zona: "Força & Yoga" 
        },
        { 
          dia: "Quinta-feira", 
          tipo: "Corrida de Base Contínua", 
          desc: isTapering
            ? "30 min muito confortáveis em terreno plano para manter as pernas ativas."
            : `45 a 55 min em ritmo puramente aeróbio. Respiração confortável, focado na cadência e relaxamento dos ombros.`, 
          zona: "Z2" 
        },
        { 
          dia: "Sexta-feira", 
          tipo: "Kettlebell + Yoga", 
          desc: isTapering 
            ? "Estabilidade Leve: 2 séries de 30s Prancha Frontal + Alongamento suave de flexores da anca." 
            : "Core & Cadeia Posterior: 3 séries de 12 Swings bilaterais + 8 Single-leg Deadlifts + 30s Prancha KB Drag + Posturas de Yoga para libertar a zona lombar.", 
          zona: "Força & Yoga" 
        },
        { 
          dia: "Fim de Semana", 
          tipo: "Corrida: Treino Longo", 
          desc: isTapering
            ? `Treino Longo de Polimento: ${longDistance} km fáceis para simular o ritmo inicial de prova.`
            : `Grande Longo da Semana: ${longDistance} km em ritmo constante. Treinar hidratação e ingestão de géis a cada 4 km. Foco mental e gestão de esforço.`, 
          zona: "Z2" 
        }
      ]
    };
  }

  // --- DERIVADOS DE PERFORMANCE ---
  const stats = React.useMemo(() => {
    const totalKm = activities.reduce((sum, act) => sum + act.distance, 0);
    const totalMin = activities.reduce((sum, act) => sum + act.duration, 0);
    const completedCount = Object.values(completedWorkouts).filter(Boolean).length;
    
    const estHalfMarathonTime = vo2Max > 0 
      ? Math.round(120 * Math.pow(45 / vo2Max, 1.06)) 
      : 135;

    const formattedHalfTime = `${Math.floor(estHalfMarathonTime / 60)}h ${estHalfMarathonTime % 60}m`;

    return { totalKm: totalKm.toFixed(1), totalMin, completedCount, formattedHalfTime };
  }, [activities, completedWorkouts, vo2Max]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* HEADER PRINCIPAL */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl font-black tracking-wider text-sm flex items-center justify-center">
            RFC
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Run For Cover</h1>
            <p className="text-xs text-slate-400">Rumo à Meia Maratona 2027</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            $VO_2\max$ Est: <strong className="text-emerald-400">{vo2Max}</strong>
          </div>
        </div>
      </header>

      {/* TOAST NOTIFICATION CONTAINER */}
      {toast && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-slate-950 border border-emerald-500/50 rounded-xl p-3 shadow-2xl flex items-center gap-3 animate-fade-in-down">
          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
          <p className="text-sm font-medium text-slate-200">{toast.message}</p>
        </div>
      )}

      {/* DASHBOARD DE RESUMO */}
      <div className="bg-slate-950/50 border-b border-slate-800/80 px-4 py-4 grid grid-cols-3 gap-2">
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-slate-400 font-medium mb-1">Total Km</span>
          <span className="text-xl font-bold text-white">{stats.totalKm} <span className="text-xs font-normal text-slate-500">km</span></span>
        </div>
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-slate-400 font-medium mb-1">Meia Est.</span>
          <span className="text-xl font-bold text-emerald-400">{stats.formattedHalfTime}</span>
        </div>
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-slate-400 font-medium mb-1">Feitos</span>
          <span className="text-xl font-bold text-white">{stats.completedCount} <span className="text-xs font-normal text-slate-500">treinos</span></span>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL (TABS) */}
      <main className="flex-1 overflow-y-auto pb-24 max-w-md mx-auto w-full px-4 pt-4">
        
        {/* TAB 1: PLANO DE TREINOS COM DIAS DA SEMANA PRECISOS */}
        {activeTab === 'plano' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Planilha de Treinos</span>
              </h2>
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-lg">
                <button 
                  onClick={() => setSelectedWeek(prev => Math.max(1, prev - 1))}
                  className="px-2 py-1 hover:bg-slate-800 rounded text-slate-300 font-bold"
                >
                  &larr;
                </button>
                <span className="text-xs font-bold text-slate-200 px-1">Semana {selectedWeek} de 16</span>
                <button 
                  onClick={() => setSelectedWeek(prev => Math.min(16, prev + 1))}
                  className="px-2 py-1 hover:bg-slate-800 rounded text-slate-300 font-bold"
                >
                  &rarr;
                </button>
              </div>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Foco da Semana</h3>
              <p className="text-sm text-slate-300 mt-1 font-semibold">{trainingPlan[selectedWeek]?.foco}</p>
            </div>

            <div className="space-y-3">
              {trainingPlan[selectedWeek]?.treinos.map((workout, idx) => {
                const isDone = completedWorkouts[`${selectedWeek}-${idx}`];
                const isStrength = workout.zona.includes('Força');
                
                return (
                  <div 
                    key={idx} 
                    onClick={() => toggleWorkout(selectedWeek, idx)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isDone 
                        ? 'bg-slate-950/40 border-emerald-500/10 opacity-70' 
                        : isStrength 
                          ? 'bg-slate-950 border-orange-500/20 hover:border-orange-500/40' 
                          : 'bg-slate-950 border-slate-800 hover:border-emerald-500/30'
                    }`}
                  >
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          isStrength ? 'bg-orange-500/10 text-orange-400' : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {workout.dia}
                        </span>
                        <span className="bg-slate-800 px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                          {workout.zona}
                        </span>
                      </div>
                      <h4 className={`font-bold text-sm ${isDone ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                        {workout.tipo}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {workout.desc}
                      </p>
                    </div>

                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                      isDone 
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950' 
                        : isStrength 
                          ? 'border-orange-500/30 bg-slate-900 hover:border-orange-400' 
                          : 'border-slate-700 bg-slate-900 hover:border-emerald-400'
                    }`}>
                      {isDone && (
                        <svg className="w-4 h-4 font-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: HISTÓRICO DE PROGRESSO */}
        {activeTab === 'progresso' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Registo de Atividades</h2>

            {/* Caixa de Importação de CSV */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div>
                <h3 className="font-bold text-sm text-slate-200">Importar Dados do Strava</h3>
                <p className="text-xs text-slate-400 mt-1">Carrega o teu ficheiro CSV de atividades do Strava para atualizar instantaneamente o teu histórico.</p>
              </div>
              <label className="flex items-center justify-center w-full h-24 border-2 border-slate-800 border-dashed rounded-xl cursor-pointer hover:border-slate-600 hover:bg-slate-900/50 transition">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <p className="text-xs text-slate-400 font-semibold">Clica para selecionar o ficheiro CSV</p>
                </div>
                <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
              </label>
            </div>

            {/* Listagem de Atividades Recentes */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Treinos Recentes</h3>
              {activities.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Nenhum treino registado ainda. Começa por importar o teu CSV!</p>
              ) : (
                activities.map(act => (
                  <div key={act.id} className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-slate-300">
                        🏃
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-200">{act.type}</h4>
                        <p className="text-[10px] text-slate-500 font-mono">{act.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-white">{act.distance} km</div>
                      <div className="text-xs text-slate-400">{act.duration} min</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: COACH INTELIGENTE */}
        {activeTab === 'coach' && (
          <div className="flex flex-col h-[calc(100vh-13.5rem)] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            {/* Header do Chat */}
            <div className="bg-slate-900/60 border-b border-slate-800 px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 text-sm font-bold">
                🤖
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Treinador Inteligente</h3>
                <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Especialista de Fisiologia Online
                </p>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none' 
                      : 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-800'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-3 max-w-[80%]">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input do Chat */}
            <form onSubmit={handleSendMessage} className="border-t border-slate-800 p-3 bg-slate-900/40 flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                placeholder="Pergunta sobre o plano, zonas ou Kettlebell..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-slate-200 placeholder-slate-500"
              />
              <button 
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 rounded-xl text-sm transition"
              >
                Enviar
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: SINCRONIZAÇÃO DE DISPOSITIVOS */}
        {activeTab === 'sync' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Sincronização de Saúde</h2>
            <p className="text-xs text-slate-400">Liga as tuas contas para importar as tuas corridas em tempo real de forma segura e sem fios.</p>

            <div className="space-y-3">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-600/10 text-orange-500 flex items-center justify-center font-bold text-lg">
                    S
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-200">Strava</h3>
                    <p className="text-[10px] text-slate-500">Ligação oficial via API de atividades</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeviceSync('Strava')}
                  className="bg-slate-900 border border-slate-700 hover:border-emerald-500 hover:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 transition"
                >
                  Sincronizar
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-500 flex items-center justify-center font-bold text-lg animate-pulse">
                    G
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-200">Google Fit</h3>
                    <p className="text-[10px] text-slate-500">Sincronização de passos e batimentos</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeviceSync('Google Fit')}
                  className="bg-slate-900 border border-slate-700 hover:border-emerald-500 hover:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 transition"
                >
                  Ligar
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-600/10 text-cyan-400 flex items-center justify-center font-bold text-lg">
                    S
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-200">Samsung Health</h3>
                    <p className="text-[10px] text-slate-500">Importação de dados de wearables</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeviceSync('Samsung Health')}
                  className="bg-slate-900 border border-slate-700 hover:border-emerald-500 hover:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 transition"
                >
                  Ligar
                </button>
              </div>
            </div>

            {/* Ajustes de Configuração do Atleta */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="font-bold text-sm text-slate-200">Ajustes Biométricos</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-slate-400">Peso Corporal (kg)</label>
                  <input 
                    type="number" 
                    value={weight} 
                    onChange={e => {
                      const w = parseFloat(e.target.value);
                      setWeight(w);
                      localStorage.setItem('rfc_weight', w);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-slate-400">Frequência Cardíaca Repouso</label>
                  <input 
                    type="number" 
                    defaultValue={55}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* BARRA DE NAVEGAÇÃO INFERIOR RESPONSIVA */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-4 py-2 z-50">
        <div className="max-w-md mx-auto flex items-center justify-around gap-1">
          <button 
            onClick={() => setActiveTab('plano')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-2.5 rounded-xl transition ${
              activeTab === 'plano' ? 'text-emerald-400 bg-slate-900/60' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-lg">📋</span>
            <span className="text-[10px] mt-0.5 font-semibold">Planilha</span>
          </button>

          <button 
            onClick={() => setActiveTab('progresso')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-2.5 rounded-xl transition ${
              activeTab === 'progresso' ? 'text-emerald-400 bg-slate-900/60' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-lg">📈</span>
            <span className="text-[10px] mt-0.5 font-semibold">Progresso</span>
          </button>

          <button 
            onClick={() => setActiveTab('coach')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-2.5 rounded-xl transition ${
              activeTab === 'coach' ? 'text-emerald-400 bg-slate-900/60' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-lg">🤖</span>
            <span className="text-[10px] mt-0.5 font-semibold">Coach</span>
          </button>

          <button 
            onClick={() => setActiveTab('sync')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-2.5 rounded-xl transition ${
              activeTab === 'sync' ? 'text-emerald-400 bg-slate-900/60' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-lg">🔄</span>
            <span className="text-[10px] mt-0.5 font-semibold">Sincronizar</span>
          </button>
        </div>
      </nav>

    </div>
  );
}
