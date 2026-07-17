import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Calendar, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Settings, 
  Heart, 
  Award, 
  Info, 
  User, 
  Share2, 
  CheckCircle, 
  Circle, 
  Sparkles, 
  Clock, 
  Compass, 
  MapPin, 
  RotateCcw, 
  Upload, 
  Download, 
  ChevronRight, 
  ChevronLeft, 
  BookOpen, 
  Send,
  Loader,
  Smartphone,
  Check
} from 'lucide-react';

// --- INICIALIZAÇÃO SEGURA DO FIREBASE (Evita ReferenceError no Inspetor) ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// Função auxiliar para verificar globais com segurança
const obterVariavelGlobal = (nome) => {
  try {
    if (typeof window !== 'undefined' && window[nome] !== undefined) {
      return window[nome];
    }
  } catch (e) {}
  return undefined;
};

// Captura segura das configurações injetadas pelo ambiente
const firebaseConfigRaw = typeof __firebase_config !== 'undefined' ? __firebase_config : obterVariavelGlobal('__firebase_config');
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : (obterVariavelGlobal('__app_id') || 'run-for-cover-default');
// Sanitização crucial do appId para evitar segmentos ímpares causados por barras inclinadas (/)
const appId = rawAppId.replace(/\//g, '_');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : obterVariavelGlobal('__initial_auth_token');

const obterApiKeyGemini = () => {
  try {
    if (typeof window !== 'undefined') {
      const chaves = [
        window.__gemini_api_key,
        window.__GEMINI_API_KEY,
        window.geminiApiKey
      ];

      for (const chave of chaves) {
        if (typeof chave === 'string' && chave.trim()) {
          return chave.trim();
        }
      }
    }

    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const chaveEnv = import.meta.env.VITE_GEMINI_API_KEY;
      if (typeof chaveEnv === 'string' && chaveEnv.trim()) {
        return chaveEnv.trim();
      }
    }
  } catch (e) {
    console.warn('Não foi possível ler a chave do Gemini:', e);
  }

  return '';
};

let firebaseApp = null;
let auth = null;
let db = null;
let firebaseAtivo = false;

if (firebaseConfigRaw) {
  try {
    const parsedConfig = typeof firebaseConfigRaw === 'string' ? JSON.parse(firebaseConfigRaw) : firebaseConfigRaw;
    if (parsedConfig && parsedConfig.apiKey) {
      firebaseApp = initializeApp(parsedConfig);
      auth = getAuth(firebaseApp);
      db = getFirestore(firebaseApp);
      firebaseAtivo = true;
      console.log("Firebase inicializado com sucesso para o ID de Artifact:", appId);
    }
  } catch (e) {
    console.warn("Firebase não pôde ser inicializado (Modo de demonstração offline ativo):", e);
  }
}

// Prompt do Sistema para o Treinador de Inteligência Artificial "The Machine"
const PROMPT_SISTEMA_COACH = `
És o "The Machine AI Coach", um treinador de corrida de elite de nível mundial, especializado em fisiologia do esforço e periodização desportiva de longo prazo.
Deves responder sempre em Português de Portugal (PT-PT), utilizando termos como "utilizador", "telemóvel", "registo", "ecrã", "treinos", "corridas", "gémeos", "meia maratona".
O teu conhecimento científico baseia-se fortemente em:
1. Treinamento Fartlek (Andres, 2024): A importância do jogo de velocidades, variação de intensidade, adaptações neuromusculares e aeróbias.
2. Desenvolvimento de Atletas de Longo Prazo (Guilherme, 2004): O foco na base aeróbia (Zona 2) para expandir o leito capilar e mitocôndrias de forma segura, prevenindo lesões.
3. Notação de Fisiologia Matemática: Usa LaTeX para fórmulas se falares sobre $VO_2\\max$, Limiar de Lactato, Economia de Corrida ($RE$), etc.
4. Sincronização diária de Yoga: Apoia a realização de Yoga (20-25 min) para flexibilidade, mobilidade e recuperação activa das articulações.

Responde de forma encorajadora, altamente técnica mas acessível, dando dicas de treino com base nas estatísticas de corrida do utilizador.
`;

export default function App() {
  // --- ESTADOS DO UTILIZADOR E AUTENTICAÇÃO ---
  const [user, setUser] = useState(null);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [conexaoFirebase, setConexaoFirebase] = useState(firebaseAtivo);

  // --- ESTADOS DA APLICAÇÃO ---
  const [separadorAtivo, setSeparadorAtivo] = useState('treinos'); // treinos, fisiologia, atividades, coach
  const [semanaAtiva, setSemanaAtiva] = useState(1);
  const [treinosConcluidos, setTreinosConcluidos] = useState({}); // { workoutId: boolean }
  const [yogaCompletoHoje, setYogaCompletoHoje] = useState(false);
  const [atividadesImportadas, setAtividadesImportadas] = useState([]);
  
  // --- CALCULADORA DE FISIOLOGIA ---
  const [idade, setIdade] = useState(30);
  const [fcRepouso, setFcRepouso] = useState(55);
  const [fcMaxima, setFcMaxima] = useState(185);
  const [distanciaCooper, setDistanciaCooper] = useState(2400); // 12-min cooper test em metros

  // --- COGNITIVE CHAT STATE ("THE MACHINE") ---
  const [mensagensChat, setMensagensChat] = useState([
    { 
      id: "welcome", 
      sender: "coach", 
      text: "Olá! Sou o **The Machine AI Coach**. Com base nos estudos de periodização de longo prazo e no treino Fartlek que submeteste, preparei o teu planeamento para a Meia Maratona (16 semanas). Como correu o teu dia de hoje? Fizeste a sessão de Yoga regenerativo de 20 minutos?" 
    }
  ]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [chatEnviando, setChatEnviando] = useState(false);

  // --- INTERATIVIDADE DE CONEXÕES ---
  const [stravaConectado, setStravaConectado] = useState(false);
  const [googleFitConectado, setGoogleFitConectado] = useState(false);
  const [samsungHealthConectado, setSamsungHealthConectado] = useState(false);
  const [mostrarModalConexao, setMostrarModalConexao] = useState(null); // 'strava', 'gfit', 'samsung'
  
  // Toasts personalizados para ecrãs móveis
  const [notificacao, setNotificacao] = useState(null);

  const containerChatRef = useRef(null);

  // Exibir Toast Informativo
  const exibirNotificacao = (mensagem, tipo = 'info') => {
    setNotificacao({ mensagem, tipo });
    setTimeout(() => setNotificacao(null), 4000);
  };

  // --- DINÂMICA DE CARREGAMENTO DO KATEX PARA FÓRMULAS ---
  useEffect(() => {
    // Carregar folha de estilos do KaTeX
    if (!document.getElementById('katex-css')) {
      const link = document.createElement('link');
      link.id = 'katex-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
      document.head.appendChild(link);
    }

    // Carregar script do KaTeX
    const scriptKaTeX = document.createElement('script');
    scriptKaTeX.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
    scriptKaTeX.async = true;
    scriptKaTeX.onload = () => {
      const scriptAutoRender = document.createElement('script');
      scriptAutoRender.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js';
      scriptAutoRender.async = true;
      scriptAutoRender.onload = () => {
        renderizarFórmulasMatematicas();
      };
      document.head.appendChild(scriptAutoRender);
    };
    document.head.appendChild(scriptKaTeX);
  }, [separadorAtivo]);

  const renderizarFórmulasMatematicas = () => {
    try {
      if (window.renderMathInElement) {
        window.renderMathInElement(document.body, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false
        });
      }
    } catch (e) {
      console.warn("Erro ao processar KaTeX:", e);
    }
  };

  useEffect(() => {
    renderizarFórmulasMatematicas();
  }, [separadorAtivo, idade, fcRepouso, fcMaxima, distanciaCooper]);

  // --- GESTÃO DE ESTADO DO FIREBASE E AUTENTICAÇÃO (REGRA 3) ---
  useEffect(() => {
    let unsubscribeAuth = () => {};
    let unsubscribeFirestore = () => {};

    const inicializarAutenticacao = async () => {
      if (!firebaseAtivo || !auth) {
        // Fallback para armazenamento Local offline
        carregarEstadoOffline();
        setCarregandoDados(false);
        return;
      }

      try {
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (erroAuth) {
        console.error("Falha ao autenticar com Firebase. Ativando Modo Offline:", erroAuth);
        carregarEstadoOffline();
        setCarregandoDados(false);
      }
    };

    inicializarAutenticacao();

    if (auth) {
      unsubscribeAuth = onAuthStateChanged(auth, (loggedUser) => {
        unsubscribeFirestore();

        if (loggedUser) {
          setUser(loggedUser);
          setConexaoFirebase(true);
          unsubscribeFirestore = sincronizarComFirestore(loggedUser) || (() => {});
        } else {
          setUser(null);
          carregarEstadoOffline();
          setCarregandoDados(false);
        }
      });
    }

    return () => {
      unsubscribeAuth();
      unsubscribeFirestore();
    };
  }, []);

  // --- CARREGA SALVAMENTOS EM LOCAL STORAGE (MODO LOCAL) ---
  const carregarEstadoOffline = () => {
    try {
      const localTicks = localStorage.getItem('run_cover_ticks');
      const localYoga = localStorage.getItem('run_cover_yoga');
      const localActivities = localStorage.getItem('run_cover_activities');

      if (localTicks) setTreinosConcluidos(JSON.parse(localTicks));
      if (localYoga) setYogaCompletoHoje(JSON.parse(localYoga) === true);
      if (localActivities) setAtividadesImportadas(JSON.parse(localActivities));
      
      console.log("Estado de dados locais carregado com sucesso do armazenamento local do telemóvel.");
    } catch (e) {
      console.error("Erro ao ler armazenamento local:", e);
    }
  };

  // --- SYNC COM FIRESTORE USANDO REGRAS RÍGIDAS DE SEGURANÇA (REGRA 1 & 2) ---
  const sincronizarComFirestore = (loggedUser) => {
    if (!db || !loggedUser) return;

    // A variável "appId" foi sanitizada anteriormente, logo este caminho terá exatamente 6 segmentos
    const docRefAtletas = doc(db, 'artifacts', appId, 'users', loggedUser.uid, 'dados_treinamento', 'progresso');

    // Escuta em tempo real as marcações e atividades do atleta
    const unsubscribeSnapshot = onSnapshot(docRefAtletas, (snapshot) => {
      if (snapshot.exists()) {
        const dados = snapshot.data();
        if (dados.treinosConcluidos) setTreinosConcluidos(dados.treinosConcluidos);
        if (dados.yogaCompletoHoje !== undefined) setYogaCompletoHoje(dados.yogaCompletoHoje);
        if (dados.atividadesImportadas) setAtividadesImportadas(dados.atividadesImportadas);
      } else {
        // Se for a primeira vez, inicializa documento padrão no Firestore
        setDoc(docRefAtletas, {
          treinosConcluidos: {},
          yogaCompletoHoje: false,
          atividadesImportadas: []
        }).catch(e => console.error("Erro ao iniciar dados no Firestore:", e));
      }
      setCarregandoDados(false);
    }, (erro) => {
      console.error("Erro na sincronização em tempo real do Firestore:", erro);
      carregarEstadoOffline();
      setCarregandoDados(false);
    });

    return () => unsubscribeSnapshot();
  };

  // --- PERSISTÊNCIA INTELIGENTE DE PROGRESSO ---
  const atualizarProgresso = async (novosTicks, novoYoga, novasAtividades) => {
    const ticks = novosTicks !== undefined ? novosTicks : treinosConcluidos;
    const yoga = novoYoga !== undefined ? novoYoga : yogaCompletoHoje;
    const atividades = novasAtividades !== undefined ? novasAtividades : atividadesImportadas;

    // Atualiza estados locais de imediato
    if (novosTicks !== undefined) setTreinosConcluidos(novosTicks);
    if (novoYoga !== undefined) setYogaCompletoHoje(novoYoga);
    if (novasAtividades !== undefined) setAtividadesImportadas(novasAtividades);

    // Persiste localmente (Backup)
    localStorage.setItem('run_cover_ticks', JSON.stringify(ticks));
    localStorage.setItem('run_cover_yoga', JSON.stringify(yoga));
    localStorage.setItem('run_cover_activities', JSON.stringify(atividades));

    // Se houver Firebase ativo, persiste na Cloud do utilizador (REGRA 1)
    if (db && user) {
      try {
        const docRefAtletas = doc(db, 'artifacts', appId, 'users', user.uid, 'dados_treinamento', 'progresso');
        await setDoc(docRefAtletas, {
          treinosConcluidos: ticks,
          yogaCompletoHoje: yoga,
          atividadesImportadas: atividades,
          ultimoAcesso: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error("Erro ao salvar progresso na Cloud:", err);
      }
    }
  };

  // --- ALGORITMO CIENTÍFICO DO PROGRAMA DE 16 SEMANAS ---
  const obterPlanilhaSemanas = () => {
    const plan = [];
    for (let w = 1; w <= 16; w++) {
      let fase = "";
      let longDist = 6 + Math.floor(w * 0.9); // Começa nos 7km e evolui de forma segura
      let fartlekReps = 5 + Math.floor(w / 3);
      let tempoDist = 4 + Math.floor(w * 0.4);

      // Definição de Fases baseadas nos uploads científicos do utilizador
      if (w <= 4) {
        fase = "Fase 1: Adaptação Muscular e Base Aeróbia (Guilherme, 2004)";
        if (w === 4) { fase = "Fase 1: Semana de Recuperação Ativa"; longDist = 6; tempoDist = 4; }
      } else if (w <= 8) {
        fase = "Fase 2: Eficiência Cardiovascular e Ritmo (Andres, 2024)";
        if (w === 8) { fase = "Fase 2: Semana de Recuperação Ativa"; longDist = 8; tempoDist = 5; }
      } else if (w <= 12) {
        fase = "Fase 3: Potência Aeróbia e Resistência de Subida";
        if (w === 12) { fase = "Fase 3: Semana de Recuperação Ativa"; longDist = 10; tempoDist = 6; }
      } else if (w <= 15) {
        fase = "Fase 4: Pico de Volume e Polimento Fisiológico";
        if (w === 15) { fase = "Semana de Pico Máximo & Polimento Inicial"; longDist = 18; }
      } else {
        fase = "Fase 5: Polimento Final e Competição da Meia Maratona!";
        longDist = 21.1;
      }

      plan.push({
        semana: w,
        fase,
        treinos: [
          {
            id: `w${w}_tue`,
            dia: "Terça-feira",
            tipo: "Fartlek (Ritmo)",
            titulo: `Fartlek de Variação de Ritmo - W${w}`,
            descricao: w === 16
              ? "Ativação ligeira neuromuscular: 10 min de corrida muito lenta + 3 acelerações suaves de 30 segundos com foco na amplitude de passada."
              : `Aquecimento de 10 min + ${fartlekReps}x (2 min em Ritmo de Corrida Forte / 1 min Trote Lento de recuperação) + 5 min de trote final. Desenvolve a flexibilidade metabólica.`,
            distanciaAlvo: w === 16 ? "3.0 km" : `${(4 + w * 0.3).toFixed(1)} km`,
            referenciaCientifica: "Andres (2024) - Fartlek"
          },
          {
            id: `w${w}_thu`,
            dia: "Quinta-feira",
            tipo: "Limiar Aeróbio",
            titulo: `Limiar de Lactato e Isometria - W${w}`,
            descricao: w === 16
              ? "Ativação de pernas sem fadiga: 20 min fáceis seguidos de alongamento passivo."
              : `15 min aquecimento + ${tempoDist} km em Ritmo de Limiar de Lactato (Zona 4) + 10 min de exercícios de isometria de esforço para estabilizar joelhos e tendões.`,
            distanciaAlvo: w === 16 ? "4.0 km" : `${tempoDist.toFixed(1)} km`,
            referenciaCientifica: "Guilherme (2004) - Adaptações Fisiológicas"
          },
          {
            id: `w${w}_sat`,
            dia: "Sábado ou Domingo",
            tipo: "Longão Zona 2",
            titulo: w === 16 ? "A Grande Meia Maratona (21.097 km)!" : `Desenvolvimento de Longo Prazo - W${w}`,
            descricao: w === 16
              ? "O dia do objetivo! Ritmo estável, hidratação estruturada a cada 3 km e atitude mental focada. Confia no teu processo aeróbio longo."
              : `Corrida contínua longa mantendo rigorosamente a Zona 2 (fácil de conversar). O objetivo é expandir os teus leitos capilares e aumentar a densidade mitocondrial de forma ultra-segura.`,
            distanciaAlvo: `${longDist.toFixed(1)} km`,
            referenciaCientifica: "Guilherme (2004) - Capacidade Aeróbia"
          }
        ]
      });
    }
    return plan;
  };

  const semanasPlanilha = obterPlanilhaSemanas();
  const semanaAtualDados = semanasPlanilha.find(s => s.semana === semanaAtiva) || semanasPlanilha[0];

  // --- CÁLCULO DE MÉTRICAS FISIOLÓGICAS (LaTeX Renderizado) ---
  const calcularMetricasFisiologicas = () => {
    // VO2 Max estimado pela fórmula de Uth et al.
    // VO2max = 15.4 * (FCmax / FC_repouso)
    const vo2maxUth = (15.4 * (fcMaxima / fcRepouso)).toFixed(1);
    
    // VO2 Max estimado pelo Cooper Test (Distancia em metros - 504.9) / 44.73
    const vo2maxCooper = ((distanciaCooper - 504.9) / 44.73).toFixed(1);

    // Zonas de frequência cardíaca de Karvonen
    // FC_alvo = ((FCmax - FC_repouso) * %intensidade) + FC_repouso
    const fcr = fcMaxima - fcRepouso;
    
    return {
      vo2maxUth,
      vo2maxCooper,
      zonas: [
        { nome: "Zona 1 (Recuperação)", min: Math.round(fcr * 0.5 + fcRepouso), max: Math.round(fcr * 0.6 + fcRepouso), desc: "Trote regenerativo, regeneração celular acelerada." },
        { nome: "Zona 2 (Base Aeróbia)", min: Math.round(fcr * 0.6 + fcRepouso), max: Math.round(fcr * 0.7 + fcRepouso), desc: "Capilarização, aumento de mitocôndrias (Guilherme, 2004)." },
        { nome: "Zona 3 (Sub-Limiar)", min: Math.round(fcr * 0.7 + fcRepouso), max: Math.round(fcr * 0.8 + fcRepouso), desc: "Melhoria do ritmo de cruzeiro e economia de corrida." },
        { nome: "Zona 4 (Limiar de Lactato)", min: Math.round(fcr * 0.8 + fcRepouso), max: Math.round(fcr * 0.9 + fcRepouso), desc: "Resistência de lactato e tolerância à acidez (Andres, 2024)." },
        { nome: "Zona 5 (Capacidade Anaeróbia)", min: Math.round(fcr * 0.9 + fcRepouso), max: fcMaxima, desc: "Sprints curtos, estimulação máxima do VO2max." }
      ]
    };
  };

  const fisiologia = calcularMetricasFisiologicas();

  // --- MOTOR DE IMPORTAÇÃO DE FICHEIROS CSV (Atividades do Strava) ---
  const processarUploadCSV = (evento) => {
    const file = evento.target.files[0];
    if (!file) return;

    const leitor = new FileReader();
    leitor.onload = (e) => {
      const conteudo = e.target.result;
      const linhas = conteudo.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      if (linhas.length < 2) {
        exibirNotificacao("Ficheiro CSV vazio ou inválido.", "error");
        return;
      }

      // Identifica o separador de campos (, ; ou |)
      let separador = ',';
      if (linhas[0].includes('|')) separador = '|';
      else if (linhas[0].includes(';')) separador = ';';

      const cabecalhos = linhas[0].split(separador).map(h => h.trim().replace(/^"|"$/g, ''));
      const novasAtividades = [];

      for (let i = 1; i < linhas.length; i++) {
        const valores = linhas[i].split(separador).map(v => v.trim().replace(/^"|"$/g, ''));
        if (valores.length < cabecalhos.length) continue;

        const dadosAtividade = {};
        cabecalhos.forEach((header, idx) => {
          dadosAtividade[header] = valores[idx];
        });

        // Tenta capturar dados úteis da atividade do Strava
        const dataOriginal = dadosAtividade['Activity Date'] || dadosAtividade['Start Time'] || new Date().toLocaleDateString('pt-PT');
        const distanciaMetros = parseFloat(dadosAtividade['Distance'] || 0);
        const distanciaKm = distanciaMetros > 100 ? (distanciaMetros / 1000).toFixed(2) : parseFloat(dadosAtividade['Distance'] || 0).toFixed(2);
        const tempoSegundos = parseInt(dadosAtividade['Elapsed Time'] || dadosAtividade['Moving Time'] || 0);
        const tempoMinutos = tempoSegundos > 0 ? (tempoSegundos / 60).toFixed(1) : "30.0";
        const nomeCorrida = dadosAtividade['Activity Name'] || 'Corrida de Treino';
        const tipoAtividade = dadosAtividade['Activity Type'] || 'Run';

        if (tipoAtividade === 'Run' || tipoAtividade === 'Corrida' || nomeCorrida.toLowerCase().includes('run') || nomeCorrida.toLowerCase().includes('corrida')) {
          novasAtividades.push({
            id: dadosAtividade['Activity ID'] || Math.random().toString(36).substr(2, 9),
            nome: nomeCorrida,
            data: dataOriginal,
            distancia: distanciaKm,
            duracao: tempoMinutos,
            esforco: dadosAtividade['Max Heart Rate'] || '165'
          });
        }
      }

      if (novasAtividades.length > 0) {
        const listaFinalAtividades = [...novasAtividades.slice(0, 20), ...atividadesImportadas];
        atualizarProgresso(undefined, undefined, listaFinalAtividades);
        exibirNotificacao(`Sincronizadas ${novasAtividades.length} atividades de corrida com sucesso!`, "success");
        
        // Adiciona notificação de chat personalizada baseada na importação
        setMensagensChat(prev => [
          ...prev,
          {
            id: `system_import_${Date.now()}`,
            sender: "coach",
            text: `Perfeito! Analisei as tuas atividades importadas do Strava (total de **${novasAtividades.length}** registos). Detetei uma distância média de corrida de **${novasAtividades[0].distancia} km**. Isto confirma que a tua base metabólica está pronta para começarmos a intensificar os treinos de terças-feiras utilizando a metodologia Fartlek (Andres, 2024). Mantém o foco no volume controlado de fim de semana!`
          }
        ]);
      } else {
        exibirNotificacao("Nenhuma atividade do tipo Corrida ('Run') encontrada no ficheiro.", "error");
      }
    };

    leitor.readAsText(file);
  };

  // --- ENVIO DE MENSAGENS PARA O TREINADOR DE CORRIDA "THE MACHINE" ---
  const enviarMensagemChat = async () => {
    if (!novaMensagem.trim() || chatEnviando) return;

    const messageToSubmit = novaMensagem.trim();
    setNovaMensagem("");
    setChatEnviando(true);

    const idMensagemUtilizador = `user_${Date.now()}`;
    const novasMensagens = [
      ...mensagensChat,
      { id: idMensagemUtilizador, sender: "user", text: messageToSubmit }
    ];
    setMensagensChat(novasMensagens);

    // Rolar chat para o final
    setTimeout(() => {
      if (containerChatRef.current) {
        containerChatRef.current.scrollTop = containerChatRef.current.scrollHeight;
      }
    }, 100);

    // Constrói contexto contextualizado com o progresso do atleta
    const treinosConcluidosNum = Object.values(treinosConcluidos).filter(Boolean).length;
    const totalTreinosDisponiveis = 16 * 3;
    const progressoPercentagem = ((treinosConcluidosNum / totalTreinosDisponiveis) * 100).toFixed(0);

    const queryFisiologica = `
    O utilizador tem atualmente:
    - Idade: ${idade} anos
    - Frequência Cardíaca de Repouso: ${fcRepouso} bpm
    - Frequência Cardíaca Máxima: ${fcMaxima} bpm
    - VO2 Max estimado de base: ${fisiologia.vo2maxUth} ml/kg/min (Karvonen)
    - Conclusão do plano de Meia Maratona: ${progressoPercentagem}% concluído (${treinosConcluidosNum} de ${totalTreinosDisponiveis} treinos)
    - Sincronização diária de Yoga: ${yogaCompletoHoje ? "EFETUADO HOJE" : "Pendente hoje"}
    - Atividades Strava importadas: ${atividadesImportadas.length} corridas guardadas no telemóvel.

    Questão do Utilizador: ${messageToSubmit}
    `;

    // Implementação resiliente da chamada à API Gemini com Exponential Backoff (conforme diretrizes)
    const apiCallWithRetry = async (retryCount = 0) => {
      const apiKey = obterApiKeyGemini();
      if (!apiKey) {
        throw new Error('Chave de API do Gemini não encontrada.');
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      
      const payload = {
        contents: [
          { parts: [{ text: queryFisiologica }] }
        ],
        systemInstruction: {
          parts: [{ text: PROMPT_SISTEMA_COACH }]
        }
      };

      try {
        const resposta = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!resposta.ok) {
          throw new Error(`HTTP erro ${resposta.status}`);
        }

        const data = await resposta.json();
        const textoResposta = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!textoResposta) {
          throw new Error("Resposta vazia da API do Gemini.");
        }

        return textoResposta;
      } catch (err) {
        if (retryCount < 5) {
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          return apiCallWithRetry(retryCount + 1);
        }
        throw err;
      }
    };

    try {
      const respostaIA = await apiCallWithRetry();
      
      setMensagensChat(prev => [
        ...prev,
        { id: `coach_${Date.now()}`, sender: "coach", text: respostaIA }
      ]);
    } catch (erro) {
      console.error("Falha no Gemini API:", erro);
      setMensagensChat(prev => [
        ...prev,
        { 
          id: `coach_err_${Date.now()}`, 
          sender: "coach", 
          text: "Estou com dificuldades de comunicação com os satélites de fisiologia desportiva de momento. No entanto, com base no estudo de Andres (2024), lembra-te que os treinos Fartlek requerem variação ativa de intensidade e o teu Yoga diário é fundamental para estabilizar os flexores da anca!" 
        }
      ]);
    } finally {
      setChatEnviando(false);
      setTimeout(() => {
        if (containerChatRef.current) {
          containerChatRef.current.scrollTop = containerChatRef.current.scrollHeight;
        }
        renderizarFórmulasMatematicas();
      }, 100);
    }
  };

  // Tecla Enter no Chat
  const tratarKeyDownChat = (e) => {
    if (e.key === 'Enter') {
      enviarMensagemChat();
    }
  };

  // --- SIMULAÇÃO DE SINCRONIZAÇÃO INTELIGENTE DE DISPOSITIVOS ---
  const simularConexaoDispositivo = (dispositivo) => {
    setMostrarModalConexao(dispositivo);
  };

  const confirmarSincronizacaoDispositivo = (dispositivo) => {
    if (dispositivo === 'strava') {
      setStravaConectado(true);
      // Simulação de injeção de corridas reais do Strava
      const corridasInjetadas = [
        { id: "st_1", nome: "Treino de Fartlek Matinal (Andres 2024)", data: "Hoje", distancia: "6.50", duracao: "32.5", esforco: "172" },
        { id: "st_2", nome: "Longão em Zona 2 Confortável", data: "Ontem", distancia: "12.00", duracao: "71.0", esforco: "148" },
        { id: "st_3", nome: "Treino de Ritmo e Isometria", data: "Há 3 dias", distancia: "8.20", duracao: "44.1", esforco: "160" }
      ];
      atualizarProgresso(undefined, undefined, [...corridasInjetadas, ...atividadesImportadas]);
    } else if (dispositivo === 'gfit') {
      setGoogleFitConectado(true);
    } else if (dispositivo === 'samsung') {
      setSamsungHealthConectado(true);
    }
    
    setMostrarModalConexao(null);
    exibirNotificacao(`Sincronizado com ${dispositivo.toUpperCase()} com sucesso!`, "success");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased px-4 py-6 flex flex-col items-center gap-6 md:flex-row md:items-start md:justify-center">
      <div className="w-full max-w-[1120px] mx-auto flex flex-col items-center gap-6 md:flex-row md:items-start md:justify-center">
      
      {/* Banner de Notificação Personalizada */}
      {notificacao && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 transition-all transform duration-300 ${
          notificacao.tipo === 'success' ? 'bg-emerald-500 text-slate-950' : 
          notificacao.tipo === 'error' ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white'
        }`}>
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <span className="font-semibold text-sm">{notificacao.mensagem}</span>
        </div>
      )}

      {/* PAINEL LATERAL ESQUERDO: DISPOSITIVO MÓVEL EM ECRÃ INTEIRO NO TELEMÓVEL */}
      <div className="w-full max-w-[480px] md:w-[440px] border border-slate-800/80 bg-slate-900/95 shadow-2xl shadow-slate-950/40 rounded-[36px] overflow-hidden ring-1 ring-slate-800/60 backdrop-blur-xl flex flex-col flex-shrink-0">
        
        {/* Topo do Telemóvel */}
        <div className="p-4 bg-slate-950/95 border-b border-slate-800/70 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
            <div>
              <h1 className="font-bold tracking-tight text-md">RUN FOR COVER</h1>
              <p className="text-xs text-slate-400">Telemóvel Ativo • Meia Maratona</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
              conexaoFirebase ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {conexaoFirebase ? 'Sincronizado' : 'Modo Local'}
            </span>
            <Smartphone className="w-5 h-5 text-slate-400" />
          </div>
        </div>

        {/* CARD DIÁRIO DO CO-PROCESSO YOGA (20-25 minutos) */}
        <div className="p-4 bg-gradient-to-r from-indigo-950/80 to-slate-950/40 border-b border-indigo-900/30 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 flex-shrink-0">
                🧘‍♂️
              </div>
              <div>
                <h3 className="font-bold text-sm text-indigo-200">Sessão Diária de Yoga</h3>
                <p className="text-xs text-indigo-300 mt-0.5">Alongamento Excêntrico e Alinhamento Ativo</p>
                <span className="inline-block mt-2 text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full font-semibold">
                  20 a 25 min • Sem Fadiga
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                const novoEstado = !yogaCompletoHoje;
                atualizarProgresso(undefined, novoEstado, undefined);
                exibirNotificacao(novoEstado ? "Yoga do dia completado! Inteligência Artificial atualizada." : "Yoga marcado como incompleto.", "info");
              }}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${
                yogaCompletoHoje 
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                  : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20'
              }`}
            >
              {yogaCompletoHoje ? <Check className="w-5 h-5 stroke-[3]" /> : <Circle className="w-5 h-5" />}
            </button>
          </div>
          {yogaCompletoHoje && (
            <div className="mt-3 text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 p-2 rounded-lg">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Concluído! Treinador AI atualizou as recomendações de esforço.</span>
            </div>
          )}
        </div>

        {/* NAVEGAÇÃO DOS SEPARADORES NO TELEMÓVEL */}
        <div className="grid grid-cols-4 bg-slate-950/95 p-2 gap-2 border-b border-slate-800/70">
          <button
            onClick={() => setSeparadorAtivo('treinos')}
            className={`py-2 px-1 text-center rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
              separadorAtivo === 'treinos' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span className="text-[10px]">Treinos</span>
          </button>
          
          <button
            onClick={() => setSeparadorAtivo('fisiologia')}
            className={`py-2 px-1 text-center rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
              separadorAtivo === 'fisiologia' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px]">Fisiologia</span>
          </button>

          <button
            onClick={() => setSeparadorAtivo('atividades')}
            className={`py-2 px-1 text-center rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
              separadorAtivo === 'atividades' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span className="text-[10px]">Atividades</span>
          </button>

          <button
            onClick={() => setSeparadorAtivo('coach')}
            className={`py-2 px-1 text-center rounded-lg flex flex-col items-center justify-center gap-1 transition-all relative ${
              separadorAtivo === 'coach' ? 'bg-slate-800 text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px]">Coach IA</span>
            <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-indigo-500"></span>
          </button>
        </div>

        {/* ÁREA DE CONTEÚDO SCROLL DO TELEMÓVEL */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 max-h-[calc(100vh-240px)] md:max-h-[none]">
          
          {carregandoDados ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-sm text-slate-400">Sincronizando estatísticas...</p>
            </div>
          ) : (
            <>
              {/* SEPARADOR: PLANILHA DE TREINOS DE 16 SEMANAS */}
              {separadorAtivo === 'treinos' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-100 flex items-center gap-1.5">
                        <span>Planilha de Corrida</span>
                      </h2>
                      <p className="text-xs text-slate-400">{semanaAtualDados.fase}</p>
                    </div>
                  </div>

                  {/* Seleção deslizante de semanas */}
                  <div className="flex items-center justify-between bg-slate-950/90 p-3 rounded-3xl border border-slate-800/60 shadow-sm">
                    <button 
                      onClick={() => setSemanaAtiva(prev => Math.max(1, prev - 1))}
                      disabled={semanaAtiva === 1}
                      className="p-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-5 h-5 text-slate-300" />
                    </button>
                    <span className="font-bold text-sm text-emerald-400">SEMANA {semanaAtiva} DE 16</span>
                    <button 
                      onClick={() => setSemanaAtiva(prev => Math.min(16, prev + 1))}
                      disabled={semanaAtiva === 16}
                      className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30"
                    >
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    </button>
                  </div>

                  {/* Lista de Treinos da Semana */}
                  <div className="space-y-3">
                    {semanaAtualDados.treinos.map((treino) => {
                      const concluido = !!treinosConcluidos[treino.id];
                      return (
                        <div 
                          key={treino.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            concluido 
                              ? 'bg-slate-950/60 border-emerald-500/40 text-slate-300' 
                              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                                {treino.dia}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500">
                                {treino.referenciaCientifica}
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                const novosTicks = { ...treinosConcluidos, [treino.id]: !concluido };
                                atualizarProgresso(novosTicks, undefined, undefined);
                                exibirNotificacao(concluido ? "Treino desmarcado" : "Corrida guardada com sucesso! Treinador AI atualizado.", "success");
                              }}
                              className={`p-1.5 rounded-2xl border transition-all ${
                                concluido 
                                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
                              }`}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          </div>

                          <h4 className="font-bold text-sm mt-2 text-slate-100">{treino.titulo}</h4>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{treino.descricao}</p>
                          
                          <div className="mt-3 flex items-center justify-between border-t border-slate-800/60 pt-2 text-xs">
                            <span className="text-slate-500">Distância Prevista</span>
                            <span className="font-bold text-emerald-400 text-sm">{treino.distanciaAlvo}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SEPARADOR: FISIOLOGIA CIENTÍFICA */}
              {separadorAtivo === 'fisiologia' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-100">Calculadora Científica</h2>
                    <p className="text-xs text-slate-400">Estudos de Fisiologia Desportiva Aplicada</p>
                  </div>

                  {/* Formulário de Input Fisiológico */}
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Idade</label>
                        <input 
                          type="number" 
                          value={idade}
                          onChange={(e) => setIdade(parseInt(e.target.value) || 30)}
                          className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sm focus:outline-none focus:border-emerald-500 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">FC Max (bpm)</label>
                        <input 
                          type="number" 
                          value={fcMaxima}
                          onChange={(e) => setFcMaxima(parseInt(e.target.value) || 185)}
                          className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sm focus:outline-none focus:border-emerald-500 text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">FC Repouso (bpm)</label>
                        <input 
                          type="number" 
                          value={fcRepouso}
                          onChange={(e) => setFcRepouso(parseInt(e.target.value) || 55)}
                          className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sm focus:outline-none focus:border-emerald-500 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Cooper (12 min)</label>
                        <input 
                          type="number" 
                          value={distanciaCooper}
                          onChange={(e) => setDistanciaCooper(parseInt(e.target.value) || 2400)}
                          className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sm focus:outline-none focus:border-emerald-500 text-slate-100"
                          placeholder="Metros"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fórmulas renderizadas com KaTeX isoladas de forma segura dentro do JSX */}
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-4">
                    <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Fórmulas e Resultados</h3>
                    
                    <div className="space-y-3">
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/40">
                        <p className="text-[10px] text-slate-400">{"Fórmula de Uth-Sørensen ($VO_2\\max$):"}</p>
                        <div className="my-2 py-1 bg-slate-900/50 rounded flex justify-center items-center text-sm font-serif text-center">
                          {"$$VO_2\\max = 15.4 \\times \\left( \\frac{FC_{\\max}}{FC_{\\text{repouso}}} \\right)$$"}
                        </div>
                        <div className="flex justify-between items-center mt-2 text-xs">
                          <span>Estimativa Karvonen:</span>
                          <span className="font-bold text-emerald-400 text-sm">{fisiologia.vo2maxUth} ml/kg/min</span>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/40">
                        <p className="text-[10px] text-slate-400">{"Fórmula do Teste de Cooper:"}</p>
                        <div className="my-2 py-1 bg-slate-900/50 rounded flex justify-center items-center text-sm font-serif text-center">
                          {"$$VO_2\\max = \\frac{\\text{Distância (m)} - 504.9}{44.73}$$"}
                        </div>
                        <div className="flex justify-between items-center mt-2 text-xs">
                          <span>Estimativa de Resistência:</span>
                          <span className="font-bold text-emerald-400 text-sm">{fisiologia.vo2maxCooper} ml/kg/min</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Zonas de Esforço baseadas em Karvonen */}
                  <div className="space-y-2">
                    <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Zonas de Ritmo</h3>
                    {fisiologia.zonas.map((zona, i) => (
                      <div key={i} className="p-2.5 bg-slate-900/40 border border-slate-850 rounded-xl flex items-center justify-between text-xs gap-3">
                        <div className="flex-1">
                          <p className="font-bold text-slate-200">{zona.nome}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{zona.desc}</p>
                        </div>
                        <div className="text-right font-bold text-emerald-400 flex-shrink-0">
                          {zona.min} - {zona.max} bpm
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              )}

              {/* SEPARADOR: IMPORTAÇÃO DE ATIVIDADES */}
              {separadorAtivo === 'atividades' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-100">Upload & Integrações</h2>
                    <p className="text-xs text-slate-400">Importar ficheiro Strava (Planilha) ou Ligar APIs</p>
                  </div>

                  {/* Upload CSV real */}
                  <label className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-950/50 transition-all">
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-sm font-bold text-slate-200">Importar atividades.csv</span>
                    <span className="text-xs text-slate-500 mt-1">Carrega o histórico de corrida do teu Strava</span>
                    <input 
                      type="file" 
                      accept=".csv" 
                      onChange={processarUploadCSV} 
                      className="hidden" 
                    />
                  </label>

                  {/* Integração Interactiva de Dispositivos */}
                  <div className="space-y-2">
                    <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Sincronizar Dispositivos</h3>
                    
                    {/* STRAVA */}
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">🏃‍♂️</span>
                        <div>
                          <p className="font-bold text-xs">Strava Link</p>
                          <p className="text-[10px] text-slate-500">{stravaConectado ? 'Sincronizado' : 'Não Conectado'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => simularConexaoDispositivo('strava')}
                        className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                          stravaConectado 
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                            : 'bg-orange-500 text-slate-950 hover:bg-orange-400'
                        }`}
                      >
                        {stravaConectado ? 'Ativo' : 'Ligar'}
                      </button>
                    </div>

                    {/* GOOGLE FIT */}
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">❤️</span>
                        <div>
                          <p className="font-bold text-xs">Google Fit</p>
                          <p className="text-[10px] text-slate-500">{googleFitConectado ? 'Sincronizado' : 'Não Conectado'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => simularConexaoDispositivo('gfit')}
                        className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                          googleFitConectado 
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                            : 'bg-blue-500 text-slate-950 hover:bg-blue-400'
                        }`}
                      >
                        {googleFitConectado ? 'Ativo' : 'Ligar'}
                      </button>
                    </div>

                    {/* SAMSUNG HEALTH */}
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">💚</span>
                        <div>
                          <p className="font-bold text-xs">Samsung Health</p>
                          <p className="text-[10px] text-slate-500">{samsungHealthConectado ? 'Sincronizado' : 'Não Conectado'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => simularConexaoDispositivo('samsung')}
                        className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                          samsungHealthConectado 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                        }`}
                      >
                        {samsungHealthConectado ? 'Ativo' : 'Ligar'}
                      </button>
                    </div>
                  </div>

                  {/* Histórico Recente */}
                  <div className="space-y-2">
                    <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Atividades Recentes ({atividadesImportadas.length})</h3>
                    {atividadesImportadas.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-4">Nenhuma atividade importada de momento. Faz upload do teu CSV acima.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                        {atividadesImportadas.map((act, index) => (
                          <div key={act.id || index} className="p-2.5 bg-slate-950 rounded-xl flex items-center justify-between text-xs border border-slate-800/40">
                            <div>
                              <p className="font-bold text-slate-200">{act.nome}</p>
                              <p className="text-[10px] text-slate-500">{act.data}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-emerald-400">{act.distancia} km</p>
                              <p className="text-[10px] text-slate-500">{act.duracao} min</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SEPARADOR: AI COACH CHAT */}
              {separadorAtivo === 'coach' && (
                <div className="flex flex-col h-[480px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                  
                  {/* Cabeçalho do Chat */}
                  <div className="p-3 bg-indigo-950/40 border-b border-indigo-900/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 text-xs">
                        🤖
                      </div>
                      <div>
                        <h3 className="font-bold text-xs text-slate-200">The Machine AI Coach</h3>
                        <p className="text-[10px] text-indigo-300">Baseado em Andres (2024) e Guilherme (2004)</p>
                      </div>
                    </div>
                  </div>

                  {/* Caixa de Conversação */}
                  <div 
                    ref={containerChatRef}
                    className="flex-1 p-3 overflow-y-auto space-y-3 text-xs"
                  >
                    {mensagensChat.map((msg) => (
                      <div 
                        key={msg.id}
                        className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                          msg.sender === 'coach' 
                            ? 'bg-slate-900 border border-slate-800 mr-auto text-slate-200' 
                            : 'bg-indigo-600 text-white ml-auto'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    ))}
                    
                    {chatEnviando && (
                      <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-900 border border-slate-800 mr-auto max-w-[85%] text-slate-400">
                        <Loader className="w-4 h-4 animate-spin text-indigo-400 flex-shrink-0" />
                        <span>The Machine está a processar os dados fisiológicos...</span>
                      </div>
                    )}
                  </div>

                  {/* Caixa de Texto */}
                  <div className="p-2 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5">
                    <input 
                      type="text" 
                      value={novaMensagem}
                      onChange={(e) => setNovaMensagem(e.target.value)}
                      onKeyDown={tratarKeyDownChat}
                      placeholder="Pergunta sobre Fartlek, Yoga ou Zonas..."
                      className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={enviarMensagemChat}
                      disabled={!novaMensagem.trim() || chatEnviando}
                      className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all flex items-center justify-center"
                    >
                      <Send className="w-4.5 h-4.5" />
                    </button>
                  </div>

                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* PAINEL DIREITO: PAINEL DE CONTROLO DE ATLETISMO PARA DESKTOP */}
      <div className="flex-1 bg-slate-950 p-6 space-y-6 overflow-y-auto hidden md:block">
        
        {/* Banner do Coach e Sincronização */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-indigo-900/40 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest bg-indigo-900/30 px-3 py-1 rounded-full border border-indigo-500/20">
                Meia Maratona 2027
              </span>
              <h2 className="text-2xl font-black text-slate-50 tracking-tight">Ecrã Científico do Atleta</h2>
              <p className="text-slate-400 text-sm max-w-xl">
                O teu planeamento dinâmico integra as descobertas de <strong>Andres (2024)</strong> sobre a eficiência mecânica e variação neuromuscular do Fartlek, em conjunto com as diretrizes de capilarização muscular de longo prazo de <strong>Guilherme (2004)</strong>.
              </p>
            </div>

            <div className="text-right space-y-1">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Progresso da Planilha</p>
              <p className="text-4xl font-black text-emerald-400">
                {((Object.values(treinosConcluidos).filter(Boolean).length / 48) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-slate-500">
                {Object.values(treinosConcluidos).filter(Boolean).length} de 48 corridas
              </p>
            </div>
          </div>
        </div>

        {/* Informação sobre os Estudos de Atletismo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Fartlek Andres (2024) */}
          <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-orange-500/10 text-orange-400">⚡</span>
              <h3 className="font-bold text-sm text-slate-100">Fartlek Sueco Adaptado (Andres, 2024)</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              O estudo científico demonstra que a alternância ativa de intensidades metabólicas acima e abaixo do limiar anaeróbio acelera a remoção de lactato sanguíneo, otimizando o ecrã cardiorrespiratório e expandindo a tua velocidade de cruzeiro para a Meia Maratona.
            </p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/40 text-xs">
              <p className="font-semibold text-slate-300">Regras de Aplicação:</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-slate-400">
                <li>Terças-feiras focadas em jogo de velocidades.</li>
                <li>Recuperação ativa em trote (nunca caminhar totalmente).</li>
                <li>Apoio pós-treino com isometria profunda.</li>
              </ul>
            </div>
          </div>

          {/* Desenvolvimento Guilherme (2004) */}
          <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">🌱</span>
              <h3 className="font-bold text-sm text-slate-100">Base Aeróbia e Capilarização (Guilherme, 2004)</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              A periodização de longo prazo de corredores de fundo exige que pelo menos 75% do volume semanal de corrida seja realizado estritamente na <strong>Zona 2 (Base Aeróbia)</strong>. Isto expande os teus leitos capilares musculares e aumenta de forma segura o teu limiar de lesão mecânica.
            </p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/40 text-xs">
              <p className="font-semibold text-slate-300">Regras de Aplicação:</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-slate-400">
                <li>Sábados ou Domingos focados em volume constante progressivo.</li>
                <li>Manter conversas fáceis sem acelerações abruptas.</li>
                <li>Alinhamento biomecânico e Yoga diário.</li>
              </ul>
            </div>
          </div>

        </div>

        {/* Visualização de Resumo da Carga da Planilha */}
        <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <span>Distribuição Semanal de Esforço da Planilha</span>
            </h3>
            <span className="text-xs text-slate-500">Unidades de Carga Metabólica</span>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-850/60 text-center">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Fartlek (Terça)</p>
              <p className="text-lg font-black text-orange-400 mt-1">35% Carga</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Neuromuscular</p>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-850/60 text-center">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Recuperação (Quarta)</p>
              <p className="text-lg font-black text-indigo-400 mt-1">0% Carga</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Repouso e Yoga</p>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-850/60 text-center">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Limiar (Quinta)</p>
              <p className="text-lg font-black text-yellow-400 mt-1">25% Carga</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Limpagem de Lactato</p>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-850/60 text-center">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Longão (Fim de Semana)</p>
              <p className="text-lg font-black text-emerald-400 mt-1">40% Carga</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Capilarização</p>
            </div>
          </div>
        </div>

      </div>

      {/* MODAIS INTERACTIVOS DE AUTORIZAÇÃO DE DISPOSITIVOS */}
      {mostrarModalConexao && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <h3 className="font-bold text-lg text-slate-100">Ligar {mostrarModalConexao.toUpperCase()}</h3>
                <p className="text-xs text-slate-400">Autorizar partilha segura de atividades de corrida</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Ao clicares em autorizar, esta aplicação do teu telemóvel irá ler com segurança o histórico de corridas passadas de forma a calibrar automaticamente os limiares de esforço do teu ecrã de treino e a IA do **The Machine**.
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850/60 text-[11px] text-slate-400 space-y-1.5">
              <p className="font-semibold text-slate-300">Permissões Pedidas:</p>
              <p>✔ Leitura do perfil de utilizador de corrida</p>
              <p>✔ Leitura de frequência cardíaca e zonas</p>
              <p>✔ Leitura de rotas de GPS e tempos</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button 
                onClick={() => setMostrarModalConexao(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-755 text-xs text-center"
              >
                Cancelar
              </button>
              <button 
                onClick={() => confirmarSincronizacaoDispositivo(mostrarModalConexao)}
                className="py-2.5 px-4 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-xs text-center"
              >
                Autorizar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}