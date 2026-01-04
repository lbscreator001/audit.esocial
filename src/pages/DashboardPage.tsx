import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatCompetenciaShort } from '../lib/formatters';
import {
  Users,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
  FileText,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import type { Apuracao, Colaborador, Divergencia } from '../types/database';

interface DashboardProps {
  onNavigateToMonth: (competencia: string) => void;
}

interface DashboardStats {
  totalColaboradores: number;
  totalFolhaBruta: number;
  totalDivergencias: number;
  totalEconomia: number;
}

export function DashboardPage({ onNavigateToMonth }: DashboardProps) {
  const { empresa } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalColaboradores: 0,
    totalFolhaBruta: 0,
    totalDivergencias: 0,
    totalEconomia: 0,
  });
  const [apuracoes, setApuracoes] = useState<Apuracao[]>([]);
  const [divergenciasPorTipo, setDivergenciasPorTipo] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (empresa) {
      loadDashboardData();
    }
  }, [empresa]);

  async function loadDashboardData() {
    if (!empresa) return;

    setLoading(true);

    const [colaboradoresRes, apuracoesRes, divergenciasRes] = await Promise.all([
      supabase
        .from('colaboradores')
        .select('id')
        .eq('empresa_id', empresa.id),
      supabase
        .from('apuracoes')
        .select('*')
        .eq('empresa_id', empresa.id)
        .order('competencia', { ascending: false }),
      supabase
        .from('divergencias')
        .select('tipo')
        .eq('empresa_id', empresa.id),
    ]);

    const colaboradores = colaboradoresRes.data || [];
    const apuracoesData = apuracoesRes.data || [];
    const divergencias = divergenciasRes.data || [];

    const totalFolhaBruta = apuracoesData.reduce(
      (sum, a) => sum + (a.total_bruto_original || 0),
      0
    );

    const totalEconomia = apuracoesData.reduce((sum, a) => {
      const diffInss = (a.total_inss_original || 0) - (a.total_inss_recalculado || 0);
      const diffIrrf = (a.total_irrf_original || 0) - (a.total_irrf_recalculado || 0);
      const diffFgts = (a.total_fgts_original || 0) - (a.total_fgts_recalculado || 0);
      return sum + diffInss + diffIrrf + diffFgts;
    }, 0);

    const tiposContagem: Record<string, number> = {};
    divergencias.forEach((d) => {
      tiposContagem[d.tipo] = (tiposContagem[d.tipo] || 0) + 1;
    });

    setStats({
      totalColaboradores: colaboradores.length,
      totalFolhaBruta,
      totalDivergencias: divergencias.length,
      totalEconomia: Math.abs(totalEconomia),
    });
    setApuracoes(apuracoesData);
    setDivergenciasPorTipo(tiposContagem);
    setLoading(false);
  }

  const kpiCards = [
    {
      label: 'Colaboradores',
      value: stats.totalColaboradores.toString(),
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-400',
    },
    {
      label: 'Folha Bruta Total',
      value: formatCurrency(stats.totalFolhaBruta),
      icon: DollarSign,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-400',
    },
    {
      label: 'Divergencias',
      value: stats.totalDivergencias.toString(),
      icon: AlertTriangle,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-400',
    },
    {
      label: 'Potencial Recuperacao',
      value: formatCurrency(stats.totalEconomia),
      icon: TrendingUp,
      color: 'bg-teal-500',
      bgColor: 'bg-teal-500/10',
      textColor: 'text-teal-400',
    },
  ];

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
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-slate-400">Visao consolidada da auditoria de folha de pagamento</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${card.bgColor} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${card.textColor}`} />
                </div>
              </div>
              <p className="text-slate-400 text-sm mb-1">{card.label}</p>
              <p className="text-2xl font-bold text-white">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Apuracoes por Competencia</h2>
            <FileText className="w-5 h-5 text-slate-500" />
          </div>

          {apuracoes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-400 mb-2">Nenhuma apuracao encontrada</p>
              <p className="text-slate-500 text-sm">Importe arquivos XML para iniciar a auditoria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Competencia</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Bruto Original</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Bruto Recalculado</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Divergencias</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">Status</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {apuracoes.map((apuracao) => {
                    const hasDivergencias = apuracao.total_divergencias > 0;
                    return (
                      <tr
                        key={apuracao.id}
                        className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                        onClick={() => onNavigateToMonth(apuracao.competencia)}
                      >
                        <td className="py-4 px-4">
                          <span className="font-medium text-white">
                            {formatCompetenciaShort(apuracao.competencia)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right text-slate-300">
                          {formatCurrency(apuracao.total_bruto_original)}
                        </td>
                        <td className="py-4 px-4 text-right text-slate-300">
                          {formatCurrency(apuracao.total_bruto_recalculado)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {hasDivergencias ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-400 rounded-lg text-sm">
                              <AlertTriangle className="w-4 h-4" />
                              {apuracao.total_divergencias}
                            </span>
                          ) : (
                            <span className="text-slate-500">0</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {hasDivergencias ? (
                            <span className="inline-flex items-center gap-1 text-amber-400">
                              <XCircle className="w-4 h-4" />
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
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Divergencias por Tipo</h2>
            <AlertTriangle className="w-5 h-5 text-slate-500" />
          </div>

          {Object.keys(divergenciasPorTipo).length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-slate-400 mb-2">Nenhuma divergencia</p>
              <p className="text-slate-500 text-sm">A folha esta em conformidade</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(divergenciasPorTipo).map(([tipo, count]) => {
                const total = Object.values(divergenciasPorTipo).reduce((a, b) => a + b, 0);
                const percentage = (count / total) * 100;

                const colors: Record<string, string> = {
                  'INSS': 'bg-blue-500',
                  'IRRF': 'bg-amber-500',
                  'FGTS': 'bg-teal-500',
                  'Rubrica': 'bg-red-500',
                };

                return (
                  <div key={tipo}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-300">{tipo}</span>
                      <span className="text-sm text-slate-400">{count}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[tipo] || 'bg-slate-500'} rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}