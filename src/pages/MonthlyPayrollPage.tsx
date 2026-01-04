import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatCompetencia, formatCPF } from '../lib/formatters';
import {
  Search,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  ArrowUpDown,
  Download
} from 'lucide-react';
import type { Remuneracao, Colaborador, Divergencia } from '../types/database';

interface MonthlyPayrollProps {
  competencia: string;
  onNavigateToEmployee: (colaboradorId: string, competencia: string) => void;
}

interface RemuneracaoComColaborador extends Remuneracao {
  colaborador: Colaborador;
  divergencias: number;
}

type SortField = 'nome' | 'valor_bruto' | 'valor_liquido' | 'divergencias';
type SortDirection = 'asc' | 'desc';

export function MonthlyPayrollPage({ competencia, onNavigateToEmployee }: MonthlyPayrollProps) {
  const { empresa } = useAuth();
  const [remuneracoes, setRemuneracoes] = useState<RemuneracaoComColaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    if (empresa && competencia) {
      loadRemuneracoes();
    }
  }, [empresa, competencia]);

  async function loadRemuneracoes() {
    if (!empresa) return;

    setLoading(true);

    const { data: remuneracoesData } = await supabase
      .from('remuneracoes')
      .select(`
        *,
        colaborador:colaboradores(*)
      `)
      .eq('empresa_id', empresa.id)
      .eq('competencia', competencia);

    if (remuneracoesData) {
      const remuneracoesIds = remuneracoesData.map((r) => r.id);

      const { data: divergenciasData } = await supabase
        .from('divergencias')
        .select('remuneracao_id')
        .in('remuneracao_id', remuneracoesIds);

      const divergenciasPorRemuneracao: Record<string, number> = {};
      divergenciasData?.forEach((d) => {
        divergenciasPorRemuneracao[d.remuneracao_id] =
          (divergenciasPorRemuneracao[d.remuneracao_id] || 0) + 1;
      });

      const remuneracoesComDados = remuneracoesData.map((r) => ({
        ...r,
        colaborador: r.colaborador as Colaborador,
        divergencias: divergenciasPorRemuneracao[r.id] || 0,
      }));

      setRemuneracoes(remuneracoesComDados);
    }

    setLoading(false);
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  const filteredRemuneracoes = remuneracoes
    .filter((r) => {
      const search = searchTerm.toLowerCase();
      return (
        r.colaborador.nome.toLowerCase().includes(search) ||
        r.colaborador.cpf.includes(search)
      );
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'nome':
          comparison = a.colaborador.nome.localeCompare(b.colaborador.nome);
          break;
        case 'valor_bruto':
          comparison = a.valor_bruto - b.valor_bruto;
          break;
        case 'valor_liquido':
          comparison = a.valor_liquido - b.valor_liquido;
          break;
        case 'divergencias':
          comparison = a.divergencias - b.divergencias;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const totals = filteredRemuneracoes.reduce(
    (acc, r) => ({
      bruto: acc.bruto + r.valor_bruto,
      descontos: acc.descontos + r.valor_descontos,
      liquido: acc.liquido + r.valor_liquido,
      divergencias: acc.divergencias + r.divergencias,
    }),
    { bruto: 0, descontos: 0, liquido: 0, divergencias: 0 }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Folha de {formatCompetencia(competencia)}
          </h1>
          <p className="text-slate-400">
            {filteredRemuneracoes.length} colaborador{filteredRemuneracoes.length !== 1 ? 'es' : ''}
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors">
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm mb-1">Total Bruto</p>
          <p className="text-xl font-bold text-white">{formatCurrency(totals.bruto)}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm mb-1">Total Descontos</p>
          <p className="text-xl font-bold text-red-400">{formatCurrency(totals.descontos)}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm mb-1">Total Liquido</p>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(totals.liquido)}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm mb-1">Divergencias</p>
          <p className={`text-xl font-bold ${totals.divergencias > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
            {totals.divergencias}
          </p>
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl">
        <div className="p-4 border-b border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou CPF..."
              className="w-full bg-slate-900/50 border border-slate-600 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('nome')}
                    className="flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    Colaborador
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">CPF</th>
                <th className="text-right py-3 px-4">
                  <button
                    onClick={() => handleSort('valor_bruto')}
                    className="flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-white transition-colors ml-auto"
                  >
                    Bruto
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Descontos</th>
                <th className="text-right py-3 px-4">
                  <button
                    onClick={() => handleSort('valor_liquido')}
                    className="flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-white transition-colors ml-auto"
                  >
                    Liquido
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-center py-3 px-4">
                  <button
                    onClick={() => handleSort('divergencias')}
                    className="flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-white transition-colors mx-auto"
                  >
                    Status
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRemuneracoes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nenhum colaborador encontrado
                  </td>
                </tr>
              ) : (
                filteredRemuneracoes.map((remuneracao) => {
                  const hasDivergencias = remuneracao.divergencias > 0;
                  return (
                    <tr
                      key={remuneracao.id}
                      className={`border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors ${
                        hasDivergencias ? 'bg-amber-500/5' : ''
                      }`}
                      onClick={() => onNavigateToEmployee(remuneracao.colaborador_id, competencia)}
                    >
                      <td className="py-4 px-4">
                        <span className="font-medium text-white">
                          {remuneracao.colaborador.nome}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-400">
                        {formatCPF(remuneracao.colaborador.cpf)}
                      </td>
                      <td className="py-4 px-4 text-right text-slate-300">
                        {formatCurrency(remuneracao.valor_bruto)}
                      </td>
                      <td className="py-4 px-4 text-right text-red-400">
                        {formatCurrency(remuneracao.valor_descontos)}
                      </td>
                      <td className="py-4 px-4 text-right text-emerald-400 font-medium">
                        {formatCurrency(remuneracao.valor_liquido)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {hasDivergencias ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-400 rounded-lg text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            {remuneracao.divergencias}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}