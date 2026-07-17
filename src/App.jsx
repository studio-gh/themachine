import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot } from 'firebase/firestore';
import { 
  Calendar, 
  TrendingUp, 
  Smartphone, 
  BookOpen, 
  User, 
  Upload, 
  CheckCircle, 
  Clock, 
  Activity, 
  Award, 
  Heart, 
  Info, 
  Sparkles, 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw,
  Check,
  Send,
  Loader2,
  Bot,
  HelpCircle,
  AlertCircle
} from 'lucide-react';

// === CONFIGURAÇÃO DO FIREBASE (SISTEMA DE ARMAZENAMENTO DINÂMICO) ===
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : { apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Higienização do appId para evitar que barras quebrem a estrutura de caminhos do Firestore (Regra de Segmentos Pares)
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'the-machine-21k';
const appId = rawAppId.replace(/\//g, '_');

// Auxiliar para formatar pace (segundos por km -> MM:SS)
const formatPace = (totalSeconds) => {
  if (!totalSeconds || isNaN(totalSeconds)) return "--:--";
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Auxiliar para converter MM:SS em segundos
const parsePaceToSeconds = (paceStr) => {
  if (!paceStr) return 360; // Padrão: 6:00 min/km
  const parts = paceStr.split(':');
  if (parts.length === 1) return parseInt(parts[0], 10) * 60;
  return (parseInt(parts[0], 10) * 60) + (parseInt(parts[1], 10) || 0);
};

// Obter a data atual do telemóvel formatada (AAAA-MM-DD) para controlo dos hábitos diários
const getTodayDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
};

// Ícones Customizados SVG para garantir visual premium sem pacotes externos extra
const KettlebellIcon = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2a4 4 0 0 0-4 4v3h8V6a4 4 0 0 0-4-4z" />
    <path d="M6 10a6 6 0 0 0-1 3.3c0 4.8 3.1 8.7 7 8.7s7-3.9 7-8.7c0-1.2-.4-2.3-1-3.3H6z" />
    <circle cx="12" cy="15" r="2" fill="currentColor" />
  </svg>
);

const ToddlerIcon = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="6" r="3" />
    <path d="M6 14h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-4h-2v4a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2z" />
    <circle cx="12" cy="16" r="1.5" fill="currentColor" />
  </svg>
);

const YogaIcon = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2a3 3 0 1 0 0 6 3 3 0 1 0 0-6z" />
    <path d="M12 10v6" />
    <path d="M7 12c2.5-1 7.5-1 10 0" />
    <path d="M5 21a7 7 0 0 1 14 0" />
  </svg>
);

export default function App() {
  // === ESTADOS DO UTILIZADOR E FLUXOS ===
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('plan'); // 'plan' | 'strength' | 'ai_coach' | 'dashboard' | 'sync' | 'science' | 'profile'
  const [basePaceStr, setBasePaceStr] = useState('06:00'); // Ritmo base de conforto do corredor
  const [currentWeek, setCurrentWeek] = useState(1);
  const [currentPhase, setCurrentPhase] = useState(1); // 1, 2, 3 ou 4
  const [expandedWeek, setExpandedWeek] = useState(1);
  const [completedWorkouts, setCompletedWorkouts] = useState({});
  const [completedStrength, setCompletedStrength] = useState({});
  const [completedYogaLog, setCompletedYogaLog] = useState({}); // { 'AAAA-MM-DD': true }
  const [parsedRuns, setParsedRuns] = useState([]);
  const [csvStats, setCsvStats] = useState(null);
  const [csvRecentStats, setCsvRecentStats] = useState(null); // Atividades dos últimos 6 meses
  const [syncStatus, setSyncStatus] = useState({
    strava: false,
    googleFit: false,
    samsungHealth: false
  });
  
  // Chaveador de estilo de treino de força (Kettlebell vs Peso Corporal/Calistenia)
  const [strengthMode, setStrengthMode] = useState('kettlebell'); 

  // Modais de registo de atividade
  const [modalWorkout, setModalWorkout] = useState(null); 
  const [modalStrengthWorkout, setModalStrengthWorkout] = useState(null); 
  const [customNotification, setCustomNotification] = useState(null);
  const [loadingSync, setLoadingSync] = useState(false);

  // Campos do formulário de treino de corrida concluído
  const [actualDistance, setActualDistance] = useState('');
  const [actualDuration, setActualDuration] = useState('');
  const [rpe, setRpe] = useState(5);
  const [avgHr, setAvgHr] = useState('');
  const [workoutNotes, setWorkoutNotes] = useState('');

  // Campos do formulário de treino de força concomitante
  const [strengthWeights, setStrengthWeights] = useState({}); // {exerciseId: carga_ou_repeticoes}
  const [strengthNotes, setStrengthNotes] = useState('');
  const [strengthRpe, setStrengthRpe] = useState(6);

  // === ESTADOS DO COACH IA GEMINI ===
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [workoutAiFeedbacks, setWorkoutAiFeedbacks] = useState({}); // Feedback da IA associado ao treino
  const [loadingWorkoutFeedbackId, setLoadingWorkoutFeedbackId] = useState(null);

  // === INICIALIZAÇÃO DE DATA E METAS ===
  const todayDateStr = getTodayDateStr();

  // === REGRA 3: AUTENTICAÇÃO ANTES DAS CONSULTAS AO FIRESTORE ===
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Erro ao inicializar autenticação:", err);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
    });
    return () => unsubscribe();
  }, []);

  // === REGRA 1 E 2: ESCUTA DE ATUALIZAÇÕES DO CLOUD FIRESTORE ===
  useEffect(() => {
    if (!user) return;

    // Registo de escuta para o perfil global do utilizador
    const profileDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'user_profile');
    const unsubProfile = onSnapshot(profileDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.basePaceStr) setBasePaceStr(data.basePaceStr);
        if (data.currentWeek) {
          setCurrentWeek(data.currentWeek);
          setExpandedWeek(data.currentWeek);
        }
        if (data.currentPhase) setCurrentPhase(data.currentPhase);
        if (data.syncStatus) setSyncStatus(data.syncStatus);
        if (data.parsedRuns) setParsedRuns(data.parsedRuns);
        if (data.csvStats) setCsvStats(data.csvStats);
        if (data.csvRecentStats) setCsvRecentStats(data.csvRecentStats);
        if (data.workoutAiFeedbacks) setWorkoutAiFeedbacks(data.workoutAiFeedbacks);
        if (data.strengthMode) setStrengthMode(data.strengthMode);
        if (data.completedYogaLog) setCompletedYogaLog(data.completedYogaLog);
      }
    }, (err) => console.error("Erro ao escutar dados do perfil do utilizador:", err));

    // Registo de escuta para os treinos de corrida registados
    const workoutsColRef = collection(db, 'artifacts', appId, 'users', user.uid, 'completedWorkouts');
    const unsubWorkouts = onSnapshot(workoutsColRef, (snapshot) => {
      const data = {};
      snapshot.forEach(doc => {
        data[doc.id] = doc.data();
      });
      setCompletedWorkouts(data);
    }, (err) => console.error("Erro ao escutar treinos de corrida:", err));

    // Registo de escuta para treinos de força concomitantes
    const strengthColRef = collection(db, 'artifacts', appId, 'users', user.uid, 'completedStrength');
    const unsubStrength = onSnapshot(strengthColRef, (snapshot) => {
      const data = {};
      snapshot.forEach(doc => {
        data[doc.id] = doc.data();
      });
      setCompletedStrength(data);
    }, (err) => console.error("Erro ao escutar sessões de força:", err));

    return () => {
      unsubProfile();
      unsubWorkouts();
      unsubStrength();
    };
  }, [user]);

  // === GRAVAÇÃO DE DADOS NO FIRESTORE ===
  const saveProfileField = async (fields) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'user_profile');
      await setDoc(docRef, fields, { merge: true });
    } catch (e) {
      console.error("Erro ao gravar campo de perfil:", e);
    }
  };

  const handleSaveWorkoutCompletion = async () => {
    if (!user || !modalWorkout) return;
    
    const distNum = parseFloat(actualDistance);
    let calculatedPace = 0;
    if (distNum > 0 && actualDuration) {
      const parts = actualDuration.split(':');
      const totalMinutes = (parseInt(parts[0], 10) || 0) + ((parseInt(parts[1], 10) || 0) / 60);
      calculatedPace = totalMinutes / distNum;
    }

    const completionData = {
      completed: true,
      completedAt: new Date().toISOString(),
      actualDistance: distNum || 0,
      actualDuration: actualDuration || "00:00",
      actualPace: calculatedPace ? formatPace(calculatedPace * 60) : "--:--",
      rpe: parseInt(rpe, 10),
      avgHr: parseInt(avgHr, 10) || null,
      notes: workoutNotes,
      phase: currentPhase
    };

    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'completedWorkouts', modalWorkout.id);
      await setDoc(docRef, completionData, { merge: true });
      showToast("Corrida registada com sucesso! Excelente consistência mecânica.");
      setModalWorkout(null);
    } catch (e) {
      console.error("Erro ao registar corrida:", e);
      showToast("Não foi possível ligar à pista.");
    }
  };

  const handleSaveStrengthCompletion = async () => {
    if (!user || !modalStrengthWorkout) return;

    const completionData = {
      completed: true,
      completedAt: new Date().toISOString(),
      weightsUsed: strengthWeights,
      rpe: parseInt(strengthRpe, 10),
      notes: strengthNotes,
      week: currentWeek,
      phase: currentPhase,
      mode: strengthMode
    };

    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'completedStrength', `${modalStrengthWorkout.day}_P${currentPhase}_W${currentWeek}`);
      await setDoc(docRef, completionData, { merge: true });
      showToast(`Sessão de Força concomitante guardada!`);
      setModalStrengthWorkout(null);
    } catch (e) {
      console.error("Erro ao registar força:", e);
      showToast("Falha ao registar o esforço de força.");
    }
  };

  const handleToggleYoga = async () => {
    if (!user) return;
    const currentStatus = !!completedYogaLog[todayDateStr];
    const updatedLog = {
      ...completedYogaLog,
      [todayDateStr]: !currentStatus
    };
    setCompletedYogaLog(updatedLog);
    await saveProfileField({ completedYogaLog: updatedLog });
    showToast(!currentStatus ? "🧘‍♂️ Ativação de Yoga efetuada! Articulações preparadas." : "Ativação de Yoga reposta.");
  };

  const handleResetWorkout = async (workoutId) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'completedWorkouts', workoutId);
      await setDoc(docRef, { completed: false }, { merge: true });
      
      const updatedFeedbacks = { ...workoutAiFeedbacks };
      delete updatedFeedbacks[workoutId];
      setWorkoutAiFeedbacks(updatedFeedbacks);
      saveProfileField({ workoutAiFeedbacks: updatedFeedbacks });

      showToast("Treino de corrida limpo.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetStrength = async (dayKey) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'completedStrength', `${dayKey}_P${currentPhase}_W${currentWeek}`);
      await setDoc(docRef, { completed: false }, { merge: true });
      showToast("Treino de força reposto para este ciclo.");
    } catch (e) {
      console.error(e);
    }
  };

  const showToast = (msg) => {
    setCustomNotification(msg);
    setTimeout(() => setCustomNotification(null), 4000);
  };

  // === CHAMADAS À API DO GEMINI COM RETRY E BACKOFF EXPONENCIAL ===
  const callGeminiAPI = async (promptText, systemInstruction = "") => {
    const apiKey = "";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
    };

    let delay = 1000;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
        throw new Error("Erro de processamento da IA.");
      } catch (err) {
        if (attempt === 4) throw err;
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
      }
    }
  };

  const handleRequestWorkoutAiFeedback = async (workoutId, workoutTitle, workoutTarget, userCompletedData) => {
    setLoadingWorkoutFeedbackId(workoutId);
    
    const systemPrompt = `És o "The Machine AI Coach", especialista em corrida de fundo. O teu atleta tem 41 anos, é pai de um bebé de 1 ano e 9 meses e está focado na Meia Maratona do Rio em Maio de 2027. Diariamente, ele faz de 20 a 25 minutos de Yoga antes dos treinos como ativação neuromuscular. Fornece análises técnicas de até 4 linhas em português de Portugal (PT-PT), considerando a fadiga de noites fragmentadas e o benefício do Yoga para a economia de corrida e estabilidade pélvica.`;
    
    const prompt = `Analisa o treino de corrida: "${workoutTitle}". Meta programada: "${workoutTarget}".
    Dados registados pelo atleta:
    - Distância real: ${userCompletedData.actualDistance} km
    - Tempo total: ${userCompletedData.actualDuration} minutos
    - Ritmo médio (Pace): ${userCompletedData.actualPace}/km
    - Esforço Percebido (RPE): ${userCompletedData.rpe}/10
    - FC Média: ${userCompletedData.avgHr ? userCompletedData.avgHr + " BPM" : "Não monitorizada"}
    - Notas do corredor: "${userCompletedData.notes || 'Sem comentários'}"
    - Mobilidade: Fez 20-25 minutos de Yoga pré-treino de forma exemplar.

    Avalia de forma biomecânica de acordo com os conceitos de corrida do Fartlek de Andres (2024).`;

    try {
      const feedback = await callGeminiAPI(prompt, systemPrompt);
      const updatedFeedbacks = {
        ...workoutAiFeedbacks,
        [workoutId]: feedback
      };
      setWorkoutAiFeedbacks(updatedFeedbacks);
      await saveProfileField({ workoutAiFeedbacks: updatedFeedbacks });
      showToast("✨ Feedback do Treinador carregado para o teu telemóvel!");
    } catch (e) {
      console.error(e);
      showToast("Falha de rede com o treinador.");
    } finally {
      setLoadingWorkoutFeedbackId(null);
    }
  };

  const handleAskCoachAi = async (customText = "") => {
    const textToQuery = customText || aiPromptInput;
    if (!textToQuery.trim()) return;

    setAiLoading(true);
    setAiResponse('');
    
    const contextData = {
      age: 41,
      babyAge: "1 ano e 9 meses",
      race: "Meia Maratona do Rio de Janeiro em Maio de 2027",
      yogaRoutine: "Pratica diariamente de 20 a 25 minutos de Yoga antes de cada atividade (corrida ou força), considerando como ativação muscular profunda.",
      basePace: basePaceStr,
      currentPhase: currentPhase,
      currentWeek: currentWeek,
      completedRuns: Object.values(completedWorkouts).filter(w => w.completed).length,
      completedStrength: Object.values(completedStrength).filter(w => w.completed).length,
      mode: strengthMode
    };

    const systemPrompt = `És o "The Machine AI Coach". O teu atleta tem ${contextData.age} anos, é pai de um bebé de ${contextData.babyAge} e está focado na ${contextData.race}.
    Ele tem a excelente rotina de praticar: ${contextData.yogaRoutine}. Ele faz treino de força concomitante (${contextData.mode === 'kettlebell' ? 'Kettlebell' : 'Calistenia'}).
    Ele está na Fase ${contextData.currentPhase}, Semana ${contextData.currentWeek}.
    Explica como o Yoga funciona como uma preparação articular essencial pré-treino para um corredor de 41 anos, como isso reduz dores na lombar causadas por carregar o bebé no colo e melhora o alinhamento corporal na corrida. Cita os PDFs científicos de forma sutil. Responde em português de Portugal de forma clara e amigável com excelente formatação markdown.`;

    try {
      const result = await callGeminiAPI(textToQuery, systemPrompt);
      setAiResponse(result);
      if (!customText) setAiPromptInput('');
    } catch (e) {
      console.error(e);
      setAiResponse("Atleta! Não consegui ouvir a tua voz devido ao ruído na pista. Podes repetir?");
    } finally {
      setAiLoading(false);
    }
  };

  // === CÁLCULO DINÂMICO DE ZONAS DE RITMO COM BASE NO PACE ===
  const baseSeconds = parsePaceToSeconds(basePaceStr);
  const zones = {
    easy: {
      name: "Rodagem Leve (Z2)",
      range: `${formatPace(baseSeconds + 20)} - ${formatPace(baseSeconds + 45)}/km`,
      desc: "Ideal para oxidação lipídica, fortalecimento do sistema cardiorrespiratório e adaptação celular profunda."
    },
    tempo: {
      name: "Ritmo de Prova / Limiar (Z3/Z4)",
      range: `${formatPace(baseSeconds - 25)} - ${formatPace(baseSeconds - 10)}/km`,
      desc: "Ritmo metabólico que vais sustentar com alta economia de energia no asfalto do Rio."
    },
    fartlekForte: {
      name: "Fartlek Potente (Z5)",
      range: `${formatPace(baseSeconds - 65)} - ${formatPace(baseSeconds - 45)}/km`,
      desc: "Aceleração controlada baseada em Andres (2024), estimulando potência muscular e cinética de oxigénio."
    },
    fartlekLeve: {
      name: "Recuperação Ativa",
      range: `${formatPace(baseSeconds + 65)}/km ou trote regenerativo`,
      desc: "Fase de remoção de lactato sem quebrar a mecânica de corrida."
    }
  };

  // === PLANO DE CORRIDA DE 4 FASES (RIO 2027) ===
  const phasesInfo = {
    1: {
      name: "Fase 1: Construção de Base Cardiovascular (Meses 1-3)",
      desc: "Fase focada no desenvolvimento de capilarização periférica e biogênese mitocondrial ($VO_2\\max$). Adaptação dos tendões de Aquiles e joelhos sem lesões.",
      weeks: [
        {
          week: 1,
          title: "Adaptação Neuromuscular Corta-Monotonia",
          description: "Primeiro contacto com o asfalto sob periodização tática concomitante.",
          workouts: [
            { id: "P1W1D1", day: "Terça-feira", type: "Fartlek", title: "Fartlek Lúdico de Volta", target: `10 min aquec. + 5x (1 min Forte [${zones.fartlekForte.range}] / 1 min Leve [${zones.fartlekLeve.range}]) + 5 min trote final de soltura.` },
            { id: "P1W1D2", day: "Quinta-feira", type: "Rodagem", title: "Rodagem Regenerativa", target: `4.5 km em Ritmo Leve [${zones.easy.range}]. Conversação totalmente confortável.` },
            { id: "P1W1D3", day: "Domingo", type: "Longo", title: "Primeiro Longo Conforto", target: `6 km em Ritmo Easy [${zones.easy.range}]. Mantém a cadência leve de 170-180 passos/min.` }
          ]
        },
        {
          week: 2,
          title: "Sustentabilidade Mecânica",
          description: "Estabilização postural após os primeiros treinos de força.",
          workouts: [
            { id: "P1W2D1", day: "Terça-feira", type: "Fartlek", title: "Fartlek Progressivo", target: `10 min aquec. + 6x (1 min Forte / 1 min Trote) + 5 min desaquec.` },
            { id: "P1W2D2", day: "Quinta-feira", type: "Rodagem", title: "Manutenção Aeróbica", target: `5 km em Ritmo Leve [${zones.easy.range}]. Alinhamento pélvico alto.` },
            { id: "P1W2D3", day: "Domingo", type: "Longo", title: "Acumulação de Volume", target: `7 km em Ritmo Leve [${zones.easy.range}]. Hidratação constante.` }
          ]
        },
        {
          week: 3,
          title: "Estímulo Piramidal Leve",
          description: "Variação de cargas mecânicas para adaptação articular progressiva.",
          workouts: [
            { id: "P1W3D1", day: "Terça-feira", type: "Fartlek", title: "Fartlek Pirâmide Curta", target: `10 min aquec. + (1m forte / 1m leve) + (2m forte / 2m leve) + (1m forte) + 5 min desaquec.` },
            { id: "P1W3D2", day: "Quinta-feira", type: "Rodagem", title: "Volume de Meio de Semana", target: `5.5 km em Ritmo Leve [${zones.easy.range}].` },
            { id: "P1W3D3", day: "Domingo", type: "Longo", title: "Base Muscular Consolidada", target: `8 km em Ritmo Leve [${zones.easy.range}]. Termina a sentir-te fresco.` }
          ]
        },
        {
          week: 4,
          title: "Semana de Supercompensação",
          description: "Redução de volume para fixar as adaptações celulares. Ideal para recarregar energias em família.",
          workouts: [
            { id: "P1W4D1", day: "Terça-feira", type: "Fartlek", title: "Jogo de Velocidade Macio", target: `10 min aquec. + 4x (1 min Ritmo Prova [${zones.tempo.range}] / 1 min Trote) + 5 min desaquec.` },
            { id: "P1W4D2", day: "Quinta-feira", type: "Rodagem", title: "Trote Regenerativo", target: `4 km super leve (Zona 1), apenas para circulação e soltura ativa.` },
            { id: "P1W4D3", day: "Domingo", type: "Longo", title: "Longo Reduzido", target: `6 km em ritmo de conforto absoluto.` }
          ]
        }
      ]
    },
    2: {
      name: "Fase 2: Desenvolvimento de Força & Subidas (Meses 4-6)",
      desc: "Foco no desenvolvimento da potência do glúteo e flexores do quadril. Introdução a tiros de subida e sustentação do core sob fadiga acumulada.",
      weeks: [
        {
          week: 5,
          title: "Introdução à Potência de Quadril",
          description: "Sincronizando o treino de perna unilateral com a passada de corrida.",
          workouts: [
            { id: "P2W5D1", day: "Terça-feira", type: "Fartlek", title: "Fartlek Sueco Moderado", target: `10 min aquec. + 5x (2 min Forte [${zones.fartlekForte.range}] / 1 min Leve) + 5 min desaquec.` },
            { id: "P2W5D2", day: "Quinta-feira", type: "Rodagem", title: "Rodagem + Rampa", target: `5 km Easy + no final faz 4 acelerações de 15 segundos em subida moderada com foco em impulsão.` },
            { id: "P2W5D3", day: "Domingo", type: "Longo", title: "Longo de Transição de Força", target: `9 km Ritmo Leve [${zones.easy.range}]. Mantém a coluna torácica aberta.` }
          ]
        },
        {
          week: 6,
          title: "Sustentando o Ritmo (Threshold)",
          description: "Ensina o corpo a reciclar o lactato acumulado nas pernas.",
          workouts: [
            { id: "P2W6D1", day: "Terça-feira", type: "Tempo", title: "Introdução ao Tempo Run", target: `10 min aquec. + 3 km contínuos em Ritmo de Prova [${zones.tempo.range}] + 5 min desaquec.` },
            { id: "P2W6D2", day: "Quinta-feira", type: "Rodagem", title: "Soltura Ativa", target: `6 km Easy [${zones.easy.range}].` },
            { id: "P2W6D3", day: "Domingo", type: "Longo", title: "Longo de 10k", target: `10 km em Ritmo Easy [${zones.easy.range}]. Hidratação planeada.` }
          ]
        }
      ]
    },
    3: {
      name: "Fase 3: Ritmo Específico de Prova (Meses 7-9)",
      desc: "Simulação das condições de calor e altimetria plana/leve do Rio de Janeiro. Blocos longos no ritmo planeado de prova.",
      weeks: [
        {
          week: 7,
          title: "Blocos de Ritmo Rio 2027",
          description: "Acostumando o coração e as pernas com a velocidade oficial de prova.",
          workouts: [
            { id: "P3W7D1", day: "Terça-feira", type: "Fartlek", title: "Fartlek de Blocos Longos", target: `10 min aquec. + 4x (3 min Ritmo Prova [${zones.tempo.range}] / 2 min Leve) + 5 min desaquec.` },
            { id: "P3W7D2", day: "Quinta-feira", type: "Rodagem", title: "Volume Sustentado", target: `7 km em Ritmo Easy [${zones.easy.range}].` },
            { id: "P3W7D3", day: "Domingo", type: "Longo", title: "Desafio dos 12k", target: `12 km em Ritmo Leve [${zones.easy.range}]. Último km tenta rodar no ritmo alvo da prova.` }
          ]
        },
        {
          week: 8,
          title: "Simulado de Ritmo",
          description: "Teste de alimentação, vestuário e ténis para a prova.",
          workouts: [
            { id: "P3W8D1", day: "Terça-feira", type: "Tempo", title: "Tempo Run de Limiar", target: `10 min aquec. + 4 km firmes no Ritmo de Prova [${zones.tempo.range}] + 5 min desaquec.` },
            { id: "P3W8D2", day: "Quinta-feira", type: "Rodagem", title: "Trote de Conforto", target: `6 km Easy.` },
            { id: "P3W8D3", day: "Domingo", type: "Longo", title: "Simulado 14k", target: `14 km divididos: 10 km Easy [${zones.easy.range}] + 4 km finais no Ritmo de Prova [${zones.tempo.range}].` }
          ]
        }
      ]
    },
    4: {
      name: "Fase 4: Polimento Avançado & Glória (Mês da Prova)",
      desc: "Recuperação total dos estoques de glicogênio e reparação tecidual profunda. Máxima energia e leveza no dia da Meia do Rio.",
      weeks: [
        {
          week: 9,
          title: "Tapering e Polimento Inicial",
          description: "Reduzindo volume e mantendo a intensidade neuromuscular viva.",
          workouts: [
            { id: "P4W9D1", day: "Terça-feira", type: "Intervalado", title: "Tiros Curtos de Ativação", target: `10 min aquec. + 5x 400m rápidos com 2 min de descanso caminhando + 5 min desaquec.` },
            { id: "P4W9D2", day: "Quinta-feira", type: "Rodagem", title: "Rodagem Curta de Confiança", target: `5 km em Ritmo Easy [${zones.easy.range}].` },
            { id: "P4W9D3", day: "Domingo", type: "Longo", title: "Longo de Conforto Psicológico", target: `10 km super controlados em Ritmo Leve. Sem pressa nenhuma.` }
          ]
        },
        {
          week: 10,
          title: "A Grande Semana - Meia do Rio!",
          description: "Corpo leve, mente blindada, pernas potentes. O grande dia chegou!",
          workouts: [
            { id: "P4W10D1", day: "Terça-feira", type: "Rodagem", title: "Ativação de Pernas", target: `3 km de trote ultra leve + 3 retas rápidos de 50m soltas.` },
            { id: "P4W10D2", day: "Quinta-feira", type: "Rodagem", title: "Trote Pré-Viagem/Prova", target: `2 km muito leve, só para tirar o estresse e mobilizar articulações.` },
            { id: "P4W10D3", day: "Longo", type: "Longo", title: "MEIA MARATONA DO RIO DE JANEIRO (21.097 km)", target: `O dia de cruzar as praias do Rio! Comece controlado [${zones.easy.range}], sinta o fôlego e acelere na segunda metade!` }
          ]
        }
      ]
    }
  };

  // === PROGRAMA DE FORÇA CONCOMITANTE DAD-FRIENDLY ===
  const strengthProgram = [
    {
      day: "Segunda-feira",
      title: "Sessão A - Estabilidade Core & Lombar",
      focus: "Fortalecimento preventivo contra lesões e blindagem lombar para carregar o bebé de 1 ano e 9 meses.",
      exercises: [
        { 
          id: "S1", 
          name: "Turkish Get-Up (TGU)", 
          sets: "3 séries x 3 reps/lado", 
          desc: "Mobilização torácica, estabilização escapular e ativação de core.",
          kettlebell: "Utiliza uma carga média de kettlebell com execução lenta e controlada.",
          bodyweight: "Executa o levantamento completo do solo equilibrando um objeto leve no punho fechado para estabilidade articular torácica."
        },
        { 
          id: "S2", 
          name: "Goblet Squat (Agachamento)", 
          sets: "4 séries x 10 reps", 
          desc: "Ganho de força em quadríceps e glúteos.",
          kettlebell: "Segura o kettlebell verticalmente junto ao tronco.",
          bodyweight: "Executa o agachamento com cadência isométrica (3s para descer, 1s de pausa em baixo, sobe rápido)."
        },
        { 
          id: "S3", 
          name: "Single-Arm Row (Remada Unilateral)", 
          sets: "3 séries x 10 reps/lado", 
          desc: "Prevenção da postura cifótica de empurrar o carrinho de bebé.",
          kettlebell: "Apoia o joelho oposto num sofá firme e executa a remada unilateral.",
          bodyweight: "Executa remadas invertidas sob a mesa de jantar estável ou puxadas utilizando uma toalha ancorada."
        }
      ]
    },
    {
      day: "Quarta-feira",
      title: "Sessão B - Potência Posterior (Hip Hinge)",
      focus: "Impulsão de passada aeróbica e robustez dos isquiotibiais.",
      exercises: [
        { 
          id: "Q1", 
          name: "Swings / Saltos de Potência", 
          sets: "5 séries x 15 reps", 
          desc: "Extensão rápida e potente de quadris.",
          kettlebell: "Kettlebell Swings tradicionais focados no impulso do glúteo posterior.",
          bodyweight: "Saltos horizontais controlados com amortecimento elástico no pouso (Broad Jumps)."
        },
        { 
          id: "Q2", 
          name: "Single-Leg Romanian Deadlift (RDL)", 
          sets: "3 séries x 8 reps/lado", 
          desc: "Controlo excêntrico e propriocepção de tornozelo.",
          kettlebell: "Segura o kettlebell na mão oposta ao pé de apoio para contra-balanço.",
          bodyweight: "RDL unilateral sem carga externa, focando inteiramente no alinhamento articular da perna de apoio."
        }
      ]
    },
    {
      day: "Sexta-feira",
      title: "Sessão C - Equilíbrio Unilateral",
      focus: "Sustentação pélvica estável, simulando a fase aérea de apoio único na corrida.",
      exercises: [
        { 
          id: "X1", 
          name: "Reverse Lunge (Passada para trás)", 
          sets: "3 séries x 10 reps/lado", 
          desc: "Unilateral de grande amplitude muscular.",
          kettlebell: "Segura o kettlebell junto ao tronco.",
          bodyweight: "Lunge reverso completo tocando o joelho de trás suavemente no chão a cada repetição."
        },
        { 
          id: "X2", 
          name: "Suitcase Carry / Prancha Lateral", 
          sets: "3 séries x 40m ou 40s/lado", 
          desc: "Estabilização lateral ativa profunda.",
          kettlebell: "Caminha ereto segurando o kettlebell de um lado só, sem desvios laterais.",
          bodyweight: "Prancha lateral estática focando na ativação do quadrado lombar e transverso do abdómen."
        }
      ]
    }
  ];

  // === INTERFACE DO IMPORTADOR DE HISTÓRICO CSV ===
  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const parsed = parseStravaCSV(text);
      if (parsed.length === 0) {
        showToast("Não identificámos atividades de corrida compatíveis no ficheiro.");
        return;
      }
      
      const sixMonthsAgo = new Date(2026, 0, 16).getTime(); // 16 de Janeiro de 2026
      const recentRuns = parsed.filter(run => run.timestamp && run.timestamp >= sixMonthsAgo);

      const totalDist = parsed.reduce((sum, r) => sum + r.distance, 0);
      const totalTime = parsed.reduce((sum, r) => sum + r.time, 0);
      const avgPaceSecs = totalDist > 0 ? (totalTime / totalDist) : 0;
      
      const stats = {
        totalActivities: parsed.length,
        totalDistance: parseFloat(totalDist.toFixed(1)),
        avgPace: formatPace(avgPaceSecs),
        bestPace: formatPace(Math.min(...parsed.map(r => r.pace).filter(p => p > 120)))
      };

      let recentStats = null;
      if (recentRuns.length > 0) {
        const recentDist = recentRuns.reduce((sum, r) => sum + r.distance, 0);
        const recentTime = recentRuns.reduce((sum, r) => sum + r.time, 0);
        const recentAvgPace = recentDist > 0 ? (recentTime / recentDist) : 0;
        
        recentStats = {
          totalActivities: recentRuns.length,
          totalDistance: parseFloat(recentDist.toFixed(1)),
          avgPace: formatPace(recentAvgPace),
          bestPace: formatPace(Math.min(...recentRuns.map(r => r.pace).filter(p => p > 120)))
        };
      }

      setParsedRuns(parsed.slice(0, 50));
      setCsvStats(stats);
      setCsvRecentStats(recentStats);
      
      saveProfileField({
        parsedRuns: parsed.slice(0, 50),
        csvStats: stats,
        csvRecentStats: recentStats
      });

      showToast("Ficheiro do Strava analisado! Histórico atualizado.");
    };
    reader.readAsText(file);
  };

  const parseStravaCSV = (text) => {
    const lines = text.split('\n');
    if (lines.length < 2) return [];
    
    const headerLine = lines[0];
    const headers = splitCSVLine(headerLine).map(h => h.trim().replace(/^"|"$/g, ''));
    
    const dateIdx = headers.findIndex(h => /date/i.test(h));
    const typeIdx = headers.findIndex(h => /type/i.test(h));
    const distIdx = headers.findIndex(h => /distance/i.test(h));
    const timeIdx = headers.findIndex(h => /moving time|elapsed time/i.test(h));
    const nameIdx = headers.findIndex(h => /name/i.test(h));
    
    if (dateIdx === -1 || distIdx === -1) return [];

    const activities = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cells = splitCSVLine(line);
      if (cells.length < Math.max(dateIdx, distIdx)) continue;
      
      const type = cells[typeIdx] || '';
      if (type.toLowerCase().includes('run') || type.toLowerCase().includes('corrida')) {
        let rawDist = parseFloat(cells[distIdx]) || 0;
        let distance = rawDist > 200 ? rawDist / 1000 : rawDist;
        
        let movingTime = parseFloat(cells[timeIdx]) || 0;
        if (movingTime === 0 && cells[timeIdx]) {
          const parts = cells[timeIdx].split(':');
          if (parts.length === 3) {
            movingTime = (parseInt(parts[0], 10) * 3600) + (parseInt(parts[1], 10) * 60) + (parseInt(parts[2], 10) || 0);
          } else if (parts.length === 2) {
            movingTime = (parseInt(parts[0], 10) * 60) + (parseInt(parts[1], 10) || 0);
          }
        }

        const dateStr = cells[dateIdx] || '';
        let timestamp = null;
        if (dateStr) {
          const sanitizedDate = dateStr.replace(/"/g, '');
          const parsedDate = Date.parse(sanitizedDate);
          if (!isNaN(parsedDate)) {
            timestamp = parsedDate;
          } else {
            const monthMap = { 'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5, 'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11 };
            const lowerDate = sanitizedDate.toLowerCase();
            const match = lowerDate.match(/(\d+)\s+de\s+([a-z]+)\.?\s+de\s+(\d+)/);
            if (match) {
              const day = parseInt(match[1], 10);
              const monthStr = match[2].substring(0, 3);
              const year = parseInt(match[3], 10);
              const monthVal = monthMap[monthStr] !== undefined ? monthMap[monthStr] : 6;
              timestamp = new Date(year, monthVal, day).getTime();
            } else {
              const yearMatch = sanitizedDate.match(/\b(201\d|202\d)\b/);
              if (yearMatch) {
                timestamp = new Date(parseInt(yearMatch[1], 10), 6, 1).getTime();
              }
            }
          }
        }

        if (distance > 0.2 && movingTime > 60) {
          const paceSecs = movingTime / distance;
          if (paceSecs > 120 && paceSecs < 900) {
            activities.push({
              id: i,
              date: dateStr.replace(/"/g, '').split(',')[0],
              name: cells[nameIdx]?.replace(/"/g, '') || 'Corrida Strava',
              distance: parseFloat(distance.toFixed(2)),
              time: movingTime,
              pace: paceSecs,
              timestamp: timestamp
            });
          }
        }
      }
    }
    return activities.sort((a, b) => b.id - a.id);
  };

  const splitCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const applyRecentPaceAsBase = () => {
    if (!csvRecentStats || !csvRecentStats.avgPace) return;
    setBasePaceStr(csvRecentStats.avgPace);
    saveProfileField({ basePaceStr: csvRecentStats.avgPace });
    showToast(`Pace Base calibrado para ${csvRecentStats.avgPace}/km baseado no ritmo dos últimos 6 meses!`);
  };

  // === RENDERS DE COMPONENTES INTERATIVOS ===

  // Card do Yoga Diário (Ativação Obrigatória)
  const renderYogaCard = () => {
    const isYogaDone = !!completedYogaLog[todayDateStr];
    return (
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/25">
            <YogaIcon className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider block">
              Ativação & Mobilidade (Diário)
            </span>
            <h4 className="text-xs font-bold text-white">Prática de Yoga Ativo • 20-25 min</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-xl">
              Praticado antes das atividades principais. Funciona como alongamento dinâmico, lubrifica articulações e blinda a coluna lombar de fadigas mecânicas associadas à paternidade.
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleYoga}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 self-end sm:self-center ${
            isYogaDone 
              ? 'bg-emerald-500 text-slate-950 shadow-md' 
              : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/50'
          }`}
        >
          {isYogaDone ? (
            <>
              <Check className="w-4 h-4" /> Yoga Concluído!
            </>
          ) : (
            "Marcar como Feito"
          )}
        </button>
      </div>
    );
  };

  // ABA DE CORRIDA
  const renderPlanTab = () => {
    const phaseData = phasesInfo[currentPhase] || phasesInfo[1];
    const workoutsOfTheWeek = phaseData.weeks.find(w => w.week === currentWeek)?.workouts || [];
    const completedInWeek = workoutsOfTheWeek.filter(w => completedWorkouts[w.id]?.completed).length;

    return (
      <div className="space-y-6">
        {/* Banner de Objetivos do "The Machine" */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-orange-950/40 p-5 rounded-2xl border border-orange-500/40 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <ToddlerIcon className="w-28 h-28 text-white" />
          </div>
          <div className="relative z-10 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Meia Maratona do Rio 2027
              </span>
              <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                <ToddlerIcon className="w-3.5 h-3.5" /> Paternidade Concomitante • 41 Anos
              </span>
            </div>
            
            <h2 className="text-xl font-bold text-white">The Machine: Planilha Tática Ativa</h2>
            <p className="text-slate-300 text-xs leading-relaxed max-w-xl">
              Faltam aproximadamente 10 meses para o asfalto do Rio de Janeiro. A sua periodização é adaptável à qualidade do teu sono. O foco inicial é manter a base de rodagem em Zona 2.
            </p>

            {/* Configuração de Fase */}
            <div className="pt-3 border-t border-slate-800/60 mt-3 grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Mudar Fase Atual</label>
                <select
                  value={currentPhase}
                  onChange={(e) => {
                    const phase = parseInt(e.target.value, 10);
                    setCurrentPhase(phase);
                    setCurrentWeek(1);
                    setExpandedWeek(1);
                    saveProfileField({ currentPhase: phase, currentWeek: 1 });
                    showToast(`Acedeste à: ${phasesInfo[phase].name}`);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white outline-none focus:border-orange-500/50"
                >
                  <option value={1}>Fase 1: Construção de Base (W1-W4)</option>
                  <option value={2}>Fase 2: Desenvolvimento/Subidas (W5-W6)</option>
                  <option value={3}>Fase 3: Ritmo de Prova (W7-W8)</option>
                  <option value={4}>Fase 4: Polimento & Glória (W9-W10)</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-center bg-slate-950/40 p-2 rounded-xl border border-slate-800/40">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Fase</span>
                  <strong className="text-sm text-orange-400">{currentPhase}/4</strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Concluídas</span>
                  <strong className="text-sm text-emerald-400">
                    {Object.values(completedWorkouts).filter(w => w.completed).length}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ativação por Yoga Obrigatória */}
        {renderYogaCard()}

        {/* Foco Fisiológico Ativo da Fase */}
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 space-y-1">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{phaseData.name}</h4>
          <p className="text-xs text-slate-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: phaseData.desc }}></p>
        </div>

        {/* Listagem de Semanas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-300">Planeamento Semanal</h3>
            <span className="text-[11px] text-slate-500">Expande para ver treinos</span>
          </div>

          {phaseData.weeks.map((weekData) => {
            const isExpanded = expandedWeek === weekData.week;
            const weekCompletedCount = weekData.workouts.filter(w => completedWorkouts[w.id]?.completed).length;
            const isCurrent = currentWeek === weekData.week;

            return (
              <div 
                key={weekData.week} 
                className={`rounded-xl border transition-all overflow-hidden ${
                  isCurrent 
                    ? 'border-orange-500/40 bg-slate-900/40 shadow-sm' 
                    : 'border-slate-850 bg-slate-900/20'
                }`}
              >
                {/* Header do Colapsável */}
                <div 
                  onClick={() => setExpandedWeek(isExpanded ? null : weekData.week)}
                  className="p-4 flex items-center justify-between cursor-pointer select-none hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      isCurrent ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      W{weekData.week}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">Semana {weekData.week}: {weekData.title}</span>
                        {isCurrent && (
                          <span className="bg-orange-500/10 text-orange-400 text-[9px] px-1.5 py-0.5 rounded border border-orange-500/20 font-bold">
                            Semana Ativa
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{weekData.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {weekCompletedCount > 0 && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-medium border border-emerald-500/20">
                        {weekCompletedCount}/{weekData.workouts.length} OK
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Detalhes da Semana */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-slate-800/40 bg-slate-950/25 divide-y divide-slate-850">
                    <p className="text-[11px] text-orange-300/90 py-2.5 italic flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 flex-shrink-0" />
                      Foco Fisiológico: {weekData.description}
                    </p>
                    
                    {weekData.workouts.map((workout) => {
                      const comp = completedWorkouts[workout.id];
                      const isDone = comp?.completed;
                      const aiFeedbackText = workoutAiFeedbacks[workout.id];

                      return (
                        <div key={workout.id} className="py-4 first:pt-3 last:pb-2">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${
                                  workout.type === 'Fartlek' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20' :
                                  workout.type === 'Longo' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                                  workout.type === 'Tempo' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' :
                                  'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {workout.day} - {workout.type}
                                </span>
                                <h4 className="font-semibold text-white text-xs">{workout.title}</h4>
                              </div>
                              <p className="text-slate-300 text-[11px] font-mono bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 mt-2">
                                {workout.target}
                              </p>

                              {/* Box para receber Feedback do Treinador IA */}
                              {isDone && (
                                <div className="mt-3 bg-indigo-950/20 border border-indigo-500/10 rounded-xl p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-indigo-300 flex items-center gap-1">
                                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" /> Feedback Biomecânico do Treinador IA
                                    </span>
                                    {!aiFeedbackText && (
                                      <button
                                        onClick={() => handleRequestWorkoutAiFeedback(workout.id, workout.title, workout.target, comp)}
                                        disabled={loadingWorkoutFeedbackId === workout.id}
                                        className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2 py-1 rounded transition-colors disabled:opacity-50"
                                      >
                                        {loadingWorkoutFeedbackId === workout.id ? "✨ Analisando..." : "✨ Analisar Performance"}
                                      </button>
                                    )}
                                  </div>
                                  
                                  {aiFeedbackText ? (
                                    <p className="text-[11px] text-slate-300 italic leading-relaxed">
                                      "{aiFeedbackText}"
                                    </p>
                                  ) : (
                                    <p className="text-[10px] text-slate-500">
                                      Carrega no botão para obter o feedback técnico do Gemini com base nas tuas métricas e notas de esforço.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Controlo de Registo */}
                            <div className="flex-shrink-0 self-end sm:self-start">
                              {isDone ? (
                                <div className="space-y-2 text-right">
                                  <div className="flex items-center justify-end gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                    <Check className="w-4 h-4" /> Realizado
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    <p>Realizado: <strong className="text-white">{comp.actualDistance} km</strong> em <strong className="text-white">{comp.actualDuration}</strong></p>
                                    <p>Ritmo: <strong className="text-white">{comp.actualPace}/km</strong> | RPE: <strong className="text-white">{comp.rpe}/10</strong></p>
                                  </div>
                                  <button 
                                    onClick={() => handleResetWorkout(workout.id)} 
                                    className="text-[10px] text-red-400 hover:underline flex items-center gap-0.5 ml-auto text-right"
                                  >
                                    <RotateCcw className="w-3 h-3" /> Redefinir
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setModalWorkout(workout);
                                    setActualDistance('');
                                    setActualDuration('');
                                    setRpe(5);
                                    setAvgHr('');
                                    setWorkoutNotes('');
                                  }}
                                  className="w-full sm:w-auto px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Registar Sessão
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="py-2.5 flex justify-between items-center bg-slate-900/30 px-2 rounded-lg mt-2">
                      <span className="text-[11px] text-slate-400">Definir esta semana como foco ativo?</span>
                      <button 
                        onClick={() => {
                          setCurrentWeek(weekData.week);
                          saveProfileField({ currentWeek: weekData.week });
                          showToast(`Foco do plano definido para a Semana ${weekData.week}.`);
                        }} 
                        className={`text-[10px] px-3 py-1 rounded font-bold transition-colors ${
                          isCurrent 
                            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20 pointer-events-none' 
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                        }`}
                      >
                        {isCurrent ? "Semana Ativa" : "Definir Ativa"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ABA DE FORÇA CONCOMITANTE
  const renderStrengthTab = () => {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950/40 p-5 rounded-2xl border border-indigo-500/30 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <KettlebellIcon className="w-24 h-24 text-indigo-400" />
          </div>
          <span className="bg-indigo-500/20 text-indigo-400 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Reforço Muscular Concomitante
          </span>
          <h2 className="text-xl font-bold mt-2 text-white">Prevenção Mecânica Ativa</h2>
          <div className="text-slate-300 text-xs mt-1.5 space-y-2 max-w-xl leading-relaxed">
            <p>
              O reforço de posterior e core é indispensável aos 41 anos para melhorar a <em>economia de esforço</em> e estabilizar os quadris, minimizando dores provocadas pelo movimento contínuo da corrida e pelo carrinho do bebé.
            </p>
          </div>
        </div>

        {/* Ativação por Yoga Obrigatória */}
        {renderYogaCard()}

        {/* Chaveador de Equipamento de Força */}
        <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-white pl-2">Material para Fortalecimento</h4>
            <p className="text-[10px] text-slate-400 pl-2">Altera consoante os teus acessórios ativos no momento</p>
          </div>
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => {
                setStrengthMode('kettlebell');
                saveProfileField({ strengthMode: 'kettlebell' });
              }}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                strengthMode === 'kettlebell' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <KettlebellIcon className="w-3.5 h-3.5" /> Kettlebell
            </button>
            <button
              onClick={() => {
                setStrengthMode('bodyweight');
                saveProfileField({ strengthMode: 'bodyweight' });
              }}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                strengthMode === 'bodyweight' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Peso Corporal
            </button>
          </div>
        </div>

        {/* Listagem de Treinos de Força */}
        <div className="space-y-5">
          {strengthProgram.map((workout) => {
            const completionKey = `${workout.day}_P${currentPhase}_W${currentWeek}`;
            const comp = completedStrength[completionKey];
            const isDone = comp?.completed;

            return (
              <div key={workout.day} className={`rounded-xl border ${isDone ? 'border-emerald-500/20 bg-slate-950/20' : 'border-slate-800 bg-slate-900/30'} p-5 space-y-4`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
                  <div>
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded font-bold uppercase">
                      {workout.day}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1">{workout.title}</h3>
                    <p className="text-[11px] text-slate-400">{workout.focus}</p>
                  </div>

                  <div>
                    {isDone ? (
                      <div className="text-right space-y-1">
                        <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                          <Check className="w-3.5 h-3.5" /> Concluído (W{currentWeek})
                        </span>
                        <div className="text-[9px] text-slate-550">
                          Equipamento: {comp.mode === 'kettlebell' ? 'Kettlebell' : 'Calistenia'} | RPE: {comp.rpe}/10
                        </div>
                        <button 
                          onClick={() => handleResetStrength(workout.day)}
                          className="text-[10px] text-red-400 hover:underline flex items-center gap-0.5 ml-auto pt-1 text-right"
                        >
                          <RotateCcw className="w-3 h-3" /> Limpar registo
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setModalStrengthWorkout(workout);
                          setStrengthWeights({});
                          setStrengthNotes('');
                          setStrengthRpe(6);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-bold text-[11px] px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-md"
                      >
                        {strengthMode === 'kettlebell' ? <KettlebellIcon className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                        Registar Cargas
                      </button>
                    )}
                  </div>
                </div>

                {/* Exercícios da Sessão */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workout.exercises.map((ex) => (
                    <div key={ex.id} className="bg-slate-950/40 border border-slate-850 p-3.5 rounded-lg flex gap-3">
                      <div className="bg-indigo-500/10 text-indigo-400 p-2.5 rounded-lg h-fit">
                        {strengthMode === 'kettlebell' ? <KettlebellIcon className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white">{ex.name}</span>
                          <span className="text-[10px] text-indigo-400 font-mono font-bold bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                            {ex.sets}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{ex.desc}</p>
                        
                        <div className="bg-slate-900/60 p-2 rounded text-[11px] border border-slate-850 mt-2">
                          <span className="text-orange-400 font-bold block mb-0.5 uppercase text-[9px]">Execução ({strengthMode === 'kettlebell' ? 'Kettlebell' : 'Livre'}):</span>
                          <span className="text-slate-300">
                            {strengthMode === 'kettlebell' ? ex.kettlebell : ex.bodyweight}
                          </span>
                        </div>

                        {isDone && comp?.weightsUsed?.[ex.id] && (
                          <div className="text-xs text-emerald-400 font-bold pt-1.5 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> {strengthMode === 'kettlebell' ? `Carga:` : `Métrica:`} <strong className="text-white">{comp.weightsUsed[ex.id]} {strengthMode === 'kettlebell' ? 'kg' : 'Reps'}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ABA DO COACH IA GEMINI
  const renderAiCoachTab = () => {
    const quickQuestions = [
      { text: "Qual a importância do Yoga diário aos 41 anos?", query: "Como a prática diária de 20-25 minutos de Yoga que realizo auxilia no ganho de economia de corrida e previne o desgaste do joelho/quadril na minha faixa etária de 41 anos?" },
      { text: "Kettlebell + Yoga: como esta fusão blinda a minha coluna?", query: "Sou pai e carrego o meu filho de quase 2 anos no colo. Como o treino de Kettlebell aliado ao meu Yoga diário blinda a minha coluna contra lesões e sobrecargas mecânicas?" },
      { text: "Noites mal dormidas pelo bebé: como ajustar a planilha?", query: "Se o meu bebé acordar muito à noite e eu dormir mal, como devo ajustar o meu treino de corrida, força ou compensar com Yoga de forma segura?" }
    ];

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-900 p-6 rounded-2xl border border-indigo-500/30 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/25">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">✨ Treinador IA Gemini (Sintonizado)</h2>
              <p className="text-[11px] text-slate-400">Análise desportiva adaptada ao teu sono de pai e Yoga ativo.</p>
            </div>
          </div>

          <div className="bg-slate-950/80 rounded-xl border border-slate-850 p-4 space-y-3 min-h-[180px] flex flex-col justify-between">
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <span className="text-[11px] text-indigo-300 font-medium">✨ O Gemini está a analisar as tuas sessões, sono e alinhamento biomecânico...</span>
              </div>
            ) : aiResponse ? (
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold uppercase tracking-wider">
                  <Bot className="w-4 h-4" /> Diretrizes do Treinador
                </div>
                <div className="text-[11px] text-slate-200 leading-relaxed space-y-2 whitespace-pre-line bg-slate-900/50 p-3.5 rounded-lg border border-slate-800">
                  {aiResponse}
                </div>
                <button 
                  onClick={() => setAiResponse('')}
                  className="text-[10px] text-slate-500 hover:text-white underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Limpar Histórico do Chat
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                <HelpCircle className="w-10 h-10 text-slate-700" />
                <p className="text-slate-400 text-xs font-semibold">Tira as tuas dúvidas científicas</p>
                <p className="text-slate-500 text-[10px] max-w-sm">
                  O Gemini 2.5 está configurado com base nos teus estudos da USP sobre Fartlek, Yoga biomecânico e periodização tática.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Sugestões de Perguntas:</span>
            <div className="grid grid-cols-1 gap-2">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAskCoachAi(q.query)}
                  disabled={aiLoading}
                  className="text-left bg-slate-900/60 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/30 p-2.5 rounded-lg text-xs text-slate-300 transition-all flex items-center justify-between gap-2 active:scale-[0.99] disabled:opacity-50"
                >
                  <span>{q.text}</span>
                  <Plus className="w-4 h-4 text-slate-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60">
            <div className="flex items-center gap-2">
              <input 
                type="text"
                placeholder="Ex: Como o Yoga diário ajuda na minha respiração e frequência cardíaca?"
                value={aiPromptInput}
                onChange={(e) => setAiPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAskCoachAi();
                }}
                disabled={aiLoading}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-xl p-3 text-xs text-white outline-none placeholder:text-slate-650"
              />
              <button 
                onClick={() => handleAskCoachAi()}
                disabled={aiLoading || !aiPromptInput.trim()}
                className="p-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl transition-all shadow-md flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ABA DE DETALHES DE PACE E CARREGAMENTO DO STRAVA
  const renderDashboardTab = () => {
    return (
      <div className="space-y-6">
        {/* Zonas de Ritmo Dinâmicas */}
        <div className="bg-slate-800/70 p-5 rounded-2xl border border-slate-700/60 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-sm">Zonas de Ritmo Calculadas</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Dinamicamente adaptadas ao teu Pace Confortável ativo: <strong className="text-orange-400">{basePaceStr}/km</strong></p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(zones).map(([key, zone]) => (
              <div key={key} className="bg-slate-950/45 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
                <div className={`p-2.5 rounded-lg mt-0.5 ${
                  key === 'easy' ? 'bg-emerald-500/10 text-emerald-400' :
                  key === 'tempo' ? 'bg-rose-500/10 text-rose-400' :
                  key === 'fartlekForte' ? 'bg-indigo-500/10 text-indigo-400' :
                  'bg-amber-500/10 text-amber-400'
                }`}>
                  <Activity className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{zone.name}</span>
                    <span className="text-[10px] font-mono font-bold bg-slate-800 text-orange-400 px-2 py-0.5 rounded border border-slate-700">
                      {zone.range}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{zone.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upload do Ficheiro Strava CSV */}
        <div className="bg-slate-800/70 p-5 rounded-2xl border border-slate-700/60 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-orange-400" /> Upload de Dados (Strava CSV)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Carrega o teu <code className="text-orange-300">activities.csv</code> para monitorizar treinos recentes.</p>
            </div>
            
            <div className="relative">
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleCSVUpload} 
                id="strava-csv-upload" 
                className="hidden" 
              />
              <label 
                htmlFor="strava-csv-upload"
                className="cursor-pointer bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all text-white font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-md"
              >
                <Upload className="w-3.5 h-3.5" /> Escolher Ficheiro
              </label>
            </div>
          </div>

          {csvStats ? (
            <div className="space-y-4">
              {csvRecentStats ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Recomendado: Últimos 6 Meses
                    </span>
                    <span className="text-[9px] text-slate-550">Dados a partir de 16/01/2026</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                      <span className="text-[9px] text-slate-400 block">Sessões</span>
                      <strong className="text-sm text-white">{csvRecentStats.totalActivities}</strong>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                      <span className="text-[9px] text-slate-400 block">Pace Médio</span>
                      <strong className="text-sm text-emerald-400">{csvRecentStats.avgPace}/km</strong>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                      <span className="text-[9px] text-slate-400 block">Melhor Ritmo</span>
                      <strong className="text-sm text-white">{csvRecentStats.bestPace}/km</strong>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button 
                      onClick={applyRecentPaceAsBase}
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" /> Aplicar Ritmo Recente
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/40 border border-slate-800 p-3.5 rounded-lg text-xs text-slate-400">
                  Não detetámos atividades nos últimos 6 meses.
                </div>
              )}

              <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4 space-y-3">
                <span className="text-xs text-slate-300 font-semibold block border-b border-slate-800 pb-2">Histórico Global Detetado</span>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-900/40 p-2 rounded border border-slate-800/60">
                    <span className="text-[9px] text-slate-400 block">Total Atividades</span>
                    <strong className="text-sm text-white">{csvStats.totalActivities}</strong>
                  </div>
                  <div className="bg-slate-900/40 p-2 rounded border border-slate-800/60">
                    <span className="text-[9px] text-slate-400 block">Pace Geral</span>
                    <strong className="text-sm text-orange-400">{csvStats.avgPace}/km</strong>
                  </div>
                  <div className="bg-slate-900/40 p-2 rounded border border-slate-800/60">
                    <span className="text-[9px] text-slate-400 block">Distância Acumulada</span>
                    <strong className="text-sm text-white">{csvStats.totalDistance} km</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/30 rounded-xl border border-dashed border-slate-800 p-8 text-center">
              <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-xs font-semibold">Nenhum ficheiro do Strava importado</p>
              <p className="text-slate-550 text-[10px] mt-1 max-w-sm mx-auto">
                Faz o upload do teu arquivo de atividades para sincronizar as zonas reais de corrida com o planeador.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // MOCKUP WEARABLES
  const renderSyncTab = () => {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800/70 p-5 rounded-2xl border border-slate-700/60 shadow-lg">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-orange-400" /> Sincronização de Sensores (Wearables)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Conecta o teu dispositivo de monitorização desportiva para cruzar os batimentos e a variabilidade da frequência cardíaca ($HRV$).
          </p>

          <div className="mt-6 space-y-4">
            <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FC6100]/10 flex items-center justify-center font-bold text-[#FC6100] text-sm flex-shrink-0">
                  S
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">Strava API</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Sincroniza automaticamente as atividades realizadas de forma direta.</p>
                </div>
              </div>
              <button
                onClick={() => handleConnectService('strava')}
                disabled={loadingSync}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  syncStatus.strava ? 'bg-red-500/10 text-red-400' : 'bg-[#FC6100] text-white hover:bg-[#e05600]'
                }`}
              >
                {loadingSync ? 'A ligar...' : syncStatus.strava ? 'Desconectar' : 'Ligar Strava'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderScienceTab = () => {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800/70 p-5 rounded-2xl border border-slate-700/60 shadow-lg">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-orange-400" /> Base Científica e Literária
          </h3>
          <div className="text-slate-300 text-xs mt-3 space-y-4 leading-relaxed">
            <div className="bg-slate-950/45 p-3 rounded-lg border border-slate-800">
              <strong className="text-orange-400 block mb-1">Mecânica de Corrida Fartlek (Andres, 2024)</strong>
              <p>O Fartlek ("jogo de velocidades") atua diretamente no limiar de lactato do atleta. Alternar ritmos sem interrupção ensina o músculo cardíaco a otimizar a reciclagem dos metabólitos em ritmos submáximos.</p>
            </div>
            <div className="bg-slate-950/45 p-3 rounded-lg border border-slate-800">
              <strong className="text-orange-400 block mb-1">Dose-Resposta do Treino de Volume (Guilherme, 2004)</strong>
              <p>O desenvolvimento aeróbico de longa duração através de rodagens lentas em $Z_2$ induz a capilarização do músculo esquelético, aumentando a densidade mitocondrial essencial para os $21.097\text{ km}$ da Meia Maratona.</p>
            </div>
            <div className="bg-slate-950/45 p-3 rounded-lg border border-slate-800">
              <strong className="text-orange-400 block mb-1">Treinamento de Força Concomitante (Balsalobre-Fernández, 2016)</strong>
              <p>O treino de força aumenta a rigidez muscular tendinosa ($Tendon\ Stiffness$). Com maior rigidez, cada impacto no asfalto armazena e devolve mais energia elástica, reduzindo o custo de oxigénio a cada passada.</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProfileTab = () => {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800/70 p-5 rounded-2xl border border-slate-700/60 shadow-lg">
          <h3 className="font-bold text-white text-sm">Perfil do Utilizador</h3>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Pace Base de Rodagem Confortável</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={basePaceStr}
                  onChange={(e) => setBasePaceStr(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none w-28 font-mono"
                />
                <button 
                  onClick={() => {
                    saveProfileField({ basePaceStr });
                    showToast("Pace de Rodagem atualizado com sucesso!");
                  }}
                  className="bg-orange-500 text-white font-bold text-xs px-3 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Atualizar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleConnectService = (service) => {
    setLoadingSync(true);
    setTimeout(() => {
      setSyncStatus(prev => {
        const next = { ...prev, [service]: !prev[service] };
        saveProfileField({ syncStatus: next });
        return next;
      });
      setLoadingSync(false);
      showToast(syncStatus[service] ? `Desconectado do ${service}.` : `Ligação estabelecida com sucesso ao ${service}!`);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-24 sm:pb-8">
      {/* HEADER PRINCIPAL */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
              M
            </div>
            <div>
              <h1 className="font-extrabold text-xs text-white tracking-tight flex items-center gap-1.5">
                THE MACHINE <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.2 rounded font-normal">v5.0</span>
              </h1>
              <p className="text-[10px] text-slate-400">Paternidade Ativa • 41 Anos • Meia do Rio 2027 🧘‍♂️</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
              🧘‍♂️ Yoga Ativo
            </span>
          </div>
        </div>
      </header>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'plan' && renderPlanTab()}
        {activeTab === 'strength' && renderStrengthTab()}
        {activeTab === 'ai_coach' && renderAiCoachTab()}
        {activeTab === 'dashboard' && renderDashboardTab()}
        {activeTab === 'sync' && renderSyncTab()}
        {activeTab === 'science' && renderScienceTab()}
        {activeTab === 'profile' && renderProfileTab()}
      </main>

      {/* TOAST NOTIFICATION */}
      {customNotification && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-750 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 z-50 animate-bounce text-xs max-w-md w-[90%]">
          <Info className="w-4 h-4 text-orange-400 flex-shrink-0" />
          <span className="font-medium leading-tight">{customNotification}</span>
        </div>
      )}

      {/* NAVEGAÇÃO BOTTOMBAR (MOBILE) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 sm:relative sm:mt-10 sm:border-t-0 sm:bg-transparent">
        <div className="max-w-md mx-auto sm:max-w-4xl flex items-center justify-around sm:justify-center sm:gap-5">
          <button 
            onClick={() => setActiveTab('plan')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'plan' ? 'text-orange-400 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span className="text-[9px] font-semibold">Corrida</span>
          </button>

          <button 
            onClick={() => setActiveTab('strength')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'strength' ? 'text-indigo-400 scale-105 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <KettlebellIcon className="w-4 h-4" />
            <span className="text-[9px] font-semibold">Força</span>
          </button>

          <button 
            onClick={() => setActiveTab('ai_coach')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'ai_coach' ? 'text-indigo-400 scale-105 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span className="text-[9px] font-semibold">Coach IA ✨</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'dashboard' ? 'text-orange-400 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span className="text-[9px] font-semibold">Métricas</span>
          </button>

          <button 
            onClick={() => setActiveTab('sync')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'sync' ? 'text-orange-400 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span className="text-[9px] font-semibold">Wearables</span>
          </button>

          <button 
            onClick={() => setActiveTab('science')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'science' ? 'text-orange-400 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-[9px] font-semibold">Ciência</span>
          </button>

          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'profile' ? 'text-orange-400 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <User className="w-4 h-4" />
            <span className="text-[9px] font-semibold">Perfil</span>
          </button>
        </div>
      </nav>

      {/* MODAL PARA EVOLUÇÃO DE CORRIDA */}
      {modalWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <h3 className="font-bold text-white text-sm mb-1">Registar Corrida Realizada</h3>
            <p className="text-[11px] text-orange-400 font-semibold mb-4">{modalWorkout.day} - {modalWorkout.title}</p>
            
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Distância (km)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="Ex: 5.20" 
                    value={actualDistance}
                    onChange={(e) => setActualDistance(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-white font-mono outline-none focus:border-orange-500/50"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Tempo (MM:SS)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 29:30" 
                    value={actualDuration}
                    onChange={(e) => setActualDuration(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-white font-mono outline-none focus:border-orange-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-medium flex justify-between">
                  <span>Esforço Percebido (RPE)</span>
                  <span className="font-bold text-orange-400">{rpe}/10</span>
                </label>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={rpe}
                  onChange={(e) => setRpe(e.target.value)}
                  className="w-full accent-orange-500" 
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-medium">Frequência Cardíaca Média (BPM - Opcional)</label>
                <input 
                  type="number" 
                  placeholder="Ex: 148" 
                  value={avgHr}
                  onChange={(e) => setAvgHr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-white font-mono outline-none focus:border-orange-500/50"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-medium">Notas Biomecânicas e de Sono</label>
                <textarea 
                  rows="2"
                  placeholder="Acordou a meio da noite? Sentiu os isquiotibiais soltos devido ao Yoga dinâmico?"
                  value={workoutNotes}
                  onChange={(e) => setWorkoutNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-white outline-none focus:border-orange-500/50 resize-none text-[11px]"
                ></textarea>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button 
                onClick={() => setModalWorkout(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs rounded-lg transition-colors border border-slate-750"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveWorkoutCompletion}
                className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg transition-colors shadow-lg"
              >
                Confirmar Registo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA EVOLUÇÃO DE FORÇA */}
      {modalStrengthWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <h3 className="font-bold text-white text-sm mb-1">Registar Cargas e Repetições</h3>
            <p className="text-[11px] text-indigo-400 font-semibold mb-4">{modalStrengthWorkout.day} - {modalStrengthWorkout.title}</p>
            
            <div className="space-y-4 text-xs max-h-[350px] overflow-y-auto pr-1">
              {modalStrengthWorkout.exercises.map((ex) => (
                <div key={ex.id} className="bg-slate-950/45 p-3 rounded-lg border border-slate-850 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{ex.name}</span>
                    <span className="text-[10px] text-indigo-400 font-mono font-bold">{ex.sets}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-[11px] text-slate-400">
                      {strengthMode === 'kettlebell' ? 'Carga (kg):' : 'Repetições por série:'}
                    </label>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <input 
                        type="text" 
                        placeholder={strengthMode === 'kettlebell' ? "Ex: 16" : "Ex: 10/10/8"}
                        value={strengthWeights[ex.id] || ''}
                        onChange={(e) => setStrengthWeights({
                          ...strengthWeights,
                          [ex.id]: e.target.value
                        })}
                        className="w-24 bg-slate-900 border border-slate-800 rounded p-1.5 text-center text-white font-mono focus:border-indigo-500/50 outline-none"
                      />
                      {strengthMode === 'kettlebell' && <span className="text-slate-500 font-medium">kg</span>}
                    </div>
                  </div>
                </div>
              ))}

              <div>
                <label className="text-slate-400 block mb-1 font-medium flex justify-between">
                  <span>Esforço Percebido (RPE)</span>
                  <span className="font-bold text-indigo-400">{strengthRpe}/10</span>
                </label>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={strengthRpe}
                  onChange={(e) => setStrengthRpe(e.target.value)}
                  className="w-full accent-indigo-500" 
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-medium">Observações da Sessão</label>
                <textarea 
                  rows="2"
                  placeholder="Sentiu dor na lombar? Executou de forma confortável?"
                  value={strengthNotes}
                  onChange={(e) => setStrengthNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500/50 resize-none text-[11px]"
                ></textarea>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button 
                onClick={() => setModalStrengthWorkout(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs rounded-lg transition-colors border border-slate-750"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveStrengthCompletion}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-colors shadow-lg"
              >
                Guardar Treino
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}