import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/formatters';
import {
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Coins,
  Scale,
  ChevronDown,
  ChevronUp,
  FileText,
  Gavel
} from 'lucide-react';

interface RubricaAnalise {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string;
  incid_inss: string;
  incid_irrf: string;
  incid_fgts: string;
  padrao_inss: string | null;
  padrao_irrf: string | null;
  padrao_fgts: string | null;
  fundamentacao: string | null;
  divergencia_inss: 'conforme' | 'risco' | 'oportunidade' | 'nao_mapeado';
  divergencia_irrf: 'conforme' | 'risco' | 'oportunidade' | 'nao_mapeado';
  divergencia_fgts: 'conforme' | 'risco' | 'oportunidade' | 'nao_mapeado';
  tem_processo: boolean;
}

type FilterType = 'todos' | 'risco' | 'oportunidade' | 'conforme' | 'nao_mapeado';

export function AnaliseRubricasPage() {
  const { empresa } = useAuth();
  const [rubricas, setRubricas] = useState<RubricaAnalise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('todos');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    conformes: 0,
    riscos: 0,
    oportunidades: 0,
    naoMapeados: 0,
  });

  useEffect(() => {
    if (empresa) {
      loadRubricasAnalise();
    }
  }, [empresa]);

  async function loadRubricasAnalise() {
    if (!empresa) return;

    setLoading(true);

    const [rubricasRes, baseRes, vinculosRes] = await Promise.all([
      supabase
        .from('rubricas')
        .select('*')
        .eq('empresa_id', empresa.id)
        .order('codigo'),
      supabase
        .from('base_conhecimento_rubricas')
        .select('*'),
      supabase
        .from('rubrica_processo_vinculo')
        .select('rubrica_id, tributo_suspenso')
        .eq('empresa_id', empresa.id),
    ]);

    const clienteRubricas = rubricasRes.data || [];
    const baseConhecimento = baseRes.data || [];
    const vinculos = vinculosRes.data || [];

    const baseMap = new Map<string, typeof baseConhecimento[0]>();
    baseConhecimento.forEach(b => baseMap.set(b.natureza_rubrica, b));

    const vinculosMap = new Map<string, Set<string>>();
    vinculos.forEach(v => {
      const existing = vinculosMap.get(v.rubrica_id) || new Set();
      existing.add(v.tributo_suspenso);
      vinculosMap.set(v.rubrica_id, existing);
    });

    const analisadas: RubricaAnalise[] = clienteRubricas.map(r => {
      const padrao = baseMap.get(r.tipo);
      const processosRubrica = vinculosMap.get(r.id);
      const temProcesso = !!processosRubrica && processosRubrica.size > 0;

      const incidAtiva = (cod: string | null) => cod !== '00' && cod !== '' && cod !== null;

      function getDivergencia(
        clienteIncide: boolean,
        padraoIncide: boolean | null,
        tributo: string
      ): 'conforme' | 'risco' | 'oportunidade' | 'nao_mapeado' {
        if (padraoIncide === null) return 'nao_mapeado';

        if (temProcesso && processosRubrica) {
          const tributosSuspensos = processosRubrica;
          if (tributosSuspensos.has('TODOS') || tributosSuspensos.has(tributo)) {
            return 'conforme';
          }
        }

        if (clienteIncide === padraoIncide) return 'conforme';
        if (clienteIncide && !padraoIncide) return 'oportunidade';
        return 'risco';
      }

      const clienteINSS = incidAtiva(r.incid_inss);
      const clienteIRRF = incidAtiva(r.incid_irrf);
      const clienteFGTS = incidAtiva(r.incid_fgts);

      const padraoINSS = padrao ? incidAtiva(padrao.incid_inss_padrao) : null;
      const padraoIRRF = padrao ? incidAtiva(padrao.incid_irrf_padrao) : null;
      const padraoFGTS = padrao ? incidAtiva(padrao.incid_fgts_padrao) : null;

      return {
        id: r.id,
        codigo: r.codigo,
        descricao: r.descricao,
        tipo: r.tipo,
        incid_inss: r.incid_inss || '00',
        incid_irrf: r.incid_irrf || '00',
        incid_fgts: r.incid_fgts || '00',
        padrao_inss: padrao?.incid_inss_padrao || null,
        padrao_irrf: padrao?.incid_irrf_padrao || null,
        padrao_fgts: padrao?.incid_fgts_padrao || null,
        fundamentacao: padrao?.fundamentacao_legal || null,
        divergencia_inss: getDivergencia(clienteINSS, padraoINSS, 'INSS'),
        divergencia_irrf: getDivergencia(clienteIRRF, padraoIRRF, 'IRRF'),
        divergencia_fgts: getDivergencia(clienteFGTS, padraoFGTS, 'FGTS'),
        tem_processo: temProcesso,
      };
    });

    const newStats = {
      total: analisadas.length,
      conformes: 0,
      riscos: 0,
      oportunidades: 0,
      naoMapeados: 0,
    };

    analisadas.forEach(r => {
      const divergencias = [r.divergencia_inss, r.divergencia_irrf, r.divergencia_fgts];
      if (divergencias.includes('risco')) {
        newStats.riscos++;
      } else if (divergencias.includes('oportunidade')) {
        newStats.oportunidades++;
      } else if (divergencias.includes('nao_mapeado')) {
        newStats.naoMapeados++;
      } else {
        newStats.conformes++;
      }
    });

    setStats(newStats);
    setRubricas(analisadas);
    setLoading(false);
  }

  const filteredRubricas = rubricas.filter(r => {
    const matchesSearch =
      r.codigo.toLowerCase().includes(search.toLowerCase()) ||
      r.descricao.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    const divergencias = [r.divergencia_inss, r.divergencia_irrf, r.divergencia_fgts];

    switch (filter) {
      case 'risco':
        return divergencias.includes('risco');
      case 'oportunidade':
        return divergencias.includes('oportunidade');
      case 'conforme':
        return divergencias.every(d => d === 'conforme');
      case 'nao_mapeado':
        return divergencias.includes('nao_mapeado');
      default:
        return true;
    }
  });

  function getStatusBadge(status: 'conforme' | 'risco' | 'oportunidade' | 'nao_mapeado') {
    switch (status) {
      case 'conforme':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-xs font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Conforme
          </span>
        );
      case 'risco':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-xs font-medium">
            <ShieldAlert className="w-3 h-3" />
            Risco
          </span>
        );
      case 'oportunidade':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-xs font-medium">
            <Coins className="w-3 h-3" />
            Oportunidade
          </span>
        );
      case 'nao_mapeado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-500/10 text-slate-400 rounded text-xs font-medium">
            <AlertTriangle className="w-3 h-3" />
            N/A
          </span>
        );
    }
  }

  function getIncidenciaLabel(codigo: string | null): string {
    if (!codigo || codigo === '00') return 'Nao Incide';
    if (codigo === '11') return 'Incide';
    if (codigo === '31') return 'Isento';
    if (codigo === '21') return 'Suspenso';
    return codigo;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Analise de Rubricas</h1>
        <p className="text-slate-400">Comparativo entre parametrizacao do cliente e base legal</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-slate-800/50 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Conformes</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.conformes}</p>
        </div>
        <div className="bg-slate-800/50 border border-red-500/30 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Riscos</p>
          <p className="text-2xl font-bold text-red-400">{stats.riscos}</p>
        </div>
        <div className="bg-slate-800/50 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Oportunidades</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.oportunidades}</p>
        </div>
        <div className="bg-slate-800/50 border border-amber-500/30 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Nao Mapeados</p>
          <p className="text-2xl font-bold text-amber-400">{stats.naoMapeados}</p>
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl">
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por codigo ou descricao..."
                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['todos', 'risco', 'oportunidade', 'conforme', 'nao_mapeado'] as FilterType[]).map((f) => {
                const labels: Record<FilterType, string> = {
                  todos: 'Todos',
                  risco: 'Riscos',
                  oportunidade: 'Oportunidades',
                  conforme: 'Conformes',
                  nao_mapeado: 'N/A',
                };
                const colors: Record<FilterType, string> = {
                  todos: 'bg-slate-600',
                  risco: 'bg-red-500',
                  oportunidade: 'bg-emerald-500',
                  conforme: 'bg-blue-500',
                  nao_mapeado: 'bg-amber-500',
                };
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filter === f
                        ? `${colors[f]} text-white`
                        : 'bg-slate-700/50 text-slate-400 hover:text-white'
                    }`}
                  >
                    {labels[f]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-4 px-4 text-sm font-medium text-slate-400">Codigo</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-slate-400">Descricao</th>
                <th className="text-center py-4 px-4 text-sm font-medium text-slate-400">INSS</th>
                <th className="text-center py-4 px-4 text-sm font-medium text-slate-400">IRRF</th>
                <th className="text-center py-4 px-4 text-sm font-medium text-slate-400">FGTS</th>
                <th className="text-center py-4 px-4 text-sm font-medium text-slate-400">Processo</th>
                <th className="py-4 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRubricas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Nenhuma rubrica encontrada
                  </td>
                </tr>
              ) : (
                filteredRubricas.map((rubrica) => (
                  <>
                    <tr
                      key={rubrica.id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                      onClick={() => setExpandedRow(expandedRow === rubrica.id ? null : rubrica.id)}
                    >
                      <td className="py-4 px-4">
                        <span className="font-mono text-white">{rubrica.codigo}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-slate-300 line-clamp-1">{rubrica.descricao}</span>
                        <span className="text-xs text-slate-500 block">{rubrica.tipo}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {getStatusBadge(rubrica.divergencia_inss)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {getStatusBadge(rubrica.divergencia_irrf)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {getStatusBadge(rubrica.divergencia_fgts)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {rubrica.tem_processo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs font-medium">
                            <Gavel className="w-3 h-3" />
                            Sim
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {expandedRow === rubrica.id ? (
                          <ChevronUp className="w-5 h-5 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-500" />
                        )}
                      </td>
                    </tr>
                    {expandedRow === rubrica.id && (
                      <tr className="bg-slate-800/30">
                        <td colSpan={7} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <h4 className="font-medium text-white flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-400" />
                                Parametrizacao do Cliente
                              </h4>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="bg-slate-700/30 rounded-lg p-3">
                                  <p className="text-xs text-slate-500 mb-1">INSS</p>
                                  <p className="text-sm text-white">{getIncidenciaLabel(rubrica.incid_inss)}</p>
                                  <p className="text-xs text-slate-500">Cod: {rubrica.incid_inss || '00'}</p>
                                </div>
                                <div className="bg-slate-700/30 rounded-lg p-3">
                                  <p className="text-xs text-slate-500 mb-1">IRRF</p>
                                  <p className="text-sm text-white">{getIncidenciaLabel(rubrica.incid_irrf)}</p>
                                  <p className="text-xs text-slate-500">Cod: {rubrica.incid_irrf || '00'}</p>
                                </div>
                                <div className="bg-slate-700/30 rounded-lg p-3">
                                  <p className="text-xs text-slate-500 mb-1">FGTS</p>
                                  <p className="text-sm text-white">{getIncidenciaLabel(rubrica.incid_fgts)}</p>
                                  <p className="text-xs text-slate-500">Cod: {rubrica.incid_fgts || '00'}</p>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <h4 className="font-medium text-white flex items-center gap-2">
                                <Scale className="w-4 h-4 text-emerald-400" />
                                Parametrizacao Legal (Source of Truth)
                              </h4>
                              {rubrica.padrao_inss !== null ? (
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                                    <p className="text-xs text-slate-500 mb-1">INSS</p>
                                    <p className="text-sm text-emerald-400">{getIncidenciaLabel(rubrica.padrao_inss)}</p>
                                    <p className="text-xs text-slate-500">Cod: {rubrica.padrao_inss || '00'}</p>
                                  </div>
                                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                                    <p className="text-xs text-slate-500 mb-1">IRRF</p>
                                    <p className="text-sm text-emerald-400">{getIncidenciaLabel(rubrica.padrao_irrf)}</p>
                                    <p className="text-xs text-slate-500">Cod: {rubrica.padrao_irrf || '00'}</p>
                                  </div>
                                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                                    <p className="text-xs text-slate-500 mb-1">FGTS</p>
                                    <p className="text-sm text-emerald-400">{getIncidenciaLabel(rubrica.padrao_fgts)}</p>
                                    <p className="text-xs text-slate-500">Cod: {rubrica.padrao_fgts || '00'}</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 text-amber-400 text-sm">
                                  Natureza "{rubrica.tipo}" nao encontrada na base de conhecimento
                                </div>
                              )}
                            </div>
                          </div>

                          {rubrica.fundamentacao && (
                            <div className="mt-4 bg-slate-700/20 rounded-lg p-4">
                              <p className="text-xs text-slate-500 mb-1">Fundamentacao Legal</p>
                              <p className="text-sm text-slate-300">{rubrica.fundamentacao}</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-700/50 text-sm text-slate-500">
          Exibindo {filteredRubricas.length} de {rubricas.length} rubricas
        </div>
      </div>
    </div>
  );
}
