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
És o "The Machine AI Coach", um treinador de corrida de elite de nível mundial, especializado em fisiologia do esforço e periodização esportiva de longo prazo.
Deves responder sempre em Português do Brasil (PT-BR), utilizando termos como "usuário", "celular", "registro", "tela", "treinos", "corridas", "meia maratona".
O teu conhecimento científico baseia-se fortemente em:
1. Treinamento Fartlek (Andres, 2024): A importância do jogo de velocidades, variação de intensidade, adaptações neuromusculares e aeróbias.
2. Desenvolvimento de Atletas de Longo Prazo (Guilherme, 2004): O foco na base aeróbia (Zona 2) para expandir o leito capilar e mitocôndrias de forma segura, prevenindo lesões.
3. Notação de Fisiologia Matemática: Usa LaTeX para fórmulas se falares sobre $VO_2\\max$, Limiar de Lactato, Economia de Corrida ($RE$), etc.
4. Sincronização diária de Yoga: Apoia a realização de Yoga (20-25 min) para flexibilidade, mobilidade e recuperação ativa das articulações.

Responde de forma encorajadora, altamente técnica mas acessível, dando dicas de treino com base nas estatísticas de corrida do usuário.
`;

export default function App() {
  // --- ESTADOS DO USUÁRIO E AUTENTICAÇÃO ---
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
      text: "Olá! Sou o **The Machine AI Coach**. Com base nos estudos de periodização de longo prazo e no treino Fartlek que você enviou, preparei seu plano para a meia maratona (16 semanas). Como foi o seu dia hoje? Você fez a sessão de Yoga regenerativo de 20 minutos?"
    }
  ]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [chatEnviando, setChatEnviando] = useState(false);

  // --- INTERATIVIDADE DE CONEXÕES ---
  const [stravaConectado, setStravaConectado] = useState(false);
  const [googleFitConectado, setGoogleFitConectado] = useState(false);
  const [samsungHealthConectado, setSamsungHealthConectado] = useState(false);
  const [mostrarModalConexao, setMostrarModalConexao] = useState(null); // 'strava', 'gfit', 'samsung'
  
  // Toasts personalizados para telas móveis
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
      
      console.log("Estado de dados locais carregado com sucesso do armazenamento local do celular.");
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

    // Se houver Firebase ativo, persiste na Cloud do usuário (REGRA 1)
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

      // Definição de Fases baseadas nos uploads científicos do usuário
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

  // --- MOTOR DE IMPORTAÇÃO DE ARQUIVOS CSV (Atividades do Strava) ---
  const processarUploadCSV = (evento) => {
    const file = evento.target.files[0];
    if (!file) return;

    const leitor = new FileReader();
    leitor.onload = (e) => {
      const conteudo = e.target.result;
      const linhas = conteudo.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      if (linhas.length < 2) {
        exibirNotificacao("Arquivo CSV vazio ou inválido.", "error");
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
        const dataOriginal = dadosAtividade['Activity Date'] || dadosAtividade['Start Time'] || new Date().toLocaleDateString('pt-BR');
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
            text: `Perfeito! Analisei as suas atividades importadas do Strava (total de **${novasAtividades.length}** registros). Detectei uma distância média de corrida de **${novasAtividades[0].distancia} km**. Isso confirma que sua base metabólica está pronta para começarmos a intensificar os treinos de terças-feiras utilizando a metodologia Fartlek (Andres, 2024). Mantenha o foco no volume controlado de fim de semana!`
          }
        ]);
      } else {
        exibirNotificacao("Nenhuma atividade do tipo Corrida ('Run') encontrada no arquivo.", "error");
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

    const idMensagemUsuario = `user_${Date.now()}`;
    const novasMensagens = [
      ...mensagensChat,
      { id: idMensagemUsuario, sender: "user", text: messageToSubmit }
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
    O usuário tem atualmente:
    - Idade: ${idade} anos
    - Frequência Cardíaca de Repouso: ${fcRepouso} bpm
    - Frequência Cardíaca Máxima: ${fcMaxima} bpm
    - VO2 Max estimado de base: ${fisiologia.vo2maxUth} ml/kg/min (Karvonen)
    - Conclusão do plano de Meia Maratona: ${progressoPercentagem}% concluído (${treinosConcluidosNum} de ${totalTreinosDisponiveis} treinos)
    - Sincronização diária de Yoga: ${yogaCompletoHoje ? "EFETUADO HOJE" : "Pendente hoje"}
    - Atividades Strava importadas: ${atividadesImportadas.length} corridas guardadas no celular.

    Questão do Usuário: ${messageToSubmit}
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
          text: "Estou com dificuldades de comunicação com os satélites de fisiologia esportiva no momento. No entanto, com base no estudo de Andres (2024), lembre-se de que os treinos Fartlek requerem variação ativa de intensidade e o seu Yoga diário é fundamental para estabilizar os flexores do quadril!"
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_20%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.16),_transparent_28%)] text-slate-100 font-sans antialiased px-3 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 xl:flex-row xl:items-start">
        {/* Banner de Notificação Personalizada */}
        {notificacao && (
          <div className={`fixed right-4 top-4 z-50 flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 shadow-2xl shadow-slate-950/50 transition-all duration-300 ${
            notificacao.tipo === 'success' ? 'bg-emerald-500/95 text-slate-950' : 
            notificacao.tipo === 'error' ? 'bg-rose-500/95 text-white' : 'bg-indigo-600/95 text-white'
          }`}>
            <Sparkles className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-semibold">{notificacao.mensagem}</span>
          </div>
        )}

        {/* PAINEL LATERAL ESQUERDO */}
        <div className="mx-auto w-full max-w-[500px] flex-shrink-0 rounded-[32px] border border-white/10 bg-slate-900/80 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl md:max-w-full md:w-full xl:mx-0 xl:w-[440px]">
          <div className="flex flex-col">
            {/* Topo do Celular */}
            <div className="border-b border-white/10 bg-gradient-to-r from-slate-950/95 via-slate-900/90 to-slate-950/95 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400"></div>
                  <div>
                    <h1 className="text-sm font-semibold tracking-[0.24em] text-slate-100">RUN FOR COVER</h1>
                    <p className="text-xs text-slate-400">Celular Ativo • Meia Maratona</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                    conexaoFirebase ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                  }`}>
                    {conexaoFirebase ? 'Sincronizado' : 'Modo Local'}
                  </span>
                  <div className="rounded-full border border-white/10 bg-slate-800/80 p-2 text-slate-300">
                    <Smartphone className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              {/* Card de resumo do dia */}
              <div className="rounded-[24px] border border-indigo-400/20 bg-gradient-to-br from-indigo-950/70 via-slate-950/95 to-emerald-950/40 p-4 shadow-lg shadow-slate-950/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/20 text-xl">
                      🧘‍♂️
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-indigo-100">Sessão Diária de Yoga</h3>
                      <p className="mt-1 text-xs text-indigo-200/80">Recuperação ativa e alinhamento biomecânico</p>
                      <span className="mt-2 inline-flex rounded-full bg-indigo-500/25 px-2.5 py-1 text-[10px] font-semibold text-indigo-100">
                        20 a 25 min • Sem fadiga
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const novoEstado = !yogaCompletoHoje;
                      atualizarProgresso(undefined, novoEstado, undefined);
                      exibirNotificacao(novoEstado ? 'Yoga do dia completado! Inteligência Artificial atualizada.' : 'Yoga marcado como incompleto.', 'info');
                    }}
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-all ${
                      yogaCompletoHoje
                        ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-400'
                        : 'border-indigo-400/25 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20'
                    }`}
                  >
                    {yogaCompletoHoje ? <Check className="h-5 w-5 stroke-[3]" /> : <Circle className="h-5 w-5" />}
                  </button>
                </div>

                {yogaCompletoHoje && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Concluído! O coach ajustou o teu plano de esforço.</span>
                  </div>
                )}
              </div>

              <div className="grid gap-2 rounded-[24px] border border-white/10 bg-slate-950/70 p-3 shadow-inner shadow-slate-950/20 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-900/80 p-3">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Progresso</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-400">{((Object.values(treinosConcluidos).filter(Boolean).length / 48) * 100).toFixed(0)}%</p>
                </div>
                <div className="rounded-2xl bg-slate-900/80 p-3">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Próximo foco</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">Longão Zona 2</p>
                </div>
                <div className="rounded-2xl bg-slate-900/80 p-3">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Hoje</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">Yoga + recuperação</p>
                </div>
              </div>

              {/* Navegação dos separadores */}
              <div className="grid grid-cols-4 gap-2 rounded-[24px] border border-white/10 bg-slate-950/75 p-2 shadow-inner shadow-slate-950/20">
                <button
                  onClick={() => setSeparadorAtivo('treinos')}
                  className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center transition-all ${
                    separadorAtivo === 'treinos' ? 'bg-emerald-500/12 text-emerald-400 shadow-sm' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  <span className="text-[10px] font-medium">Treinos</span>
                </button>

                <button
                  onClick={() => setSeparadorAtivo('fisiologia')}
                  className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center transition-all ${
                    separadorAtivo === 'fisiologia' ? 'bg-emerald-500/12 text-emerald-400 shadow-sm' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-[10px] font-medium">Fisiologia</span>
                </button>

                <button
                  onClick={() => setSeparadorAtivo('atividades')}
                  className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center transition-all ${
                    separadorAtivo === 'atividades' ? 'bg-emerald-500/12 text-emerald-400 shadow-sm' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  <span className="text-[10px] font-medium">Atividades</span>
                </button>

                <button
                  onClick={() => setSeparadorAtivo('coach')}
                  className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center transition-all ${
                    separadorAtivo === 'coach' ? 'bg-indigo-500/12 text-indigo-400 shadow-sm' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="text-[10px] font-medium">Coach IA</span>
                  <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-indigo-400"></span>
                </button>
              </div>

              {/* Conteúdo scroll do celular */}
              <div className="max-h-[calc(100vh-320px)] overflow-y-auto rounded-[24px] border border-white/10 bg-slate-950/70 p-4 sm:max-h-[none]">
                {carregandoDados ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16">
                    <Loader className="h-8 w-8 animate-spin text-emerald-400" />
                    <p className="text-sm text-slate-400">Sincronizando estatísticas...</p>
                  </div>
                ) : (
                  <>
                    {separadorAtivo === 'treinos' && (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h2 className="text-base font-semibold text-slate-100">Planilha de Corrida</h2>
                            <p className="mt-1 text-xs text-slate-400">{semanaAtualDados.fase}</p>
                          </div>
                          <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
                            Semana {semanaAtiva}
                          </div>
                        </div>

                        <div className="flex items-center justify-between rounded-[20px] border border-white/10 bg-slate-900/80 p-3 shadow-sm">
                          <button
                            onClick={() => setSemanaAtiva(prev => Math.max(1, prev - 1))}
                            disabled={semanaAtiva === 1}
                            className="rounded-2xl bg-slate-800/80 p-2 text-slate-300 transition-all hover:bg-slate-700 disabled:opacity-30"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <span className="text-sm font-semibold text-emerald-400">SEMANA {semanaAtiva} DE 16</span>
                          <button
                            onClick={() => setSemanaAtiva(prev => Math.min(16, prev + 1))}
                            disabled={semanaAtiva === 16}
                            className="rounded-2xl bg-slate-800/80 p-2 text-slate-300 transition-all hover:bg-slate-700 disabled:opacity-30"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </div>

                        <div className="space-y-3">
                          {semanaAtualDados.treinos.map((treino) => {
                            const concluido = !!treinosConcluidos[treino.id];
                            return (
                              <div
                                key={treino.id}
                                className={`rounded-[22px] border p-4 shadow-sm transition-all duration-300 ${
                                  concluido
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-slate-200'
                                    : 'border-white/10 bg-slate-900/80 hover:border-slate-700'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-slate-800/80 px-2.5 py-1 text-[10px] font-semibold text-slate-300">
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
                                      exibirNotificacao(concluido ? 'Treino desmarcado' : 'Corrida guardada com sucesso! Treinador AI atualizado.', 'success');
                                    }}
                                    className={`rounded-2xl border p-1.5 transition-all ${
                                      concluido
                                        ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-400'
                                        : 'border-white/10 bg-slate-950/70 text-slate-400 hover:bg-slate-800'
                                    }`}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                </div>

                                <h4 className="mt-2 text-sm font-semibold text-slate-100">{treino.titulo}</h4>
                                <p className="mt-1 text-xs leading-relaxed text-slate-400">{treino.descricao}</p>

                                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-xs">
                                  <span className="text-slate-500">Distância Prevista</span>
                                  <span className="text-sm font-semibold text-emerald-400">{treino.distanciaAlvo}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {separadorAtivo === 'fisiologia' && (
                      <div className="space-y-4">
                        <div>
                          <h2 className="text-base font-semibold text-slate-100">Calculadora Científica</h2>
                          <p className="mt-1 text-xs text-slate-400">Estudos de fisiologia esportiva aplicados ao teu plano</p>
                        </div>

                        <div className="space-y-3 rounded-[22px] border border-white/10 bg-slate-900/80 p-3">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Idade</label>
                              <input
                                type="number"
                                value={idade}
                                onChange={(e) => setIdade(parseInt(e.target.value) || 30)}
                                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">FC Max (bpm)</label>
                              <input
                                type="number"
                                value={fcMaxima}
                                onChange={(e) => setFcMaxima(parseInt(e.target.value) || 185)}
                                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">FC Repouso (bpm)</label>
                              <input
                                type="number"
                                value={fcRepouso}
                                onChange={(e) => setFcRepouso(parseInt(e.target.value) || 55)}
                                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Cooper (12 min)</label>
                              <input
                                type="number"
                                value={distanciaCooper}
                                onChange={(e) => setDistanciaCooper(parseInt(e.target.value) || 2400)}
                                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-500"
                                placeholder="Metros"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 rounded-[22px] border border-white/10 bg-slate-900/70 p-3">
                          <h3 className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Fórmulas e resultados</h3>
                          <div className="space-y-3">
                            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-2.5">
                              <p className="text-[10px] text-slate-400">{"Fórmula de Uth-Sørensen ($VO_2\\max$):"}</p>
                              <div className="my-2 flex items-center justify-center rounded-xl bg-slate-900/70 py-2 text-center text-sm font-serif">
                                {"$$VO_2\\max = 15.4 \\times \\left( \\frac{FC_{\\max}}{FC_{\\text{repouso}}} \\right)$$"}
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Estimativa Karvonen</span>
                                <span className="font-semibold text-emerald-400">{fisiologia.vo2maxUth} ml/kg/min</span>
                              </div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-2.5">
                              <p className="text-[10px] text-slate-400">{"Fórmula do Teste de Cooper:"}</p>
                              <div className="my-2 flex items-center justify-center rounded-xl bg-slate-900/70 py-2 text-center text-sm font-serif">
                                {"$$VO_2\\max = \\frac{\\text{Distância (m)} - 504.9}{44.73}$$"}
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Estimativa de resistência</span>
                                <span className="font-semibold text-emerald-400">{fisiologia.vo2maxCooper} ml/kg/min</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Zonas de ritmo</h3>
                          {fisiologia.zonas.map((zona, i) => (
                            <div key={i} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-2.5 text-xs">
                              <div className="flex-1">
                                <p className="font-semibold text-slate-200">{zona.nome}</p>
                                <p className="mt-0.5 text-[10px] text-slate-500">{zona.desc}</p>
                              </div>
                              <div className="flex-shrink-0 text-right font-semibold text-emerald-400">
                                {zona.min} - {zona.max} bpm
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {separadorAtivo === 'atividades' && (
                      <div className="space-y-4">
                        <div>
                          <h2 className="text-base font-semibold text-slate-100">Upload & Integrações</h2>
                          <p className="mt-1 text-xs text-slate-400">Importar o teu histórico ou ligar os teus dispositivos favoritos</p>
                        </div>

                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed border-emerald-500/30 bg-slate-900/70 p-6 text-center transition-all hover:border-emerald-400/60">
                          <Upload className="mb-2 h-8 w-8 text-slate-400" />
                          <span className="text-sm font-semibold text-slate-200">Importar actividades.csv</span>
                          <span className="mt-1 text-xs text-slate-500">Carrega o histórico do teu Strava em segundos</span>
                          <input type="file" accept=".csv" onChange={processarUploadCSV} className="hidden" />
                        </label>

                        <div className="space-y-2">
                          <h3 className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Sincronizar dispositivos</h3>

                          <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-900/80 p-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-xl">🏃‍♂️</span>
                              <div>
                                <p className="text-xs font-semibold text-slate-200">Strava Link</p>
                                <p className="text-[10px] text-slate-500">{stravaConectado ? 'Sincronizado' : 'Não conectado'}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => simularConexaoDispositivo('strava')}
                              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                                stravaConectado
                                  ? 'border border-orange-500/30 bg-orange-500/15 text-orange-400'
                                  : 'bg-orange-500 text-slate-950 hover:bg-orange-400'
                              }`}
                            >
                              {stravaConectado ? 'Ativo' : 'Ligar'}
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-900/80 p-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-xl">❤️</span>
                              <div>
                                <p className="text-xs font-semibold text-slate-200">Google Fit</p>
                                <p className="text-[10px] text-slate-500">{googleFitConectado ? 'Sincronizado' : 'Não conectado'}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => simularConexaoDispositivo('gfit')}
                              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                                googleFitConectado
                                  ? 'border border-blue-500/30 bg-blue-500/15 text-blue-400'
                                  : 'bg-blue-500 text-slate-950 hover:bg-blue-400'
                              }`}
                            >
                              {googleFitConectado ? 'Ativo' : 'Ligar'}
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-900/80 p-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-xl">💚</span>
                              <div>
                                <p className="text-xs font-semibold text-slate-200">Samsung Health</p>
                                <p className="text-[10px] text-slate-500">{samsungHealthConectado ? 'Sincronizado' : 'Não conectado'}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => simularConexaoDispositivo('samsung')}
                              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                                samsungHealthConectado
                                  ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                              }`}
                            >
                              {samsungHealthConectado ? 'Ativo' : 'Ligar'}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Atividades recentes ({atividadesImportadas.length})</h3>
                          {atividadesImportadas.length === 0 ? (
                            <p className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-xs italic text-slate-500">
                              Nenhuma atividade importada de momento. Faz upload do teu CSV acima.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {atividadesImportadas.map((act, index) => (
                                <div key={act.id || index} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 p-2.5 text-xs">
                                  <div>
                                    <p className="font-semibold text-slate-200">{act.nome}</p>
                                    <p className="mt-0.5 text-[10px] text-slate-500">{act.data}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold text-emerald-400">{act.distancia} km</p>
                                    <p className="mt-0.5 text-[10px] text-slate-500">{act.duracao} min</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {separadorAtivo === 'coach' && (
                      <div className="flex h-[480px] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/80">
                        <div className="flex items-center justify-between border-b border-indigo-900/30 bg-indigo-950/30 p-3">
                          <div className="flex items-center gap-2">
                            <div className="rounded-2xl bg-indigo-500/15 p-2 text-xs text-indigo-300">🤖</div>
                            <div>
                              <h3 className="text-xs font-semibold text-slate-100">The Machine AI Coach</h3>
                              <p className="text-[10px] text-indigo-300">Baseado em Andres (2024) e Guilherme (2004)</p>
                            </div>
                          </div>
                        </div>

                        <div ref={containerChatRef} className="flex-1 space-y-3 overflow-y-auto p-3 text-xs">
                          {mensagensChat.map((msg) => (
                            <div
                              key={msg.id}
                              className={`max-w-[85%] rounded-[18px] p-3 leading-relaxed ${
                                msg.sender === 'coach'
                                  ? 'mr-auto border border-white/10 bg-slate-900 text-slate-200'
                                  : 'ml-auto bg-indigo-600 text-white'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{msg.text}</p>
                            </div>
                          ))}

                          {chatEnviando && (
                            <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-[18px] border border-white/10 bg-slate-900 p-3 text-slate-400">
                              <Loader className="h-4 w-4 animate-spin text-indigo-400" />
                              <span>The Machine está a processar os dados fisiológicos...</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 border-t border-white/10 bg-slate-900/80 p-2">
                          <input
                            type="text"
                            value={novaMensagem}
                            onChange={(e) => setNovaMensagem(e.target.value)}
                            onKeyDown={tratarKeyDownChat}
                            placeholder="Pergunta sobre Fartlek, Yoga ou Zonas..."
                            className="flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-indigo-500"
                          />
                          <button
                            onClick={enviarMensagemChat}
                            disabled={!novaMensagem.trim() || chatEnviando}
                            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white transition-all hover:bg-indigo-500 disabled:opacity-40"
                          >
                            <Send className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PAINEL DIREITO: DESKTOP */}
        <div className="hidden flex-1 space-y-6 overflow-y-auto rounded-[32px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.35)] md:block">
          <div className="relative overflow-hidden rounded-[32px] border border-indigo-400/20 bg-gradient-to-r from-slate-900/80 via-slate-950 to-indigo-950/60 p-7 shadow-xl shadow-indigo-950/20">
            <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl"></div>
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-3">
                <span className="inline-flex rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-300">
                  Meia Maratona 2027
                </span>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-50">Tela científica do atleta</h2>
                <p className="max-w-xl text-sm leading-relaxed text-slate-400">
                  O teu planeamento dinâmico combina os princípios de Fartlek e base aeróbia para manter o treino inteligente, progressivo e confortável.
                </p>
              </div>

              <div className="rounded-[24px] border border-emerald-500/20 bg-slate-950/70 p-4 text-right shadow-lg shadow-slate-950/30">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Progresso da planilha</p>
                <p className="mt-2 text-4xl font-semibold text-emerald-400">{((Object.values(treinosConcluidos).filter(Boolean).length / 48) * 100).toFixed(0)}%</p>
                <p className="mt-1 text-xs text-slate-500">{Object.values(treinosConcluidos).filter(Boolean).length} de 48 corridas</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-[24px] border border-white/10 bg-slate-900/80 p-5">
              <div className="flex items-center gap-2">
                <span className="rounded-2xl bg-orange-500/10 p-2 text-orange-400">⚡</span>
                <h3 className="text-sm font-semibold text-slate-100">Fartlek adaptado</h3>
              </div>
              <p className="text-sm leading-relaxed text-slate-400">
                A alternância de intensidade melhora a economia de corrida e ajuda a manter o ritmo confortável ao longo da meia maratona.
              </p>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-xs text-slate-400">
                <p className="font-semibold text-slate-300">Regras de aplicação</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>Terças-feiras com foco em velocidade controlada</li>
                  <li>Recuperação ativa em trote</li>
                  <li>Isometria após treino</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3 rounded-[24px] border border-white/10 bg-slate-900/80 p-5">
              <div className="flex items-center gap-2">
                <span className="rounded-2xl bg-emerald-500/10 p-2 text-emerald-400">🌱</span>
                <h3 className="text-sm font-semibold text-slate-100">Base aeróbia e capilarização</h3>
              </div>
              <p className="text-sm leading-relaxed text-slate-400">
                A estrutura da semana orienta o corpo para construir resistência sem excesso de fadiga, reforçando a base para a prova final.
              </p>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-xs text-slate-400">
                <p className="font-semibold text-slate-300">Regras de aplicação</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>Volume progressivo nos longões</li>
                  <li>Ritmo conversável na Zona 2</li>
                  <li>Yoga diário para recuperação</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-100">Distribuição semanal de esforço</h3>
              <span className="text-xs text-slate-500">Carga metabólica</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Fartlek</p>
                <p className="mt-1 text-lg font-semibold text-orange-400">35%</p>
                <p className="mt-0.5 text-[10px] text-slate-500">Neuromuscular</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Recuperação</p>
                <p className="mt-1 text-lg font-semibold text-indigo-400">0%</p>
                <p className="mt-0.5 text-[10px] text-slate-500">Yoga & repouso</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Limiar</p>
                <p className="mt-1 text-lg font-semibold text-yellow-400">25%</p>
                <p className="mt-0.5 text-[10px] text-slate-500">Lactato</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Longão</p>
                <p className="mt-1 text-lg font-semibold text-emerald-400">40%</p>
                <p className="mt-0.5 text-[10px] text-slate-500">Capilarização</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de sincronização */}
        {mostrarModalConexao && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md space-y-4 rounded-[28px] border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-slate-950/50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">Ligar {mostrarModalConexao.toUpperCase()}</h3>
                  <p className="text-xs text-slate-400">Autorizar partilha segura de atividades de corrida</p>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-slate-300">
                Ao autorizar, este aplicativo lê em segurança o teu histórico de corrida para calibrar automaticamente os limiares de esforço e reforçar as sugestões do coach.
              </p>

              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-[11px] text-slate-400">
                <p className="font-semibold text-slate-300">Permissões pedidas</p>
                <p className="mt-1">✔ Leitura do perfil de corrida</p>
                <p>✔ Frequência cardíaca e zonas</p>
                <p>✔ Rotas de GPS e tempos</p>
              </div>

              <div className="grid gap-2 pt-2 sm:grid-cols-2">
                <button
                  onClick={() => setMostrarModalConexao(null)}
                  className="rounded-2xl bg-slate-800 px-4 py-2.5 text-center text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => confirmarSincronizacaoDispositivo(mostrarModalConexao)}
                  className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-center text-xs font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
                >
                  Autorizar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}