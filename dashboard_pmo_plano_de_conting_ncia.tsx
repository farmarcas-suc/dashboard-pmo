import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, LabelList, ComposedChart, Area
} from 'recharts';
import { 
  TrendingUp, DollarSign, Activity, UploadCloud, Filter, Download, 
  Package, Star, MapPin, ChevronDown, ChevronUp, Users, Target, 
  FileText, CheckCircle2, Circle, Pencil, X, Plus, AlertTriangle, 
  Briefcase, LayoutDashboard, BarChart2, CheckSquare, Clock,
  Trash2, ArrowUp, ArrowDown, Sparkles, Loader2
} from 'lucide-react';

// --- CONFIGURAÇÃO FIREBASE (CANVAS) ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- CONFIGURAÇÃO GEMINI API ---
const apiKey = ""; // A chave é injetada dinamicamente pelo ambiente

// Função com Exponential Backoff para chamadas robustas à API
const callGeminiWithRetry = async (url, payload, retries = 5) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(res => setTimeout(res, delays[i]));
    }
  }
};

// --- DADOS SIMULADOS (Expandidos com histórico de meses e Associados) ---
const initialData = [
  { id: 101, mesAno: 'jan/2026', analista: 'MARIANE SANTOS', anjo: 'LARISSA TEIXEIRA', associado: 'ERIC MASCARENHAS', ge: '42', cnpj: '19436791000125', razaoSocial: 'ROBERTA BRINGHENTI - ME', cidade: 'NAVIRAI', estado: 'MS', bandeira: 'ULTRA POPULAR', vendaLiquida: 510000.00, cmv: 68.5, vendaDelivery: 42000.00, pbm: 15000.00, dermaclub: 0, inspire: 1800.00, marcasProprias: 6500.00, pec: 85.2 },
  { id: 102, mesAno: 'fev/2026', analista: 'MARIANE SANTOS', anjo: 'LARISSA TEIXEIRA', associado: 'ERIC MASCARENHAS', ge: '42', cnpj: '19436791000125', razaoSocial: 'ROBERTA BRINGHENTI - ME', cidade: 'NAVIRAI', estado: 'MS', bandeira: 'ULTRA POPULAR', vendaLiquida: 535000.00, cmv: 67.2, vendaDelivery: 45000.00, pbm: 16500.00, dermaclub: 0, inspire: 1900.00, marcasProprias: 6800.00, pec: 86.1 },
  { id: 1, mesAno: 'mar/2026', analista: 'MARIANE SANTOS', anjo: 'LARISSA TEIXEIRA', associado: 'ERIC MASCARENHAS', ge: '42', cnpj: '19436791000125', razaoSocial: 'ROBERTA BRINGHENTI - ME', cidade: 'NAVIRAI', estado: 'MS', bandeira: 'ULTRA POPULAR', vendaLiquida: 562895.66, cmv: 66.0, vendaDelivery: 49362.40, pbm: 17962.49, dermaclub: 0, inspire: 2006.40, marcasProprias: 7278.78, pec: 87.7 },
  { id: 201, mesAno: 'jan/2026', analista: 'CARLOS SILVA', anjo: 'JOÃO PEDRO', associado: 'ANA CLAUDIA MENDES', ge: '15', cnpj: '99887766000122', razaoSocial: 'FARMACIA GOIANIA SA', cidade: 'GOIANIA', estado: 'GO', bandeira: 'ULTRA POPULAR', vendaLiquida: 710000.00, cmv: 70.1, vendaDelivery: 100000.00, pbm: 40000.00, dermaclub: 4000.00, inspire: 1500.00, marcasProprias: 20000.00, pec: 82.0 },
  { id: 202, mesAno: 'fev/2026', analista: 'CARLOS SILVA', anjo: 'JOÃO PEDRO', associado: 'ANA CLAUDIA MENDES', ge: '15', cnpj: '99887766000122', razaoSocial: 'FARMACIA GOIANIA SA', cidade: 'GOIANIA', estado: 'GO', bandeira: 'ULTRA POPULAR', vendaLiquida: 745000.00, cmv: 69.5, vendaDelivery: 110000.00, pbm: 42000.00, dermaclub: 4500.00, inspire: 1650.00, marcasProprias: 21000.00, pec: 83.5 },
  { id: 3, mesAno: 'mar/2026', analista: 'CARLOS SILVA', anjo: 'JOÃO PEDRO', associado: 'ANA CLAUDIA MENDES', ge: '15', cnpj: '99887766000122', razaoSocial: 'FARMACIA GOIANIA SA', cidade: 'GOIANIA', estado: 'GO', bandeira: 'ULTRA POPULAR', vendaLiquida: 780200.50, cmv: 68.1, vendaDelivery: 120000.00, pbm: 45000.00, dermaclub: 5000.00, inspire: 1800.00, marcasProprias: 22000.00, pec: 85.0 },
];

// --- CORES DA MARCA ---
const BRAND = {
  primary: '#FF5510', // Laranja Solicitado
  dark: '#050505',    // Quase Preto
  white: '#FFFFFF',   // Branco
  bgLight: '#f4f4f5', // Fundo Cinza Claro
  gray: '#e4e4e7',    // Bordas
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  ai: '#8b5cf6'       // Roxo para funcionalidades IA
};

// --- CONFIGURAÇÕES DE MÉTRICAS (Gráfico Dinâmico) ---
const METRICS_CONFIG = {
  'Faturamento Líquido': { id: 'vendaLiquida', type: 'currency', color: BRAND.primary },
  'CMV Médio (%)': { id: 'cmv', type: 'percent', color: BRAND.dark },
  'Venda Delivery': { id: 'vendaDelivery', type: 'currency', color: BRAND.success },
  'Marcas Próprias': { id: 'marcasProprias', type: 'currency', color: '#3b82f6' },
  'Venda PBM': { id: 'pbm', type: 'currency', color: '#8b5cf6' }
};
const metricLabels = Object.keys(METRICS_CONFIG);

// --- UTILITÁRIOS ---
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const formatPercent = (value) => `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value || 0)}%`;
const formatCompact = (value) => new Intl.NumberFormat('pt-BR', { notation: "compact", compactDisplay: "short" }).format(value || 0);

const monthOrder = { 'jan': 1, 'fev': 2, 'mar': 3, 'abr': 4, 'mai': 5, 'jun': 6, 'jul': 7, 'ago': 8, 'set': 9, 'out': 10, 'nov': 11, 'dez': 12 };
const sortMesAno = (a, b) => {
  const [mA, yA] = a.split('/'); const [mB, yB] = b.split('/');
  if (yA !== yB) return parseInt(yA) - parseInt(yB);
  return (monthOrder[mA.toLowerCase()] || 0) - (monthOrder[mB.toLowerCase()] || 0);
};

export default function App() {
  // --- FIREBASE AUTH & SYNC ---
  const [user, setUser] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const syncToFirebase = async (updates) => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'pmoDashboard', 'state');
    try {
      await setDoc(docRef, updates, { merge: true });
    } catch (err) {
      console.error("Erro ao salvar no Firebase:", err);
    }
  };

  const [activeTab, setActiveTab] = useState('pmo'); 
  const [data, setData] = useState(initialData);
  const fileInputRef = useRef(null);

  // Filtros Avançados
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCnpj, setSearchCnpj] = useState('');
  const [selectedAssociados, setSelectedAssociados] = useState([]);
  const [selectedMesAno, setSelectedMesAno] = useState([]);
  const [selectedLojas, setSelectedLojas] = useState([]);
  const [selectedGEs, setSelectedGEs] = useState([]); 
  const [filterEstado, setFilterEstado] = useState('TODOS');
  
  // Controle do Gráfico de Linha Dinâmico
  const [selectedMetricsLabels, setSelectedMetricsLabels] = useState(['Faturamento Líquido', 'CMV Médio (%)']);
  const [isMetricSelectOpen, setIsMetricSelectOpen] = useState(false);

  // Estados de Edição do PMO
  const [isEditingRoadmap, setIsEditingRoadmap] = useState(false);
  const [roadmap, setRoadmap] = useState([
    { id: 1, title: 'Diagnóstico das Lojas', desc: 'Análise DRE, CMV e definição de analistas.', status: 'completed' },
    { id: 2, title: 'Ação em Marcas Próprias', desc: 'Treinamento de balconistas e campanhas de incentivo.', status: 'current' },
    { id: 3, title: 'Revisão de CMV (PBM)', desc: 'Reavaliação das margens de produtos de uso contínuo.', status: 'pending' }
  ]);

  const [tasks, setTasks] = useState([
    { id: 1, title: 'Cobrar envio do DRE de MS', resp: 'Mariane', status: 'pendente' },
    { id: 2, title: 'Agendar call com associado', resp: 'Carlos', status: 'concluido' },
  ]);
  const [newTask, setNewTask] = useState({ title: '', resp: '' });

  // --- ESTADOS GEMINI IA ---
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [storeInsights, setStoreInsights] = useState({});

  // --- NOVOS ESTADOS: PAINEL DE FATURAMENTO E AÇÕES (PMO) ---
  const [pmoFilterCnpj, setPmoFilterCnpj] = useState([]);
  const [pmoFilterAssociado, setPmoFilterAssociado] = useState([]);
  const [pmoFilterGE, setPmoFilterGE] = useState([]);
  const [pmoFilterMesAno, setPmoFilterMesAno] = useState([]);
  const [pmoFilterBandeira, setPmoFilterBandeira] = useState([]);
  const [isEditingAcoes, setIsEditingAcoes] = useState(false);
  const [newAcao, setNewAcao] = useState('');
  const [acoesRealizadas, setAcoesRealizadas] = useState([
    { id: 1, date: '10/mai', associado: 'ERIC MASCARENHAS', desc: 'Visita presencial para alinhamento de metas PBM.' },
    { id: 2, date: '12/mai', associado: 'ANA CLAUDIA MENDES', desc: 'Aprovação do novo mix de marcas próprias.' }
  ]);

  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'pmoDashboard', 'state');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const fbData = snapshot.data();
        if (fbData.roadmap) setRoadmap(fbData.roadmap);
        if (fbData.tasks) setTasks(fbData.tasks);
        if (fbData.acoesRealizadas) setAcoesRealizadas(fbData.acoesRealizadas);
        if (fbData.data) setData(fbData.data); 
      }
    }, (err) => console.error(err));
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!window.XLSX) return alert("Aguarde o carregamento do Excel.");
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = window.XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = window.XLSX.utils.sheet_to_json(ws);

        const parseNumber = (val, isPercent = false) => {
          if (typeof val === 'number') {
            return (isPercent && val > 0 && val <= 1) ? val * 100 : val;
          }
          if (!val) return 0;
          
          const strVal = String(val);
          const hasPercentSign = strVal.includes('%');
          
          let cleanStr = strVal.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').replace('%', '').trim();
          let parsed = parseFloat(cleanStr) || 0;
          
          if (isPercent && parsed > 0 && parsed <= 1 && !hasPercentSign) {
            return parsed * 100;
          }
          return parsed;
        };

        const formattedData = jsonData.map((row, index) => ({
          id: Date.now() + index,
          mesAno: row['MÊS/ANO'] || 'N/D',
          analista: row['ANALISTA'] || 'N/D',
          anjo: row['ANJO'] || 'N/D',
          associado: row['ASSOCIADO'] || 'N/D',
          ge: row['GE'] || 'N/D',
          cnpj: row['CNPJ'] || '',
          razaoSocial: row['RAZÃO SOCIAL'] || 'N/D',
          cidade: row['CIDADE'] || 'N/D',
          estado: row['ESTADO'] || 'N/D',
          bandeira: row['BANDEIRA'] || 'N/D',
          vendaLiquida: parseNumber(row['VENDA LIQUIDA BI']),
          cmv: parseNumber(row['CMV (PLUG)'], true), 
          vendaDelivery: parseNumber(row['VENDA DELIVERY']),
          pbm: parseNumber(row['PRODUTO PBM']),
          pec: parseNumber(row['Efetividade PEC'], true), 
          dermaclub: parseNumber(row['R$ Dermaclub']),
          inspire: parseNumber(row['R$ Inspire']),
          marcasProprias: parseNumber(row['Marcas Próprias']),
        }));

        setData(formattedData);
        setSelectedAssociados([]); setSelectedMesAno([]);
        syncToFirebase({ data: formattedData }); 
      } catch (error) {
        alert("Erro ao processar a planilha.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const uniqueAssociados = useMemo(() => [...new Set(data.map(i => i.associado).filter(Boolean))].sort(), [data]);
  const uniqueMesAnoList = useMemo(() => [...new Set(data.map(i => i.mesAno).filter(Boolean))].sort(sortMesAno), [data]);
  const uniqueLojas = useMemo(() => [...new Set(data.map(i => i.razaoSocial).filter(Boolean))].sort(), [data]);
  const uniqueCnpjs = useMemo(() => [...new Set(data.map(i => i.cnpj).filter(Boolean))].sort(), [data]);
  const uniqueGEs = useMemo(() => [...new Set(data.map(i => i.ge).filter(Boolean))].sort(), [data]);
  const uniqueBandeiras = useMemo(() => [...new Set(data.map(i => i.bandeira).filter(Boolean))].sort(), [data]);

  const toggleSelection = (item, selectedList, setter) => setter(selectedList.includes(item) ? selectedList.filter(i => i !== item) : [...selectedList, item]);

  const pmoData = useMemo(() => {
    return data.filter(item => {
      const matchCnpj = pmoFilterCnpj.length === 0 || pmoFilterCnpj.includes(String(item.cnpj));
      const matchAssoc = pmoFilterAssociado.length === 0 || pmoFilterAssociado.includes(item.associado);
      const matchGE = pmoFilterGE.length === 0 || pmoFilterGE.includes(String(item.ge));
      const matchMesAno = pmoFilterMesAno.length === 0 || pmoFilterMesAno.includes(item.mesAno);
      const matchBandeira = pmoFilterBandeira.length === 0 || pmoFilterBandeira.includes(item.bandeira);
      return matchCnpj && matchAssoc && matchGE && matchMesAno && matchBandeira;
    });
  }, [data, pmoFilterCnpj, pmoFilterAssociado, pmoFilterGE, pmoFilterMesAno, pmoFilterBandeira]);

  const pmoFaturamento = pmoData.reduce((acc, curr) => acc + curr.vendaLiquida, 0);

  const pmoChartData = useMemo(() => {
    const grouped = pmoData.reduce((acc, curr) => {
      if (!acc[curr.mesAno]) acc[curr.mesAno] = { mesAno: curr.mesAno, vendaLiquida: 0 };
      acc[curr.mesAno].vendaLiquida += curr.vendaLiquida;
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => sortMesAno(a.mesAno, b.mesAno));
  }, [pmoData]);

  const pmoAcoes = acoesRealizadas.filter(acao => 
    pmoFilterAssociado.length === 0 || pmoFilterAssociado.includes(acao.associado)
  );

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchSearch = item.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) || item.cidade.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCnpj = !searchCnpj || String(item.cnpj).includes(searchCnpj);
      const matchEstado = filterEstado === 'TODOS' || item.estado === filterEstado;
      const matchAssociado = selectedAssociados.length === 0 || selectedAssociados.includes(item.associado);
      const matchMesAno = selectedMesAno.length === 0 || selectedMesAno.includes(item.mesAno);
      const matchLoja = selectedLojas.length === 0 || selectedLojas.includes(item.razaoSocial);
      const matchGE = selectedGEs.length === 0 || selectedGEs.includes(String(item.ge));
      
      return matchSearch && matchCnpj && matchEstado && matchAssociado && matchMesAno && matchLoja && matchGE;
    });
  }, [data, searchTerm, searchCnpj, filterEstado, selectedAssociados, selectedMesAno, selectedLojas, selectedGEs]);

  const kpis = useMemo(() => {
    if (filteredData.length === 0) return { totalVendas: 0, totalDelivery: 0, cmvMedio: 0, totalMarcasProprias: 0, shareMarcasProprias: 0 };
    const totalVendas = filteredData.reduce((acc, curr) => acc + curr.vendaLiquida, 0);
    const totalMarcasProprias = filteredData.reduce((acc, curr) => acc + curr.marcasProprias, 0);
    return {
      totalVendas,
      totalDelivery: filteredData.reduce((acc, curr) => acc + curr.vendaDelivery, 0),
      cmvMedio: filteredData.reduce((acc, curr) => acc + curr.cmv, 0) / filteredData.length,
      totalMarcasProprias,
      shareMarcasProprias: (totalMarcasProprias / (totalVendas || 1)) * 100
    };
  }, [filteredData]);

  const dynamicLineData = useMemo(() => {
    const grouped = filteredData.reduce((acc, curr) => {
      if (!acc[curr.mesAno]) {
        acc[curr.mesAno] = { mesAno: curr.mesAno, count: 0, vendaLiquida: 0, vendaDelivery: 0, marcasProprias: 0, pbm: 0, cmvSum: 0 };
      }
      acc[curr.mesAno].vendaLiquida += curr.vendaLiquida;
      acc[curr.mesAno].vendaDelivery += curr.vendaDelivery;
      acc[curr.mesAno].marcasProprias += curr.marcasProprias;
      acc[curr.mesAno].pbm += curr.pbm;
      acc[curr.mesAno].cmvSum += curr.cmv;
      acc[curr.mesAno].count += 1;
      return acc;
    }, {});

    return Object.values(grouped).map(d => ({
      mesAno: d.mesAno,
      vendaLiquida: d.vendaLiquida,
      vendaDelivery: d.vendaDelivery,
      marcasProprias: d.marcasProprias,
      pbm: d.pbm,
      cmv: parseFloat((d.cmvSum / d.count).toFixed(1))
    })).sort((a, b) => sortMesAno(a.mesAno, b.mesAno));
  }, [filteredData]);

  const salesComposition = useMemo(() => {
    const pbm = filteredData.reduce((acc, curr) => acc + curr.pbm, 0);
    const mp = filteredData.reduce((acc, curr) => acc + curr.marcasProprias, 0);
    const dermaclub = filteredData.reduce((acc, curr) => acc + curr.dermaclub, 0);
    const inspire = filteredData.reduce((acc, curr) => acc + curr.inspire, 0);
    const conv = kpis.totalVendas - pbm - mp - dermaclub - inspire;
    return [
      { name: 'Balcão/Conveniência', value: conv > 0 ? conv : 0 },
      { name: 'PBM', value: pbm },
      { name: 'Marcas Próprias', value: mp },
      { name: 'Dermaclub', value: dermaclub },
      { name: 'Inspire', value: inspire }
    ].filter(item => item.value > 0);
  }, [filteredData, kpis]);

  const operEvolutionData = useMemo(() => {
    const grouped = filteredData.reduce((acc, curr) => {
      if (!acc[curr.mesAno]) acc[curr.mesAno] = { mesAno: curr.mesAno, marcasProprias: 0, dermaclub: 0, inspire: 0, pbm: 0, pecSum: 0, count: 0, vendaDelivery: 0 };
      acc[curr.mesAno].marcasProprias += curr.marcasProprias;
      acc[curr.mesAno].dermaclub += curr.dermaclub;
      acc[curr.mesAno].inspire += curr.inspire;
      acc[curr.mesAno].pbm += curr.pbm;
      acc[curr.mesAno].pecSum += (curr.pec || 0);
      acc[curr.mesAno].vendaDelivery += (curr.vendaDelivery || 0);
      acc[curr.mesAno].count += 1;
      return acc;
    }, {});
    
    return Object.values(grouped).map(d => ({
      ...d,
      pec: d.count > 0 ? parseFloat((d.pecSum / d.count).toFixed(1)) : 0
    })).sort((a, b) => sortMesAno(a.mesAno, b.mesAno));
  }, [filteredData]);

  const updateRoadmap = (id, field, value) => {
    const newRoadmap = roadmap.map(item => item.id === id ? { ...item, [field]: value } : item);
    setRoadmap(newRoadmap);
    syncToFirebase({ roadmap: newRoadmap });
  };

  const addTask = () => {
    if (newTask.title.trim() !== '') {
      const newTasks = [...tasks, { id: Date.now(), title: newTask.title, resp: newTask.resp || 'N/D', status: 'pendente' }];
      setTasks(newTasks);
      setNewTask({ title: '', resp: '' });
      syncToFirebase({ tasks: newTasks });
    }
  };

  const toggleTaskStatus = (id) => {
    const newTasks = tasks.map(t => t.id === id ? { ...t, status: t.status === 'pendente' ? 'concluido' : 'pendente' } : t);
    setTasks(newTasks);
    syncToFirebase({ tasks: newTasks });
  };

  const deleteTask = (id) => {
    const newTasks = tasks.filter(t => t.id !== id);
    setTasks(newTasks);
    syncToFirebase({ tasks: newTasks });
  };

  const moveTask = (index, direction) => {
    const newTasks = [...tasks];
    if (direction === -1 && index > 0) {
      [newTasks[index - 1], newTasks[index]] = [newTasks[index], newTasks[index - 1]];
    } else if (direction === 1 && index < newTasks.length - 1) {
      [newTasks[index + 1], newTasks[index]] = [newTasks[index], newTasks[index + 1]];
    }
    setTasks(newTasks);
    syncToFirebase({ tasks: newTasks });
  };

  const deleteAcao = (id) => {
    const newAcoes = acoesRealizadas.filter(a => a.id !== id);
    setAcoesRealizadas(newAcoes);
    syncToFirebase({ acoesRealizadas: newAcoes });
  };

  const moveAcao = (id, direction) => {
    const index = acoesRealizadas.findIndex(a => a.id === id);
    if (index === -1) return;
    const newAcoes = [...acoesRealizadas];
    if (direction === -1 && index > 0) {
      [newAcoes[index - 1], newAcoes[index]] = [newAcoes[index], newAcoes[index - 1]];
    } else if (direction === 1 && index < newAcoes.length - 1) {
      [newAcoes[index + 1], newAcoes[index]] = [newAcoes[index], newAcoes[index + 1]];
    }
    setAcoesRealizadas(newAcoes);
    syncToFirebase({ acoesRealizadas: newAcoes });
  };

  // --- FUNÇÕES DA IA (GEMINI) ---
  const handleGenerateTasksWithAI = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsAiLoading(true);
    setAiError('');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: `Desafio no varejo farmacêutico: "${aiPrompt}". Sugira 3 ações estratégicas diretas, práticas e focadas na solução. Retorne estritamente em formato JSON.` }] }],
      systemInstruction: { parts: [{ text: "Você é um consultor sênior de PMO para o varejo farmacêutico. Seja direto e acionável. Formato obrigatório JSON." }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING", description: "Nome curto da ação a realizar. Máximo 10 palavras." },
              resp: { type: "STRING", description: "Sugestão de cargo para execução (ex: Gerente, PMO, Analista)." }
            }
          }
        }
      }
    };

    try {
      const response = await callGeminiWithRetry(url, payload);
      const jsonStr = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonStr) throw new Error("Sem resposta válida da IA.");
      
      const generatedTasks = JSON.parse(jsonStr);
      
      const newTasks = [
        ...tasks, 
        ...generatedTasks.map((t, idx) => ({
          id: Date.now() + idx,
          title: `[IA] ${t.title}`,
          resp: t.resp,
          status: 'pendente'
        }))
      ];
      
      setTasks(newTasks);
      setAiPrompt('');
      syncToFirebase({ tasks: newTasks });
    } catch (err) {
      console.error(err);
      setAiError('Ocorreu um erro ao gerar ações. Tente novamente.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleStoreDiagnosticAI = async (store) => {
    setStoreInsights(prev => ({ ...prev, [store.id]: { loading: true, text: '', error: '' } }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    const promptText = `
      Analise os KPIs da farmácia:
      - Loja: ${store.razaoSocial}
      - Venda Líquida: R$ ${store.vendaLiquida}
      - CMV: ${store.cmv}%
      - PBM: R$ ${store.pbm}
      - Marcas Próprias: R$ ${store.marcasProprias}
      - Delivery: R$ ${store.vendaDelivery}
      - Efetividade PEC: ${store.pec}%
      
      Escreva 1 parágrafo curto e direto (2 a 3 frases) com um diagnóstico estratégico: aponte um ponto forte e uma oportunidade de melhoria.
    `;

    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      systemInstruction: { parts: [{ text: "Você é um analista financeiro de Varejo Farmacêutico ajudando gerentes. Seja objetivo e profissional, sem introduções." }] }
    };

    try {
      const response = await callGeminiWithRetry(url, payload);
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Falha ao gerar diagnóstico.");

      setStoreInsights(prev => ({ ...prev, [store.id]: { loading: false, text: text, error: '' } }));
    } catch (error) {
      console.error(error);
      setStoreInsights(prev => ({ ...prev, [store.id]: { loading: false, text: '', error: 'Falha na análise da IA.' } }));
    }
  };

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: BRAND.bgLight, color: BRAND.dark, fontFamily: "'Rubik', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800&display=swap');`}</style>

      {/* HEADER PMO */}
      <header className="px-6 pt-6 pb-0 bg-white border-b shadow-sm" style={{ borderColor: BRAND.gray }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: BRAND.primary }}>
                <Briefcase size={22} />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight">PMO Plano de Contingência</h1>
            </div>
            <p className="text-sm font-medium text-slate-500 tracking-wide pl-14 flex items-center gap-2">
              Acompanhamento e Gestão - Regional Centro-Oeste
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 px-4 py-2 rounded text-sm font-bold border transition-all hover:bg-slate-50" style={{ borderColor: BRAND.gray, color: BRAND.dark }}>
              <UploadCloud size={18} style={{ color: BRAND.primary }} /> Atualizar Base
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded text-sm font-bold transition-all hover:opacity-90" style={{ backgroundColor: BRAND.dark, color: BRAND.white }}>
              <Download size={18} /> Exportar Status
            </button>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="max-w-7xl mx-auto flex gap-6 px-2 overflow-x-auto">
          <button onClick={() => setActiveTab('pmo')} className={`pb-4 font-bold text-sm border-b-4 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'pmo' ? 'border-opacity-100' : 'border-transparent opacity-50 hover:opacity-100'}`} style={{ borderColor: activeTab === 'pmo' ? BRAND.primary : 'transparent', color: BRAND.dark }}>
            <LayoutDashboard size={16} /> PMO & Status Report
          </button>
          <button onClick={() => setActiveTab('financial')} className={`pb-4 font-bold text-sm border-b-4 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'financial' ? 'border-opacity-100' : 'border-transparent opacity-50 hover:opacity-100'}`} style={{ borderColor: activeTab === 'financial' ? BRAND.primary : 'transparent', color: BRAND.dark }}>
            <BarChart2 size={16} /> Indicadores
          </button>
          <button onClick={() => setActiveTab('operational')} className={`pb-4 font-bold text-sm border-b-4 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'operational' ? 'border-opacity-100' : 'border-transparent opacity-50 hover:opacity-100'}`} style={{ borderColor: activeTab === 'operational' ? BRAND.primary : 'transparent', color: BRAND.dark }}>
            <Package size={16} /> Estratégia
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        
        {/* =========================================
            ABA 1: PMO & STATUS REPORT
            ========================================= */}
        {activeTab === 'pmo' && (
          <div className="space-y-6 animate-in fade-in duration-500">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* ROADMAP / ETAPAS DO PROJETO */}
              <div className="p-6 rounded-xl border bg-white shadow-sm" style={{ borderColor: BRAND.gray }}>
                <div className="flex justify-between items-center mb-6 border-b pb-4" style={{ borderColor: BRAND.gray }}>
                  <h3 className="text-base font-extrabold flex items-center gap-2" style={{ color: BRAND.dark }}>
                    <Target size={20} style={{ color: BRAND.primary }}/> Roadmap do Projeto
                  </h3>
                  <button onClick={() => setIsEditingRoadmap(!isEditingRoadmap)} className="text-xs font-bold flex items-center gap-1 transition-colors hover:text-[#FF5510]" style={{ color: isEditingRoadmap ? BRAND.primary : '#999' }}>
                    <Pencil size={14} /> {isEditingRoadmap ? 'Concluir' : 'Editar Etapas'}
                  </button>
                </div>
                
                <div className="relative border-l-2 ml-3 space-y-6" style={{ borderColor: BRAND.gray }}>
                  {roadmap.map((fase) => (
                    <div key={fase.id} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 bg-white rounded-full">
                        {fase.status === 'completed' && <CheckCircle2 size={16} style={{ color: BRAND.success, fill: BRAND.white }}/>}
                        {fase.status === 'current' && <Circle size={16} style={{ color: BRAND.primary, fill: BRAND.primary }}/>}
                        {fase.status === 'pending' && <Circle size={16} style={{ color: '#ccc', fill: BRAND.white }}/>}
                      </div>
                      
                      {isEditingRoadmap ? (
                        <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded border">
                          <input type="text" value={fase.title} onChange={(e) => updateRoadmap(fase.id, 'title', e.target.value)} className="w-full px-2 py-1 border rounded text-sm font-bold focus:outline-none focus:border-[#FF5510]" />
                          <textarea value={fase.desc} onChange={(e) => updateRoadmap(fase.id, 'desc', e.target.value)} className="w-full px-2 py-1 border rounded text-xs focus:outline-none focus:border-[#FF5510]" rows="2" />
                          <select value={fase.status} onChange={(e) => updateRoadmap(fase.id, 'status', e.target.value)} className="w-full px-2 py-1 border rounded text-xs focus:outline-none focus:border-[#FF5510]">
                            <option value="completed">Concluído</option>
                            <option value="current">Em Andamento</option>
                            <option value="pending">Pendente</option>
                          </select>
                        </div>
                      ) : (
                        <>
                          <h4 className="font-bold text-sm" style={{ color: fase.status === 'pending' ? '#999' : BRAND.dark }}>{fase.title}</h4>
                          <p className="text-xs mt-1" style={{ color: fase.status === 'pending' ? '#aaa' : '#666' }}>{fase.desc}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* PLANO DE AÇÃO / TAREFAS */}
              <div className="p-6 rounded-xl border bg-white shadow-sm flex flex-col" style={{ borderColor: BRAND.gray }}>
                <div className="flex justify-between items-center mb-6 border-b pb-4" style={{ borderColor: BRAND.gray }}>
                  <h3 className="text-base font-extrabold flex items-center gap-2" style={{ color: BRAND.dark }}>
                    <CheckSquare size={20} style={{ color: BRAND.primary }}/> Plano de Ação (Acompanhamento)
                  </h3>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto pr-2 mb-4 max-h-48">
                  {tasks.map((task, index) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors group" style={{ borderColor: BRAND.gray, opacity: task.status === 'concluido' ? 0.6 : 1 }}>
                      <button onClick={() => toggleTaskStatus(task.id)} className="flex-shrink-0 transition-transform hover:scale-110">
                        {task.status === 'concluido' ? <CheckSquare size={20} className="text-emerald-500" /> : <div className="w-5 h-5 border-2 rounded border-gray-300"></div>}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm font-bold flex items-center gap-1 ${task.status === 'concluido' ? 'line-through text-gray-500' : 'text-slate-800'}`}>
                          {task.title.includes('[IA]') && <Sparkles size={12} style={{ color: BRAND.ai }} />}
                          {task.title.replace('[IA]', '')}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">Resp: {task.resp}</p>
                      </div>
                      
                      {/* Botões de Ação */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => moveTask(index, -1)} disabled={index === 0} className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-slate-500'}`}>
                          <ArrowUp size={16} />
                        </button>
                        <button onClick={() => moveTask(index, 1)} disabled={index === tasks.length - 1} className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${index === tasks.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-slate-500'}`}>
                          <ArrowDown size={16} />
                        </button>
                        <button onClick={() => deleteTask(task.id)} className="p-1.5 rounded hover:bg-red-100 text-red-500 transition-colors ml-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && <p className="text-sm text-center text-gray-400 py-4">Nenhuma ação pendente.</p>}
                </div>

                {/* Adição Manual */}
                <div className="pt-4 border-t flex flex-col gap-2" style={{ borderColor: BRAND.gray }}>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Adicionar nova ação online..." 
                      value={newTask.title} 
                      onChange={(e) => setNewTask({...newTask, title: e.target.value})} 
                      onKeyDown={(e) => e.key === 'Enter' && addTask()}
                      className="px-3 py-2 border rounded-md text-sm w-full outline-none focus:border-[#FF5510] bg-slate-50 focus:bg-white transition-colors" 
                      style={{ borderColor: BRAND.gray }}
                    />
                    <input 
                      type="text" 
                      placeholder="Resp." 
                      value={newTask.resp} 
                      onChange={(e) => setNewTask({...newTask, resp: e.target.value})} 
                      onKeyDown={(e) => e.key === 'Enter' && addTask()}
                      className="w-24 px-3 py-2 border rounded-md text-sm outline-none focus:border-[#FF5510] bg-slate-50 focus:bg-white transition-colors" 
                      style={{ borderColor: BRAND.gray }}
                    />
                    <button onClick={addTask} className="px-4 py-2 rounded-md font-bold text-white shadow-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: BRAND.primary }}>
                      +
                    </button>
                  </div>
                </div>

                {/* INTEGRAÇÃO GEMINI IA: Assistente de Ações */}
                <div className="mt-4 pt-4 border-t" style={{ borderColor: BRAND.gray }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: BRAND.ai }}>
                    <Sparkles size={14} /> ✨ Sugerir Ações com IA (Gemini)
                  </p>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Ex: Baixas vendas em PBM na Região GO. Sugira ações." 
                        value={aiPrompt} 
                        onChange={(e) => setAiPrompt(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerateTasksWithAI()}
                        className="px-3 py-2 border rounded-md text-sm w-full outline-none bg-purple-50 focus:bg-white transition-colors placeholder:text-purple-300" 
                        style={{ borderColor: BRAND.ai, borderWidth: '1px' }}
                      />
                      <button 
                        onClick={handleGenerateTasksWithAI} 
                        disabled={isAiLoading || !aiPrompt.trim()}
                        className="px-4 py-2 rounded-md font-bold text-white whitespace-nowrap shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50" 
                        style={{ backgroundColor: BRAND.ai }}
                      >
                        {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        Analisar
                      </button>
                    </div>
                    {aiError && <p className="text-xs text-red-500 font-medium">{aiError}</p>}
                  </div>
                </div>

              </div>

            </div>

            {/* --- PAINEL: FATURAMENTO E AÇÕES (PMO) --- */}
            <div className="p-6 rounded-xl border bg-white shadow-sm" style={{ borderColor: BRAND.gray }}>
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 border-b pb-4 gap-4" style={{ borderColor: BRAND.gray }}>
                <h3 className="text-base font-extrabold flex items-center gap-2" style={{ color: BRAND.dark }}>
                  <DollarSign size={20} style={{ color: BRAND.primary }}/> Acompanhamento do Faturamento e Ações (Piloto)
                </h3>
                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                  <MultiSelectDropdown inline label="CNPJ:" options={uniqueCnpjs} selected={pmoFilterCnpj} toggleSelection={toggleSelection} setter={setPmoFilterCnpj} />
                  <MultiSelectDropdown inline label="Associado:" options={uniqueAssociados} selected={pmoFilterAssociado} toggleSelection={toggleSelection} setter={setPmoFilterAssociado} />
                  <MultiSelectDropdown inline label="GE:" options={uniqueGEs} selected={pmoFilterGE} toggleSelection={toggleSelection} setter={setPmoFilterGE} />
                  <MultiSelectDropdown inline label="Bandeira:" options={uniqueBandeiras} selected={pmoFilterBandeira} toggleSelection={toggleSelection} setter={setPmoFilterBandeira} />
                  <MultiSelectDropdown inline label="Período:" options={uniqueMesAnoList} selected={pmoFilterMesAno} toggleSelection={toggleSelection} setter={setPmoFilterMesAno} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Card Faturamento Filtrado */}
                <div className="p-6 rounded-xl border flex flex-col justify-center items-center text-center shadow-inner" style={{ backgroundColor: BRAND.bgLight, borderColor: BRAND.gray }}>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Faturamento Acumulado</p>
                  <h2 className="text-4xl font-black mb-2" style={{ color: BRAND.primary }}>{formatCurrency(pmoFaturamento)}</h2>
                  <p className="text-xs font-bold text-slate-400">{new Set(pmoData.map(item => item.cnpj).filter(Boolean)).size} loja(s) mapeada(s) por CNPJ</p>
                </div>

                {/* Log de Ações Realizadas */}
                <div className="lg:col-span-2 flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">Registro de Ações no Piloto</h4>
                    <button onClick={() => setIsEditingAcoes(!isEditingAcoes)} className="text-xs font-bold flex items-center gap-1 transition-colors hover:text-[#FF5510]" style={{ color: isEditingAcoes ? BRAND.primary : '#999' }}>
                      <Plus size={16} /> Registrar Nova Ação
                    </button>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto max-h-48 pr-2">
                    {pmoAcoes.map(acao => (
                      <div key={acao.id} className="flex gap-4 p-3 rounded-lg border hover:bg-slate-50 transition-colors group relative" style={{ borderColor: BRAND.gray }}>
                        <span className="text-xs font-black text-slate-400 whitespace-nowrap pt-0.5">{acao.date}</span>
                        <div className="flex-1">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-800 mr-2">{acao.associado}</span>
                          <span className="text-sm font-medium text-slate-600">{acao.desc}</span>
                        </div>
                        
                        {/* Botões de Ação (Aparecem no hover) */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 pl-2 rounded-r-lg">
                          <button onClick={() => moveAcao(acao.id, -1)} className="p-1.5 rounded hover:bg-slate-200 text-slate-500 transition-colors">
                            <ArrowUp size={14} />
                          </button>
                          <button onClick={() => moveAcao(acao.id, 1)} className="p-1.5 rounded hover:bg-slate-200 text-slate-500 transition-colors">
                            <ArrowDown size={14} />
                          </button>
                          <button onClick={() => deleteAcao(acao.id)} className="p-1.5 rounded hover:bg-red-100 text-red-500 transition-colors ml-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {pmoAcoes.length === 0 && <p className="text-xs font-bold text-center text-gray-400 py-4">Nenhuma ação registrada para este Associado.</p>}
                  </div>

                  {isEditingAcoes && (
                    <div className="mt-4 flex gap-2 p-3 bg-slate-50 border border-dashed rounded-lg" style={{ borderColor: BRAND.gray }}>
                      <input 
                        type="text" 
                        placeholder="Descreva a ação realizada..." 
                        value={newAcao} 
                        onChange={e => setNewAcao(e.target.value)} 
                        className="flex-1 px-3 py-2 border rounded-md text-sm font-medium outline-none focus:border-[#FF5510]" 
                      />
                      <button 
                        onClick={() => {
                          if(newAcao) {
                            const acaoAssociado = pmoFilterAssociado.length === 1 ? pmoFilterAssociado[0] : 'Geral';
                            const newAcoes = [{id: Date.now(), date: new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'short'}), associado: acaoAssociado, desc: newAcao}, ...acoesRealizadas];
                            setAcoesRealizadas(newAcoes);
                            setNewAcao('');
                            syncToFirebase({ acoesRealizadas: newAcoes });
                          }
                        }} 
                        className="px-5 py-2 rounded-md font-bold text-white transition-opacity hover:opacity-90" 
                        style={{ backgroundColor: BRAND.dark }}
                      >
                        Salvar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* GRÁFICO DE EVOLUÇÃO (PMO) */}
              <div className="mt-8 pt-6 border-t" style={{ borderColor: BRAND.gray }}>
                <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
                  <BarChart2 size={16} style={{ color: BRAND.primary }}/> Evolução do Faturamento no Piloto
                </h4>
                <div className="h-56">
                  {pmoChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pmoChartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="mesAno" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#666' }} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} tick={{ fontSize: 11, fontWeight: 600, fill: '#666' }} />
                        <RechartsTooltip cursor={{fill: '#f9f9f9'}} formatter={(value) => [formatCurrency(value), 'Faturamento']} contentStyle={{ borderRadius: '8px', border: `1px solid ${BRAND.gray}`, fontFamily: "'Rubik', sans-serif" }} />
                        <Bar dataKey="vendaLiquida" fill={BRAND.primary} radius={[4, 4, 0, 0]} maxBarSize={50}>
                          <LabelList dataKey="vendaLiquida" position="top" formatter={formatCompact} style={{ fill: BRAND.dark, fontSize: 11, fontWeight: 800 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-bold text-gray-400">Dados insuficientes para gerar gráfico.</div>
                  )}
                </div>
              </div>

            </div>
            
          </div>
        )}

        {/* =========================================
            ABA 2: INDICADORES (GRÁFICO DINÂMICO)
            ========================================= */}
        {activeTab === 'financial' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Filtro de Loja para os Indicadores */}
            <div className="rounded shadow-sm border bg-white" style={{ borderColor: BRAND.gray }}>
              <button onClick={() => setIsFiltersOpen(!isFiltersOpen)} className="w-full px-6 py-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2 text-sm font-bold uppercase" style={{ color: BRAND.dark }}>
                  <Filter size={18} style={{ color: BRAND.primary }} /> Selecionar Escopo de Análise
                </div>
                {isFiltersOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              
              {isFiltersOpen && (
                <div className="p-6 pt-0 border-t mt-2" style={{ borderColor: BRAND.gray }}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                    <MultiSelectDropdown label="Lojas (Razão Social)" options={uniqueLojas} selected={selectedLojas} toggleSelection={toggleSelection} setter={setSelectedLojas} />
                    <MultiSelectDropdown label="Associados Mapeados" options={uniqueAssociados} selected={selectedAssociados} toggleSelection={toggleSelection} setter={setSelectedAssociados} />
                    <MultiSelectDropdown label="Mês/Ano" options={uniqueMesAnoList} selected={selectedMesAno} toggleSelection={toggleSelection} setter={setSelectedMesAno} />
                  </div>
                </div>
              )}
            </div>

            {/* Resumo Rápido */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded border bg-white" style={{ borderColor: BRAND.gray }}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Faturamento Mapeado</p>
                <h3 className="text-xl font-black text-slate-900">{formatCurrency(kpis.totalVendas)}</h3>
              </div>
              <div className="p-4 rounded border bg-white" style={{ borderColor: BRAND.gray }}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">CMV Médio</p>
                <h3 className="text-xl font-black text-slate-900">{formatPercent(kpis.cmvMedio)}</h3>
              </div>
              <div className="p-4 rounded border bg-white" style={{ borderColor: BRAND.gray }}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Delivery</p>
                <h3 className="text-xl font-black text-slate-900">{formatCurrency(kpis.totalDelivery)}</h3>
              </div>
              <div className="p-4 rounded border bg-white" style={{ borderColor: BRAND.gray }}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Lojas Analisadas</p>
                <h3 className="text-xl font-black text-slate-900">{filteredData.length}</h3>
              </div>
            </div>

            {/* PAINEL: GRÁFICO DINÂMICO */}
            <div className="p-6 rounded-xl border shadow-sm" style={{ backgroundColor: BRAND.white, borderColor: BRAND.gray }}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b pb-4" style={{ borderColor: BRAND.gray }}>
                <h3 className="text-base font-extrabold flex items-center gap-2" style={{ color: BRAND.dark }}>
                  <TrendingUp size={20} style={{ color: BRAND.primary }}/> Evolução Temporal dos Indicadores
                </h3>
                
                {/* O SELETOR DE INDICADORES (MULTISSELEÇÃO) */}
                <div className="relative z-20">
                  <button onClick={() => setIsMetricSelectOpen(!isMetricSelectOpen)} className="flex items-center gap-2 px-4 py-2 rounded-md border font-bold text-sm bg-white hover:bg-slate-50 transition-colors" style={{ borderColor: BRAND.gray, color: BRAND.dark }}>
                    {selectedMetricsLabels.length} Indicadores Selecionados {isMetricSelectOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {isMetricSelectOpen && (
                    <div className="absolute right-0 mt-2 bg-white border shadow-lg rounded-md p-2 w-64 max-h-60 overflow-y-auto" style={{ borderColor: BRAND.gray }}>
                      {metricLabels.map(label => (
                        <label key={label} className="flex gap-3 p-2 hover:bg-slate-50 cursor-pointer rounded-md items-center">
                          <input 
                            type="checkbox" 
                            checked={selectedMetricsLabels.includes(label)} 
                            onChange={() => toggleSelection(label, selectedMetricsLabels, setSelectedMetricsLabels)} 
                            className="accent-[#FF5510] w-4 h-4" 
                          />
                          <span className="text-sm font-bold text-slate-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="h-80">
                {dynamicLineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dynamicLineData} margin={{ top: 30, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                      <XAxis dataKey="mesAno" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#666' }} />
                      
                      <YAxis 
                        yAxisId="currency" 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(val) => `${val/1000}k`} 
                        tick={{ fontSize: 11, fontWeight: 600, fill: '#666' }} 
                        hide={!selectedMetricsLabels.some(l => METRICS_CONFIG[l].type === 'currency')}
                      />
                      <YAxis 
                        yAxisId="percent" 
                        orientation="right" 
                        axisLine={false} 
                        tickLine={false} 
                        domain={['dataMin - 2', 'dataMax + 2']} 
                        tickFormatter={(val) => `${new Intl.NumberFormat('pt-BR').format(val)}%`} 
                        tick={{ fontSize: 11, fontWeight: 600, fill: '#666' }} 
                        hide={!selectedMetricsLabels.some(l => METRICS_CONFIG[l].type === 'percent')}
                      />
                      
                      <RechartsTooltip 
                        formatter={(value, name) => {
                          const conf = METRICS_CONFIG[name];
                          return conf?.type === 'percent' ? [`${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`, name] : [formatCurrency(value), name];
                        }}
                        contentStyle={{ borderRadius: '8px', border: `1px solid ${BRAND.gray}`, fontFamily: "'Rubik', sans-serif", fontWeight: 600 }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '12px', fontWeight: 600 }} />
                      
                      {selectedMetricsLabels.map((label) => {
                        const config = METRICS_CONFIG[label];
                        return (
                          <Line 
                            key={config.id}
                            yAxisId={config.type}
                            type="monotone" 
                            dataKey={config.id} 
                            name={label}
                            stroke={config.color} 
                            strokeWidth={3} 
                            dot={{ r: 5, fill: config.color, strokeWidth: 2, stroke: '#fff' }} 
                            activeDot={{ r: 7 }} 
                          >
                            <LabelList 
                              dataKey={config.id} 
                              position="top" 
                              formatter={(val) => config.type === 'percent' ? `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val)}%` : formatCompact(val)} 
                              style={{ fill: config.color, fontSize: 11, fontWeight: 700 }} 
                              offset={10}
                            />
                          </Line>
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-bold text-gray-400">Dados insuficientes.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            ABA 3: ESTRATÉGIA
            ========================================= */}
        {activeTab === 'operational' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            
            {/* Módulo de Filtros (Comum para a base de Lojas) */}
            <div className="rounded shadow-sm border bg-white" style={{ borderColor: BRAND.gray }}>
              <button onClick={() => setIsFiltersOpen(!isFiltersOpen)} className="w-full px-6 py-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2 text-sm font-bold uppercase" style={{ color: BRAND.dark }}>
                  <Filter size={18} style={{ color: BRAND.primary }} /> Selecionar Escopo de Lojas
                </div>
                {isFiltersOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              
              {isFiltersOpen && (
                <div className="p-6 pt-0 border-t mt-2" style={{ borderColor: BRAND.gray }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                    <div>
                      <label className="block text-xs font-bold mb-2 uppercase text-slate-500">Busca Livre (Loja/Cidade)</label>
                      <input 
                        type="text" 
                        placeholder="Digitar texto..." 
                        className="w-full px-3 py-2 border rounded bg-white text-sm font-bold outline-none focus:border-[#FF5510] shadow-sm" 
                        style={{ borderColor: BRAND.gray }} 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-2 uppercase text-slate-500">CNPJ</label>
                      <input 
                        type="text" 
                        placeholder="Digitar CNPJ..." 
                        className="w-full px-3 py-2 border rounded bg-white text-sm font-bold outline-none focus:border-[#FF5510] shadow-sm" 
                        style={{ borderColor: BRAND.gray }} 
                        value={searchCnpj} 
                        onChange={(e) => setSearchCnpj(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-2 uppercase text-slate-500">Estado / Região</label>
                      <select className="w-full px-3 py-2 border rounded bg-white text-sm font-bold focus:outline-none shadow-sm" style={{ borderColor: BRAND.gray }} value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
                        <option value="TODOS">Todos os Estados</option>
                        <option value="MS">MS</option>
                        <option value="MT">MT</option>
                        <option value="GO">GO</option>
                        <option value="DF">DF</option>
                      </select>
                    </div>
                    <MultiSelectDropdown label="GE (Grupo)" options={uniqueGEs} selected={selectedGEs} toggleSelection={toggleSelection} setter={setSelectedGEs} />
                    <MultiSelectDropdown label="Associados Mapeados" options={uniqueAssociados} selected={selectedAssociados} toggleSelection={toggleSelection} setter={setSelectedAssociados} />
                    <MultiSelectDropdown label="Mês/Ano" options={uniqueMesAnoList} selected={selectedMesAno} toggleSelection={toggleSelection} setter={setSelectedMesAno} />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Gráfico Mix de Vendas */}
              <div className="p-6 rounded border bg-white shadow-sm" style={{ borderColor: BRAND.gray }}>
                <h3 className="text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                  <PieChart size={18} className="text-[#FF5510]" /> Mix de Vendas
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={salesComposition} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                        {salesComposition.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={[BRAND.dark, '#888', BRAND.primary, '#3b82f6', '#8b5cf6'][index % 5]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', border: 'none', fontWeight: 500 }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tabela de Lojas com IA */}
              <div className="p-6 rounded border bg-white shadow-sm lg:col-span-2 overflow-hidden" style={{ borderColor: BRAND.gray }}>
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: BRAND.dark }}>
                    <FileText size={18} style={{ color: BRAND.primary }}/> Relatório Analítico de Lojas
                  </h3>
                </div>
                <div className="overflow-x-auto border rounded" style={{ borderColor: BRAND.gray }}>
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="text-[10px] uppercase font-black tracking-widest bg-slate-50 text-slate-500 border-b">
                      <tr>
                        <th className="px-4 py-3">Loja / Razão Social</th>
                        <th className="px-4 py-3 text-right">Vendas</th>
                        <th className="px-4 py-3 text-center">Status CMV</th>
                        <th className="px-4 py-3 text-right">Marcas P.</th>
                        <th className="px-4 py-3 text-right">Dermaclub</th>
                        <th className="px-4 py-3 text-right">Inspire</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((row) => {
                        let cmvColor = 'bg-emerald-100 text-emerald-800';
                        if (row.cmv > 66 && row.cmv <= 68) cmvColor = 'bg-amber-100 text-amber-800';
                        if (row.cmv > 68) cmvColor = 'bg-red-100 text-red-800';
                        const insight = storeInsights[row.id];

                        return (
                          <React.Fragment key={row.id}>
                            <tr className="border-b hover:bg-slate-50 transition-colors" style={{ borderColor: BRAND.gray }}>
                              <td className="px-4 py-3">
                                <div className="font-bold text-slate-900 truncate max-w-[200px]" title={row.razaoSocial}>{row.razaoSocial}</div>
                                <div className="text-xs text-slate-500">{row.estado} - {row.bandeira}</div>
                                
                                {/* BOTÃO PARA GERAR INSIGHT IA */}
                                <button 
                                  onClick={() => handleStoreDiagnosticAI(row)}
                                  disabled={insight?.loading}
                                  className="mt-1 text-[10px] font-bold flex items-center gap-1 hover:underline transition-opacity disabled:opacity-50"
                                  style={{ color: BRAND.ai }}
                                >
                                  {insight?.loading ? <Loader2 size={10} className="animate-spin"/> : <Sparkles size={10}/>}
                                  {insight?.text ? 'Atualizar Diagnóstico IA' : '✨ Gerar Diagnóstico com IA'}
                                </button>

                              </td>
                              <td className="px-4 py-3 text-right font-bold" style={{ color: BRAND.dark }}>{formatCurrency(row.vendaLiquida)}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${cmvColor}`}>
                                  {formatPercent(row.cmv)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-bold" style={{ color: BRAND.primary }}>{formatCurrency(row.marcasProprias)}</td>
                              <td className="px-4 py-3 text-right font-bold" style={{ color: '#3b82f6' }}>{formatCurrency(row.dermaclub)}</td>
                              <td className="px-4 py-3 text-right font-bold" style={{ color: '#8b5cf6' }}>{formatCurrency(row.inspire)}</td>
                            </tr>

                            {/* EXIBIÇÃO DO INSIGHT IA */}
                            {insight?.text && (
                              <tr className="bg-purple-50/50 border-b" style={{ borderColor: BRAND.gray }}>
                                <td colSpan="6" className="px-4 py-3 whitespace-normal">
                                  <div className="flex gap-2 items-start border-l-2 pl-3" style={{ borderColor: BRAND.ai }}>
                                    <Sparkles size={16} style={{ color: BRAND.ai }} className="mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: BRAND.ai }}>Insight Estratégico (Gemini AI)</p>
                                      <p className="text-sm font-medium text-slate-700 leading-relaxed">{insight.text}</p>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                            {insight?.error && (
                              <tr className="bg-red-50/50 border-b" style={{ borderColor: BRAND.gray }}>
                                <td colSpan="6" className="px-4 py-2 whitespace-normal text-xs text-red-600 font-bold">{insight.error}</td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {filteredData.length === 0 && <tr><td colSpan="6" className="text-center py-6 text-sm text-gray-400">Nenhum registro encontrado.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* --- NOVOS GRÁFICOS: DETALHAMENTO DAS ESTRATÉGIAS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Gráfico Marcas Próprias */}
              <div className="p-5 rounded border bg-white shadow-sm" style={{ borderColor: BRAND.gray }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: BRAND.primary }}>
                  <Star size={16} /> Marcas Próprias
                </h3>
                <div className="h-48">
                  {operEvolutionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={operEvolutionData} margin={{ top: 25, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="mesAno" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#666' }} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} tick={{ fontSize: 10, fontWeight: 600, fill: '#666' }} />
                        <RechartsTooltip cursor={{fill: '#f9f9f9'}} formatter={(value) => [formatCurrency(value), 'Marcas Próprias']} contentStyle={{ borderRadius: '8px', border: `1px solid ${BRAND.gray}`, fontFamily: "'Rubik', sans-serif", fontSize: 12 }} />
                        <Bar dataKey="marcasProprias" fill={BRAND.primary} radius={[4, 4, 0, 0]} maxBarSize={40}>
                          <LabelList dataKey="marcasProprias" position="top" formatter={formatCompact} style={{ fill: BRAND.dark, fontSize: 10, fontWeight: 800 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs font-bold text-gray-400">Sem dados</div>
                  )}
                </div>
              </div>

              {/* Gráfico PBM */}
              <div className="p-5 rounded border bg-white shadow-sm" style={{ borderColor: BRAND.gray }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: BRAND.success }}>
                  <Package size={16} /> PBM
                </h3>
                <div className="h-48">
                  {operEvolutionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={operEvolutionData} margin={{ top: 25, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="mesAno" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#666' }} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} tick={{ fontSize: 10, fontWeight: 600, fill: '#666' }} />
                        <RechartsTooltip cursor={{fill: '#f9f9f9'}} formatter={(value) => [formatCurrency(value), 'PBM']} contentStyle={{ borderRadius: '8px', border: `1px solid ${BRAND.gray}`, fontFamily: "'Rubik', sans-serif", fontSize: 12 }} />
                        <Bar dataKey="pbm" fill={BRAND.success} radius={[4, 4, 0, 0]} maxBarSize={40}>
                          <LabelList dataKey="pbm" position="top" formatter={formatCompact} style={{ fill: BRAND.dark, fontSize: 10, fontWeight: 800 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs font-bold text-gray-400">Sem dados</div>
                  )}
                </div>
              </div>

              {/* Gráfico PEC */}
              <div className="p-5 rounded border bg-white shadow-sm" style={{ borderColor: BRAND.gray }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: '#0ea5e9' }}>
                  <Activity size={16} /> Efetividade PEC
                </h3>
                <div className="h-48">
                  {operEvolutionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={operEvolutionData} margin={{ top: 25, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="mesAno" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#666' }} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val}%`} tick={{ fontSize: 10, fontWeight: 600, fill: '#666' }} />
                        <RechartsTooltip cursor={{fill: '#f9f9f9'}} formatter={(value) => [`${value}%`, 'Efetividade PEC']} contentStyle={{ borderRadius: '8px', border: `1px solid ${BRAND.gray}`, fontFamily: "'Rubik', sans-serif", fontSize: 12 }} />
                        <Bar dataKey="pec" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={40}>
                          <LabelList dataKey="pec" position="top" formatter={(val) => `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val)}%`} style={{ fill: BRAND.dark, fontSize: 10, fontWeight: 800 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs font-bold text-gray-400">Sem dados</div>
                  )}
                </div>
              </div>

              {/* Gráfico Dermaclub */}
              <div className="p-5 rounded border bg-white shadow-sm" style={{ borderColor: BRAND.gray }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: '#3b82f6' }}>
                  <TrendingUp size={16} /> Dermaclub
                </h3>
                <div className="h-48">
                  {operEvolutionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={operEvolutionData} margin={{ top: 25, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="mesAno" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#666' }} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} tick={{ fontSize: 10, fontWeight: 600, fill: '#666' }} />
                        <RechartsTooltip cursor={{fill: '#f9f9f9'}} formatter={(value) => [formatCurrency(value), 'Dermaclub']} contentStyle={{ borderRadius: '8px', border: `1px solid ${BRAND.gray}`, fontFamily: "'Rubik', sans-serif", fontSize: 12 }} />
                        <Bar dataKey="dermaclub" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                          <LabelList dataKey="dermaclub" position="top" formatter={formatCompact} style={{ fill: BRAND.dark, fontSize: 10, fontWeight: 800 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs font-bold text-gray-400">Sem dados</div>
                  )}
                </div>
              </div>

              {/* Gráfico Inspire */}
              <div className="p-5 rounded border bg-white shadow-sm" style={{ borderColor: BRAND.gray }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: '#8b5cf6' }}>
                  <TrendingUp size={16} /> Inspire
                </h3>
                <div className="h-48">
                  {operEvolutionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={operEvolutionData} margin={{ top: 25, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="mesAno" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#666' }} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} tick={{ fontSize: 10, fontWeight: 600, fill: '#666' }} />
                        <RechartsTooltip cursor={{fill: '#f9f9f9'}} formatter={(value) => [formatCurrency(value), 'Inspire']} contentStyle={{ borderRadius: '8px', border: `1px solid ${BRAND.gray}`, fontFamily: "'Rubik', sans-serif", fontSize: 12 }} />
                        <Bar dataKey="inspire" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                          <LabelList dataKey="inspire" position="top" formatter={formatCompact} style={{ fill: BRAND.dark, fontSize: 10, fontWeight: 800 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs font-bold text-gray-400">Sem dados</div>
                  )}
                </div>
              </div>

              {/* Gráfico Delivery */}
              <div className="p-5 rounded border bg-white shadow-sm" style={{ borderColor: BRAND.gray }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: '#f59e0b' }}>
                  <Package size={16} /> Venda Delivery
                </h3>
                <div className="h-48">
                  {operEvolutionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={operEvolutionData} margin={{ top: 25, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="mesAno" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#666' }} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} tick={{ fontSize: 10, fontWeight: 600, fill: '#666' }} />
                        <RechartsTooltip cursor={{fill: '#f9f9f9'}} formatter={(value) => [formatCurrency(value), 'Delivery']} contentStyle={{ borderRadius: '8px', border: `1px solid ${BRAND.gray}`, fontFamily: "'Rubik', sans-serif", fontSize: 12 }} />
                        <Bar dataKey="vendaDelivery" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40}>
                          <LabelList dataKey="vendaDelivery" position="top" formatter={formatCompact} style={{ fill: BRAND.dark, fontSize: 10, fontWeight: 800 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs font-bold text-gray-400">Sem dados</div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}

// Componente MultiSelectDropdown Reaproveitável (COM BUSCA INTERNA)
function MultiSelectDropdown({ label, options, selected, toggleSelection, setter, inline }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filtra as opções baseadas no que foi digitado na busca interna
  const filteredOptions = options.filter(opt => 
    String(opt).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`relative ${inline ? 'flex items-center gap-2' : ''}`}>
      <label className={`text-xs font-bold uppercase text-slate-500 ${inline ? 'whitespace-nowrap' : 'block mb-2 tracking-wide'}`}>{label}</label>
      <div 
        className={`px-3 py-2 border rounded bg-white flex justify-between items-center cursor-pointer text-sm font-bold shadow-sm hover:bg-slate-50 ${inline ? 'w-48 py-1.5' : 'w-full'}`}
        style={{ borderColor: BRAND.gray }}
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) setSearchQuery(''); // Limpa a busca ao fechar
        }}
      >
        <span className="truncate" style={{ color: selected.length === 0 ? '#999' : BRAND.dark }}>
          {selected.length === 0 ? (inline ? 'Todos' : 'Selecionar...') : `${selected.length} selecionado(s)`}
        </span>
        {isOpen ? <ChevronUp size={16} className="ml-2 flex-shrink-0" /> : <ChevronDown size={16} className="ml-2 flex-shrink-0" />}
      </div>
      
      {isOpen && (
        <div className={`absolute z-10 bg-white border rounded shadow-xl flex flex-col ${inline ? 'top-10 left-0 w-64' : 'w-full mt-1'}`} style={{ borderColor: BRAND.gray, maxHeight: '20rem' }}>
          
          {/* Campo de Busca Interno */}
          <div className="p-2 border-b sticky top-0 bg-slate-50 z-20 rounded-t" style={{ borderColor: BRAND.gray }}>
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()} // Evita que clique no input feche o menu
              className="w-full px-2 py-1.5 text-sm border rounded outline-none focus:border-[#FF5510] font-medium"
            />
          </div>

          {/* Lista de Opções Filtradas */}
          <div className="overflow-y-auto flex-1">
            {filteredOptions.map(opt => (
              <label key={opt} className="flex items-center gap-3 cursor-pointer p-3 hover:bg-slate-50 border-b last:border-b-0" style={{ borderColor: BRAND.gray }}>
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggleSelection(opt, selected, setter)} className="accent-[#FF5510] w-4 h-4 cursor-pointer flex-shrink-0" />
                <span className="text-sm font-bold text-slate-700 truncate" title={opt}>{opt}</span>
              </label>
            ))}
            {filteredOptions.length === 0 && <div className="p-4 text-xs font-bold text-center text-gray-400">Nenhum resultado encontrado</div>}
          </div>
          
        </div>
      )}
    </div>
  );
}