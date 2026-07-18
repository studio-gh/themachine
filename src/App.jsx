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
  
  // --- ESTADO DE INTEGRAÇÕES DE SAÚDE ---
  const [connectedServices, setConnectedServices] = useState({
    strava: false,
    googleFit: false,
    samsungHealth: false
  });
  const [authModal, setAuthModal] = useState(null); // 'strava' | 'googleFit' | 'samsungHealth' | null
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  // --- ESTADO DO COACH IA ---
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Olá! Sou o seu treinador virtual de corrida e fortalecimento. Reorganizei sua planilha com sua rotina exata: Segundas, Quartas e Sextas com Kettlebell + Yoga; Terças, Quintas e Finais de Semana dedicados à corrida em Zona 2 e Fartleks. Como posso te ajudar a evoluir hoje?'
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
    const savedServices = localStorage.getItem('rfc_connected_services');

    if (savedWorkouts) setCompletedWorkouts(JSON.parse(savedWorkouts));
    if (savedWeight) setWeight(JSON.parse(savedWeight));
    if (savedVo2) setVo2Max(JSON.parse(savedVo2));
    if (savedServices) setConnectedServices(JSON.parse(savedServices));
    
    if (savedActivities) {
      setActivities(JSON.parse(savedActivities));
    } else {
      // Atividades iniciais de demonstração baseadas no seu Strava
      const mockActivities = [
        { id: 1, date: '2026-07-15', distance: 8.5, duration: 45, type: 'Fartlek', hrAvg: 155, vo2: 49.2 },
        { id: 2, date: '2026-07-13', distance: 12.0, duration: 72, type: 'Longe Aeróbio', hrAvg: 142, vo2: 48.1 },
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
    showToast(updated[key] ? 'Treino marcado como concluído!' : 'Treino marcado como pendente.');
  };

  // --- CÁLCULOS DE FISIOLOGIA ESPORTIVA (JACK DANIELS & ACSM) ---
  const calculateVO2Max = (distance, durationMinutes) => {
    const speedMps = (distance * 1000) / (durationMinutes * 60);
    const estimatedVo2 = (speedMps * 0.2) + (speedMps * 0.9 * 0.15) + 3.5; 
    return parseFloat(estimatedVo2.toFixed(1));
  };

  // --- LEITOR E IMPORTADOR DE CSV (ESTRUTURA STRAVA ROBUSTA) ---
  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        // Suporta tanto quebra de linha normal quanto retorno de carro do Windows
        const rows = text.split(/\r?\n/);
        if (rows.length < 2) throw new Error('O arquivo parece estar vazio.');

        // Suporta separador por vírgula ou ponto e vírgula comuns em CSVs brasileiros
        const delimiter = rows[0].includes(';') ? ';' : ',';
        const headers = rows[0].split(delimiter).map(h => h.trim().replace(/"/g, '').toLowerCase());
        const parsedActivities = [];

        const distIdx = headers.findIndex(h => h.includes('dist') || h.includes('distance'));
        const durIdx = headers.findIndex(h => h.includes('time') || h.includes('elapsed') || h.includes('duration'));
        const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('timestamp'));
        const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('name'));

        for (let i = 1; i < rows.length; i++) {
          if (!rows[i].trim()) continue;
          const cols = rows[i].split(delimiter).map(c => c.trim().replace(/"/g, ''));
          
          const rawDist = parseFloat(cols[distIdx]);
          const rawDur = parseFloat(cols[durIdx]);
          
          if (!isNaN(rawDist) && !isNaN(rawDur)) {
            // Conversão de distância (se estiver em metros vindo da API crua do Strava)
            const distanceKm = rawDist > 100 ? rawDist / 1000 : rawDist;
            // Conversão de tempo (se estiver em segundos)
            const durationMin = rawDur > 200 ? rawDur / 60 : rawDur;
            const dateStr = dateIdx !== -1 ? cols[dateIdx] : new Date().toISOString().split('T')[0];
            const typeStr = typeIdx !== -1 ? cols[typeIdx] : 'Corrida';
            const estimatedVo2 = calculateVO2Max(distanceKm, durationMin);

            parsedActivities.push({
              id: Date.now() + i,
              date: dateStr,
              distance: parseFloat(distanceKm.toFixed(2)),
              duration: Math.round(durationMin),
              type: typeStr.toLowerCase().includes('fartlek') ? 'Fartlek' : (distanceKm >= 10 ? 'Treino Longo' : 'Corrida Base'),
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

          showToast(`Sucesso! ${parsedActivities.length} atividades importadas do seu arquivo do Strava.`);
        } else {
          showToast('Nenhum dado válido de corrida detectado no CSV.', 'error');
        }
      } catch (err) {
        showToast('Erro ao ler o arquivo CSV. Verifique a formatação.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // --- LOGIC DE CONEXÃO E AUTORIZAÇÃO (OAUTH SIMULADA) ---
  const openAuthModal = (provider) => {
    setAuthModal(provider);
  };

  const handleAuthorize = () => {
    setIsAuthorizing(true);
    setTimeout(() => {
      const updated = { ...connectedServices, [authModal]: true };
      setConnectedServices(updated);
      localStorage.setItem('rfc_connected_services', JSON.stringify(updated));
      setIsAuthorizing(false);
      setAuthModal(null);
      showToast(`Conexão com o ${authModal.charAt(0).toUpperCase() + authModal.slice(1)} autorizada com sucesso!`);
    }, 1800);
  };

  const handleDisconnect = (provider) => {
    const updated = { ...connectedServices, [provider]: false };
    setConnectedServices(updated);
    localStorage.setItem('rfc_connected_services', JSON.stringify(updated));
    showToast(`Desconectado do ${provider.charAt(0).toUpperCase() + provider.slice(1)}.`);
  };

  // Sincroniza dados com base nas conexões ativas
  const triggerServiceSync = (provider) => {
    if (!connectedServices[provider]) {
      openAuthModal(provider);
      return;
    }

    showToast(`Buscando novas atividades no ${provider.charAt(0).toUpperCase() + provider.slice(1)}...`, 'info');
    
    setTimeout(() => {
      // Cria uma atividade realista baseada no dia da semana atual
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0: Domingo, 1: Segunda...
      
      let type = "Corrida Base";
      let distance = 6.0;
      let duration = 33;
      
      if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
        type = "Kettlebell + Yoga";
        distance = 0; // Atividade de força/mobilidade
        duration = 45;
      } else if (dayOfWeek === 2) {
        type = "Fartlek Dinâmico";
        distance = 8.0;
        duration = 42;
      } else if (dayOfWeek === 0 || dayOfWeek === 6) {
        type = "Treino Longo";
        distance = 14.0;
        duration = 80;
      }

      const newAct = {
        id: Date.now(),
        date: today.toISOString().split('T')[0],
        distance: distance,
        duration: duration,
        type: type,
        hrAvg: distance > 0 ? Math.round(135 + Math.random() * 20) : 110,
        vo2: distance > 0 ? calculateVO2Max(distance, duration) : vo2Max
      };

      const updated = [newAct, ...activities];
      setActivities(updated);
      localStorage.setItem('rfc_activities', JSON.stringify(updated));

      if (newAct.vo2 > vo2Max && distance > 0) {
        setVo2Max(newAct.vo2);
        localStorage.setItem('rfc_vo2max', newAct.vo2);
      }

      showToast(`Sincronização completa! Novo treino de "${type}" importado.`);
    }, 1500);
  };

  // --- CHAT COM COACH INTELIGENTE (INTEGRAÇÃO GEMINI COM RETRIES) ---
  const callCoachAPI = async (userPrompt) => {
    const systemPrompt = `Você é o treinador virtual do aplicativo "Run For Cover" especialista em corrida, treino de força (Kettlebell) e Yoga. O atleta está se preparando para uma Meia Maratona em 2027. O peso atual dele é de ${weight} kg e o VO2 Max estimado é de ${vo2Max} ml/kg/min.
    Utilize suas bases científicas em suas respostas:
    1. O estudo sobre Fartlek de Andres (2024) para explicar treinos de ritmo de terça-feira.
    2. A dissertação de Guilherme (2004) para enfatizar o desenvolvimento aeróbico nas corridas de quinta-feira e fim de semana.
    3. Os benefícios comprovados do treino de força e Kettlebell integrado com Yoga (segundas, quartas e sextas) na melhoria da economia de corrida, estabilização da bacia e redução do risco de lesões.
    Responda sempre em Português do Brasil (PT-BR) de forma motivadora, amigável e em pequenos tópicos para facilitar a leitura no celular.`;

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
    if (e) e.preventDefault();
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
        content: 'Desculpe, nosso servidor do Treinador IA está sobrecarregado no momento. Verifique sua conexão com a internet e tente mandar outra pergunta em breve!' 
      }]);
    } finally {
      setIsTyping(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  // --- PLANO DE TREINOS DE 16 SEMANAS TOTALMENTE EM PORTUGUÊS BRASILEIRO ---
  const trainingPlan = {};

  // Geração das 16 Semanas respeitando os dias exatos solicitados
  for (let w = 1; w <= 16; w++) {
    const isTapering = w >= 15;
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
            ? "10 min aquecimento + 4x (30 seg forte / 1 min leve) + 10 min de desaquecimento leve."
            : `15 min aquecimento + ${Math.min(10, 4 + Math.round(w/2))}x (1 min forte / 1 min leve) + 10 min de desaquecimento. Ritmo controlado mas vigoroso.`, 
          zona: "Z3 a Z5" 
        },
        { 
          dia: "Quarta-feira", 
          tipo: "Kettlebell + Yoga", 
          desc: isTapering 
            ? "Mobilidade de Quadril: 10 min de posturas de abertura (Pombo, Guerreiro I) + 10 Kettlebell Goblet Squats lentos para lubrificação articular." 
            : "Resistência Postural: 3 séries de 12 Swings com 1 mão + 10 Lunges alternados com KB + 15 min de Vinyasa Flow focado no equilíbrio unilateral.", 
          zona: "Força & Yoga" 
        },
        { 
          dia: "Quinta-feira", 
          tipo: "Corrida de Base Contínua", 
          desc: isTapering
            ? "30 min muito confortáveis em terreno plano para manter as pernas ativas."
            : `45 a 55 min em ritmo puramente aeróbico. Respiração confortável, focado na cadência e relaxamento dos ombros.`, 
          zona: "Z2" 
        },
        { 
          dia: "Sexta-feira", 
          tipo: "Kettlebell + Yoga", 
          desc: isTapering 
            ? "Estabilidade Leve: 2 séries de 30s Prancha Frontal + Alongamento suave de flexores de quadril." 
            : "Core & Cadeia Posterior: 3 séries de 12 Swings bilaterais + 8 Single-leg Deadlifts + 30s Prancha KB Drag + Posturas de Yoga para liberar a região lombar.", 
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row font-sans overflow-x-hidden antialiased">
      
      {/* 1. BARRA LATERAL (SIDEBAR DE NAVEGAÇÃO - APENAS NO DESKTOP) */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-950 border-r border-slate-800/80 p-6 space-y-8 flex-shrink-0">
        {/* Brand/Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 text-slate-950 px-3 py-2 rounded-xl font-black tracking-wider text-lg flex items-center justify-center shadow-lg shadow-emerald-500/10">
            RFC
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white leading-none">Run For Cover</h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-semibold">Meia Maratona 2027</p>
          </div>
        </div>

        {/* Mini Biometria lateral */}
        <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800/50 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Peso Corporal</span>
            <span className="font-bold text-white">{weight} kg</span>
          </div>
          <div className="h-[1px] bg-slate-800/50"></div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Métrica $VO_2\max$</span>
            <span className="font-bold text-emerald-400">{vo2Max} ml/kg</span>
          </div>
          <div className="h-[1px] bg-slate-800/50"></div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Meia Estimativa</span>
            <span className="font-bold text-emerald-400">{stats.formattedHalfTime}</span>
          </div>
        </div>

        {/* Menu de Navegação Desktop */}
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
            onClick={() => setActiveTab('progresso')}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'progresso' 
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <span className="text-lg">📈</span>
            <span>Registro de Progresso</span>
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
            <span>Treinador Inteligente</span>
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
            <span>Sincronização</span>
          </button>
        </nav>

        {/* Footer da Sidebar */}
        <div className="pt-4 border-t border-slate-800/60 text-center">
          <p className="text-[10px] text-slate-500 font-mono">Run For Cover v2.2 (Build BR)</p>
        </div>
      </aside>

      {/* 2. ÁREA DE CONTEÚDO PRINCIPAL (MÓVEL & DESKTOP) */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900 overflow-y-auto">
        
        {/* HEADER PARA MÓVEL (Oculto no Desktop) */}
        <header className="md:hidden bg-slate-950 border-b border-slate-800 sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl font-black tracking-wider text-sm flex items-center justify-center">
              RFC
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">Run For Cover</h1>
              <p className="text-xs text-slate-400">Rumo à Meia Maratona 2027</p>
            </div>
          </div>

          <div className="bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            $VO_2\max$: <strong className="text-emerald-400">{vo2Max}</strong>
          </div>
        </header>

        {/* TOAST DE NOTIFICAÇÃO COMPACTO */}
        {toast && (
          <div className="fixed top-16 md:top-6 right-4 left-4 md:left-auto md:w-96 z-50 bg-slate-950 border border-emerald-500/50 rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-fade-in-down">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <p className="text-sm font-medium text-slate-200">{toast.message}</p>
          </div>
        )}

        {/* MODAL DE CONEXÃO OAUTH (STRAVA, GOOGLE FIT, SAMSUNG HEALTH) */}
        {authModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="p-6 space-y-6">
                
                {/* Header do Provedor */}
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl ${
                    authModal === 'strava' ? 'bg-orange-600' : authModal === 'googleFit' ? 'bg-blue-600' : 'bg-cyan-500'
                  }`}>
                    {authModal === 'strava' ? 'S' : authModal === 'googleFit' ? 'G' : 'S'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-white">
                      Conectar ao {authModal === 'strava' ? 'Strava' : authModal === 'googleFit' ? 'Google Fit' : 'Samsung Health'}
                    </h3>
                    <p className="text-xs text-slate-400">Solicitação de autorização segura</p>
                  </div>
                </div>

                {/* Descrição das Permissões */}
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-3">
                  <p className="text-xs text-slate-300 font-semibold uppercase tracking-wider">Permissões solicitadas:</p>
                  <ul className="text-xs text-slate-400 space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span> Visualizar dados de perfil público
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span> Importar histórico de treinos e rotinas
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span> Sincronizar dados de batimento e $VO_2\max$
                    </li>
                  </ul>
                </div>

                {/* Detalhes de Segurança */}
                <p className="text-[10px] text-slate-500 leading-relaxed text-center">
                  O aplicativo <strong className="text-slate-400">Run For Cover</strong> cumpre todas as diretrizes da LGPD. Seus dados biométricos são processados exclusivamente no seu dispositivo local.
                </p>

                {/* Botões de Ação */}
                <div className="flex gap-3">
                  <button 
                    onClick={() => setAuthModal(null)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-2xl text-xs font-bold transition"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleAuthorize}
                    disabled={isAuthorizing}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2"
                  >
                    {isAuthorizing ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                        Autorizando...
                      </>
                    ) : 'Autorizar'}
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* DASHBOARD DE RESUMO SUPERIOR */}
        <section className="bg-slate-950/40 border-b border-slate-800/60 px-6 py-6">
          <div className="max-w-6xl mx-auto">
            <div className="hidden md:flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black text-white">Painel do Atleta</h2>
                <p className="text-xs text-slate-400">Acompanhe seu rendimento, planos de força e corrida aeróbica.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">Meta Principal:</span>
                <span className="bg-emerald-500/10 text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-bold border border-emerald-500/25">
                  Meia Maratona 2027 (21.097 km)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-4xl">
              <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-2xl hover:border-emerald-500/20 transition-all flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-xl hidden sm:block">🏃</div>
                <div>
                  <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Total Rodado</span>
                  <span className="text-xl md:text-2xl font-black text-white">{stats.totalKm} <span className="text-xs font-normal text-slate-500">km</span></span>
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-2xl hover:border-emerald-500/20 transition-all flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-xl hidden sm:block">⏱️</div>
                <div>
                  <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Previsão Meia</span>
                  <span className="text-xl md:text-2xl font-black text-emerald-400">{stats.formattedHalfTime}</span>
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-2xl hover:border-emerald-500/20 transition-all flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-xl hidden sm:block">✅</div>
                <div>
                  <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Concluídos</span>
                  <span className="text-xl md:text-2xl font-black text-white">{stats.completedCount} <span className="text-xs font-normal text-slate-500">treinos</span></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTAINER DE CONTEÚDO DINÂMICO */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-6 pb-28 md:pb-12">
          
          {/* TAB 1: PLANILHA DE TREINOS */}
          {activeTab === 'plano' && (
            <div className="space-y-6">
              
              {/* Seletor Superior de Semanas */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-extrabold text-white">Cronograma Fisiológico</h3>
                  <p className="text-xs text-slate-400 mt-1">Garante a distribuição correta entre fortalecimento muscular e zonas de corrida aeróbica.</p>
                </div>
                
                {/* Seletor de Semanas para Desktop */}
                <div className="bg-slate-950 border border-slate-800 p-2 rounded-2xl flex flex-wrap gap-1 items-center max-w-full overflow-x-auto">
                  <span className="text-[10px] font-bold text-slate-500 px-2 uppercase">Semanas</span>
                  {[...Array(16)].map((_, i) => {
                    const w = i + 1;
                    return (
                      <button
                        key={w}
                        onClick={() => setSelectedWeek(w)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                          selectedWeek === w
                            ? 'bg-emerald-500 text-slate-950'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        {w}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Informação sobre o Foco da Semana Ativa */}
              <div className="bg-gradient-to-r from-emerald-950/30 to-slate-950 border border-emerald-500/20 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Foco de Adaptação da Semana {selectedWeek}</h3>
                  <p className="text-base md:text-lg font-black text-white">{trainingPlan[selectedWeek]?.foco}</p>
                </div>
                <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-4 py-2 rounded-xl text-xs font-bold font-mono">
                  Z2 & Z3 Desenvolvimento de Base
                </div>
              </div>

              {/* GRELHA DE TREINOS RESPONSIVA */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trainingPlan[selectedWeek]?.treinos.map((workout, idx) => {
                  const isDone = completedWorkouts[`${selectedWeek}-${idx}`];
                  const isStrength = workout.zona.includes('Força');
                  
                  return (
                    <div 
                      key={idx} 
                      onClick={() => toggleWorkout(selectedWeek, idx)}
                      className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-4 h-full relative ${
                        isDone 
                          ? 'bg-slate-950/40 border-emerald-500/10 opacity-75' 
                          : isStrength 
                            ? 'bg-slate-950/90 border-orange-500/15 hover:border-orange-500/30 shadow-md shadow-orange-500/[0.02]' 
                            : 'bg-slate-950/90 border-slate-800/80 hover:border-emerald-500/20 shadow-md shadow-emerald-500/[0.01]'
                      }`}
                    >
                      {/* Dia e Zona de Esforço */}
                      <div className="flex items-center justify-between w-full">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          isStrength ? 'bg-orange-500/10 text-orange-400' : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {workout.dia}
                        </span>
                        <span className="bg-slate-800/80 px-2.5 py-1 rounded-md text-[10px] font-bold text-slate-300 font-mono">
                          {workout.zona}
                        </span>
                      </div>

                      {/* Descrição do Treino */}
                      <div className="space-y-1.5 flex-1 mt-2">
                        <h4 className={`font-black text-sm md:text-base leading-tight ${isDone ? 'line-through text-slate-500' : 'text-white'}`}>
                          {workout.tipo}
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">
                          {workout.desc}
                        </p>
                      </div>

                      {/* Botão de Conclusão de Treino */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-900">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                          Status: {isDone ? 'Concluído' : 'Pendente'}
                        </span>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                          isDone 
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20' 
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
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP SPLIT VIEW: Treinador IA Flutuante na Planilha */}
              <div className="hidden lg:block bg-slate-950 border border-slate-800 p-6 rounded-3xl mt-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-4 space-y-4">
                    <h3 className="text-lg font-black text-white">Consulte seu Treinador</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Dúvidas sobre a execução dos Swings ou sobre a cadência ideal no Fartlek de terça? Pergunte direto ao seu Treinador IA focado em fisiologia do esporte.
                    </p>
                    <button 
                      onClick={() => setActiveTab('coach')} 
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2.5 rounded-xl font-bold text-xs tracking-wider transition"
                    >
                      Abrir Chat Completo
                    </button>
                  </div>
                  <div className="lg:col-span-8 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 h-48 flex flex-col justify-between">
                    <p className="text-xs text-slate-300 italic">"Conectar treinos de Kettlebell e Yoga nas segundas, quartas e sextas ajuda na ativação estabilizadora de pelve e reabilitação de isquiotibiais, prevenindo lesões nos longos."</p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Ex: Como executar corretamente o Kettlebell RDL?"
                        value={inputMessage}
                        onChange={e => setInputMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200"
                      />
                      <button onClick={() => handleSendMessage()} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 rounded-xl text-xs font-bold">Enviar</button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: REGISTRO DE PROGRESSO */}
          {activeTab === 'progresso' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Esquerda: Upload de CSV */}
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <h2 className="text-xl font-black text-white">Importar Planilha Strava</h2>
                  <p className="text-xs text-slate-400 mt-1">Carregue arquivos CSV exportados do seu Strava para calcular seu $VO_2\max$ de corrida.</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-sm text-slate-200">Selecione o Arquivo CSV</h3>
                    <p className="text-xs text-slate-500">Sua planilha do Strava contendo as colunas de distância e tempo.</p>
                  </div>
                  <label className="flex items-center justify-center w-full h-40 border-2 border-slate-800 border-dashed rounded-xl cursor-pointer hover:border-slate-600 hover:bg-slate-900/40 transition">
                    <div className="flex flex-col items-center justify-center text-center p-4">
                      <span className="text-4xl mb-2">📁</span>
                      <p className="text-xs text-slate-300 font-bold">Clique aqui para importar o CSV</p>
                      <p className="text-[10px] text-slate-500 mt-1">ou arraste o arquivo para esta área</p>
                    </div>
                    <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                  </label>
                </div>
              </div>

              {/* Direita: Histórico de Treinos */}
              <div className="lg:col-span-7 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest">Corridas Importadas</h3>
                
                {activities.length === 0 ? (
                  <div className="bg-slate-950/60 border border-slate-800 p-8 rounded-2xl text-center text-slate-500 text-xs">
                    Nenhum registro de corrida encontrado. Importe seu CSV ou conecte seus aplicativos na aba Sincronização.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                    {activities.map(act => (
                      <div key={act.id} className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between gap-4 hover:border-slate-700 transition">
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-lg">
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
          )}

          {/* TAB 3: COACH INTELIGENTE */}
          {activeTab === 'coach' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-16rem)] lg:h-[600px]">
              
              {/* Esquerda: Informações científicas de suporte */}
              <div className="hidden lg:flex lg:col-span-4 flex-col justify-between bg-slate-950 border border-slate-800/80 p-6 rounded-3xl">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-white">Manual Científico</h3>
                    <p className="text-xs text-slate-400 mt-1">Seu Treinador IA se baseia em literatura esportiva atualizada:</p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                      <h4 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider mb-1">Método Fartlek (Andres, 2024)</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">Foco em potência aeróbica, variação de limiar de lactato e dinâmica de corrida.</p>
                    </div>

                    <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                      <h4 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider mb-1">Evolução de Base (Guilherme, 2004)</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">Construção capilar muscular e vascularização mitocondrial em Zona 2 confortável.</p>
                    </div>

                    <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                      <h4 className="text-xs font-extrabold text-orange-400 uppercase tracking-wider mb-1">Força Estabilizadora</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">Kettlebell swings e isometrias de Yoga para prevenir lesões e estresse no quadril.</p>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-mono border-t border-slate-900 pt-3">
                  Modelo Ativo: Gemini 2.5 Flash
                </div>
              </div>

              {/* Direita: Chat */}
              <div className="lg:col-span-8 flex flex-col bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden h-full">
                {/* Cabeçalho do Chat */}
                <div className="bg-slate-900/60 border-b border-slate-800/80 px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 text-lg font-bold shadow-md shadow-emerald-500/10">
                      🤖
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-white">Treinador Inteligente</h3>
                      <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Zonas de Esforço & Kettlebell Actives
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mensagens do Chat */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl p-4 text-xs md:text-sm leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-emerald-500 text-slate-950 font-bold rounded-tr-none shadow-md shadow-emerald-500/5' 
                          : 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-800'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-4 max-w-[80%]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Formulário de Envio */}
                <form onSubmit={handleSendMessage} className="border-t border-slate-800 p-4 bg-slate-900/40 flex gap-3">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={e => setInputMessage(e.target.value)}
                    placeholder="Faça uma pergunta sobre o plano, zonas ou execuções..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-emerald-500 text-slate-200 placeholder-slate-500"
                  />
                  <button 
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 rounded-2xl text-xs uppercase tracking-wider transition"
                  >
                    Enviar
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* TAB 4: SINCRONIZAÇÃO DE DISPOSITIVOS & BIOMETRIA */}
          {activeTab === 'sync' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Esquerda: Apps Conectadas */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <h2 className="text-xl font-black text-white">Sincronização de Saúde</h2>
                  <p className="text-xs text-slate-400 mt-1">Conecte seus aplicativos favoritos. Nossa integração de fluxo seguro atualiza seus dados de atividade automaticamente.</p>
                </div>

                <div className="space-y-3">
                  
                  {/* Strava */}
                  <div className="bg-slate-950 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl text-white flex items-center justify-center font-black text-xl ${
                        connectedServices.strava ? 'bg-orange-600 shadow-md shadow-orange-600/25' : 'bg-orange-600/20 text-orange-500'
                      }`}>
                        S
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm text-slate-200">Strava</h3>
                          {connectedServices.strava && (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded-full font-bold">Conectado</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">API Oficial de Atividades de Corrida</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {connectedServices.strava ? (
                        <>
                          <button 
                            onClick={() => triggerServiceSync('strava')}
                            className="bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 transition"
                          >
                            Sincronizar
                          </button>
                          <button 
                            onClick={() => handleDisconnect('strava')}
                            className="bg-slate-900 border border-red-500/30 hover:border-red-500 hover:bg-red-950/20 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 transition"
                          >
                            Desconectar
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => openAuthModal('strava')}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition"
                        >
                          Conectar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Google Fit */}
                  <div className="bg-slate-950 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl text-white flex items-center justify-center font-black text-xl ${
                        connectedServices.googleFit ? 'bg-blue-600 shadow-md shadow-blue-600/25' : 'bg-blue-600/20 text-blue-500'
                      }`}>
                        G
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm text-slate-200">Google Fit</h3>
                          {connectedServices.googleFit && (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded-full font-bold">Conectado</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">Dados de batimentos cardíacos e passos diários</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {connectedServices.googleFit ? (
                        <>
                          <button 
                            onClick={() => triggerServiceSync('googleFit')}
                            className="bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 transition"
                          >
                            Sincronizar
                          </button>
                          <button 
                            onClick={() => handleDisconnect('googleFit')}
                            className="bg-slate-900 border border-red-500/30 hover:border-red-500 hover:bg-red-950/20 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 transition"
                          >
                            Desconectar
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => openAuthModal('googleFit')}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition"
                        >
                          Conectar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Samsung Health */}
                  <div className="bg-slate-950 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl text-white flex items-center justify-center font-black text-xl ${
                        connectedServices.samsungHealth ? 'bg-cyan-500 shadow-md shadow-cyan-500/25' : 'bg-cyan-500/20 text-cyan-400'
                      }`}>
                        S
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm text-slate-200">Samsung Health</h3>
                          {connectedServices.samsungHealth && (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded-full font-bold">Conectado</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">Métricas de sono, peso e treinos de wearables</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {connectedServices.samsungHealth ? (
                        <>
                          <button 
                            onClick={() => triggerServiceSync('samsungHealth')}
                            className="bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 transition"
                          >
                            Sincronizar
                          </button>
                          <button 
                            onClick={() => handleDisconnect('samsungHealth')}
                            className="bg-slate-900 border border-red-500/30 hover:border-red-500 hover:bg-red-950/20 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 transition"
                          >
                            Desconectar
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => openAuthModal('samsungHealth')}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition"
                        >
                          Conectar
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Direita: Configurações Biométricas */}
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <h2 className="text-xl font-black text-white">Ajustes Biométricos</h2>
                  <p className="text-xs text-slate-400 mt-1">Configurações para otimização dos cálculos de performance e economia de corrida.</p>
                </div>

                <div className="bg-slate-950 border border-slate-800/80 p-6 rounded-2xl space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Peso Corporal (kg)</label>
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

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Frequência Cardíaca de Repouso (bpm)</label>
                    <input 
                      type="number" 
                      defaultValue={55}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                    <h4 className="text-xs font-bold text-slate-200 mb-1 font-sans">Por que o peso é importante?</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      O consumo máximo de oxigênio ($VO_2\max$) é expresso em relação ao peso corporal ($ml/kg/min$). Manter seu peso atualizado garante a precisão de suas métricas aeróbicas.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

        </main>

        {/* 3. BARRA DE NAVEGAÇÃO INFERIOR PARA DISPOSITIVOS MÓVEIS (Oculta no Desktop) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-4 py-2 z-50">
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

    </div>
  );
}
