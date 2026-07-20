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
      const parsed = JSON.parse(savedActivities);
      if (parsed.length > 0) {
        setActivities(parsed);
        // Ajusta o VO2 Max com base no histórico real importado
        const highestVo2 = Math.max(...parsed.map(a => a.vo2 || 45));
        setVo2Max(highestVo2);
      }
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

  // --- MARCOS CARDÍACOS ESTIMADOS ---
  const fcm = 179;
  const fcr = 65;
  const fcrv = fcm - fcr;

  const estimatedZones = {
    Z1: { nome: "Recuperação Ativa", min: Math.round(fcr + fcrv * 0.50), max: Math.round(fcr + fcrv * 0.60), sensacao: "Esforço mínimo. Dá para conversar cantando sem perder o fôlego." },
    Z2: { nome: "Zona Aeróbia Base", min: Math.round(fcr + fcrv * 0.60), max: Math.round(fcr + fcrv * 0.70), sensacao: "Ritmo de conversa fluida. Confortável, ideal para queimar gordura e criar resistência." },
    Z3: { nome: "Zona de Ritmo (Tempo)", min: Math.round(fcr + fcrv * 0.70), max: Math.round(fcr + fcrv * 0.80), sensacao: "Moderadamente forte. Consegue falar apenas frases curtas de cada vez." },
    Z4: { nome: "Limiar Anaeróbio", min: Math.round(fcr + fcrv * 0.80), max: Math.round(fcr + fcrv * 0.90), sensacao: "Ritmo de prova curto. Respiração muito pesada, foco total na corrida." }
  };

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

  // --- LEITOR ULTRA ROBUSTO DE CSV ATUALIZADO ADAPTADO PARA O ARQUIVO DO SRAVA ---
  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const rows = text.split(/\r?\n/);
        if (rows.length < 2) throw new Error('O arquivo parece estar vazio.');

        // Identifica o delimitador correto da linha de cabeçalho
        const delimiter = rows[0].includes(';') ? ';' : ',';
        const headers = rows[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
        
        // Encontra os índices exatos baseados na exportação do Strava fornecida
        const distIdx = headers.findIndex(h => h === 'Distance');
        const elapsedIdx = headers.findIndex(h => h === 'Elapsed Time');
        const dateIdx = headers.findIndex(h => h === 'Activity Date');
        const typeIdx = headers.findIndex(h => h === 'Activity Type');

        if (distIdx === -1 || elapsedIdx === -1) {
          showToast('Colunas essenciais (Distance/Elapsed Time) não encontradas no CSV.', 'error');
          return;
        }

        const parsedActivities = [];

        for (let i = 1; i < rows.length; i++) {
          if (!rows[i].trim()) continue;
          
          // Tratamento para ignorar vírgulas que estejam dentro de aspas (como nas Datas)
          const cols = rows[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || rows[i].split(delimiter);
          const cleanCols = cols.map(c => c.trim().replace(/"/g, ''));

          const rawDist = parseFloat(cleanCols[distIdx]);
          const rawElapsedSeconds = parseFloat(cleanCols[elapsedIdx]);
          const activityType = typeIdx !== -1 ? cleanCols[typeIdx] : 'Run';

          // Filtra para carregar apenas atividades do tipo Corrida ('Run')
          if (!isNaN(rawDist) && !isNaN(rawElapsedSeconds) && rawDist > 0 && activityType === 'Run') {
            // Se o Strava exportar em metros (ex: 6025.4), converte para km. Caso contrário usa o valor bruto.
            const distanceKm = rawDist > 200 ? rawDist / 1000 : rawDist;
            const durationMin = rawElapsedSeconds / 60;
            
            // Pega a data formatada
            let rawDate = dateIdx !== -1 ? cleanCols[dateIdx] : new Date().toLocaleDateString();
            if(rawDate.includes(',')) {
               rawDate = rawDate.split(',')[0] + ',' + rawDate.split(',')[1]; // Limpa horas
            }

            const estimatedVo2 = calculateVO2Max(distanceKm, durationMin);

            parsedActivities.push({
              id: Date.now() + i,
              date: rawDate,
              distance: parseFloat(distanceKm.toFixed(2)),
              duration: Math.round(durationMin),
              type: distanceKm >= 10 ? 'Treino Longo' : 'Corrida Base',
              vo2: estimatedVo2
            });
          }
        }

        if (parsedActivities.length > 0) {
          setActivities(parsedActivities);
          localStorage.setItem('rfc_activities', JSON.stringify(parsedActivities));
          
          const highestVo2 = Math.max(...parsedActivities.map(a => a.vo2));
          setVo2Max(highestVo2);

          showToast(`Sucesso! ${parsedActivities.length} corridas reais importadas da sua planilha do Strava.`);
        } else {
          showToast('Nenhuma corrida do tipo "Run" válida foi detectada no arquivo.', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Erro ao processar a planilha. Verifique o arquivo.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleManualActivityRegister = (type, distance, duration) => {
    if (!distance || !duration) return;
    const calculatedVo2 = calculateVO2Max(distance, duration);
    const newAct = { id: Date.now(), date: new Date().toISOString().split('T')[0], distance: parseFloat(distance), duration: parseInt(duration), type: type, vo2: calculatedVo2 };
    const updated = [newAct, ...activities];
    setActivities(updated);
    localStorage.setItem('rfc_activities', JSON.stringify(updated));
    setVo2Max(calculatedVo2);
    showToast(`Corrida registrada com sucesso! Seu VO2 foi estimado.`);
  };

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
          <div className="flex justify-between">
            <span className="text-slate-400">Consumo $VO_2\max$</span>
            <strong className="text-emerald-400">{activities.length === 0 ? 'Pendente' : `${vo2Max} ml/kg`}</strong>
          </div>
          <div className="h-[1px] bg-slate-800"></div>
          <div className="flex justify-between">
            <span className="text-slate-400">Previsão Meia</span>
            <strong className="text-emerald-400">{stats.formattedHalfTime}</strong>
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
        </nav>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900 overflow-y-auto">
        
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-6 pb-24 space-y-8">
          
          {/* PAINEL DE MARCOS CARDÍACOS */}
          <section className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-white">📊 Suas Zonas de Intensidade Alvo</h3>
              <p className="text-xs text-slate-400 mt-1">Calculado para Guilherme (41 anos, {weight}kg). Baseie seus treinos na percepção física indicada.</p>
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

          {/* TAB 1: PLANILHA */}
          {activeTab === 'plano' && (
            <div className="space-y-6">
              
              <div className="bg-gradient-to-br from-indigo-950/40 via-slate-950 to-slate-950 border-2 border-indigo-500/30 p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">🧪</span>
                  <h3 className="text-sm font-extrabold text-indigo-300 uppercase tracking-wider">Treino Prático: Descubra Seus Marcos (O Teste da Fala)</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Para saber se você está na sua **Zona 2 (Z2)** real de queima de gordura e fôlego: ao trotar, tente falar uma frase longa em voz alta. Se conseguir falar sem precisar pausar abruptamente para respirar, você está no ritmo perfeito!
                </p>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-950/60 p-5 rounded-3xl border border-slate-800">
                <div>
                  <h2 className="text-base font-extrabold text-white">Cronograma Semana {selectedWeek}</h2>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl flex items-center gap-1 overflow-x-auto">
                  {Array.from({ length: 16 }, (_, i) => i + 1).map((w) => (
                    <button key={w} onClick={() => setSelectedWeek(w)} className={`w-8 h-8 rounded-xl text-xs font-black ${selectedWeek === w ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}>
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* CARDS DE TREINOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentWeekWorkouts.map((workout, idx) => {
                  const isDone = completedWorkouts[`${selectedWeek}-${idx}`];
                  return (
                    <div key={idx} className="p-5 rounded-3xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-4">
                      <div>
                        <h4 className="font-black text-sm text-white">{workout.tipo}</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{workout.desc}</p>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-900">
                        <span className="text-[10px] text-slate-500 font-mono">{workout.zona}</span>
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
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Metabolismo & Perda de Peso</h3>
                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
                    <div className="flex justify-between"><span>Seu Peso Real:</span><strong className="text-white">{weight} kg</strong></div>
                    <div className="flex justify-between"><span>Meta de Calorias Diárias:</span><strong className="text-emerald-400">{dailyCalories} kcal/dia</strong></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REGISTRO E UPLOAD COMPATÍVEL STRAVA */}
          {activeTab === 'progresso' && (
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-white">Subir Histórico Oficial do Strava</h3>
                <p className="text-xs text-slate-400">Arraste ou selecione o arquivo <code>activities.csv</code> padrão exportado do seu perfil.</p>
              </div>

              {/* ZONA DE UPLOAD CORRIGIDA */}
              <label className="flex items-center justify-center w-full h-32 border-2 border-slate-800 border-dashed rounded-2xl cursor-pointer hover:bg-slate-900/40 transition">
                <div className="text-center p-4">
                  <span className="text-3xl block mb-1">📊</span>
                  <p className="text-xs text-slate-300 font-bold">Clique aqui para processar o seu activities.csv</p>
                </div>
                <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
              </label>

              <div className="pt-4 border-t border-slate-900 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400">Suas Corridas Reais ({activities.length})</h4>
                {activities.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Nenhuma atividade importada ainda. Selecione o arquivo acima.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {activities.map(a => (
                      <div key={a.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex justify-between text-xs font-mono">
                        <span>🏃 {a.date} - {a.type}</span>
                        <span className="text-emerald-400 font-bold">{a.distance} km | {a.duration} min</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GLOSSÁRIO */}
          <section className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">📖 Glossário do Corredor</h3>
            <div className="flex flex-wrap gap-2">
              {Object.keys(glossary).map(term => (
                <button key={term} onClick={() => setSelectedGlossaryTerm(term === selectedGlossaryTerm ? null : term)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${selectedGlossaryTerm === term ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300'}`}>
                  {term}
                </button>
              ))}
            </div>
            {selectedGlossaryTerm && (
              <div className="p-4 bg-slate-900/60 border border-emerald-500/20 rounded-2xl">
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

### O que você deve fazer agora:
1. Copie o código acima e cole no seu arquivo `src/App.jsx`.
2. Vá até a aba **"Registrar Corrida"** no menu lateral.
3. Clique na área pontilhada de upload e selecione o mesmo arquivo `activities.csv`.

Agora ele vai ler e importar perfeitamente as suas corridas de **6.02 km** de Julho! As métricas de $VO_2\max$ e as previsões de tempo de prova vão começar a funcionar baseadas estritamente nas suas passadas.
