import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getAuditSummary } from '../lib/auditEngine';
import { formatCurrency, formatCompetenciaShort } from '../lib/formatters';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  FileText,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Coins
} from 'lucide-react';
import type { Apuracao } from '../types/database';

interface DashboardProps {
  onNavigateToMonth: (competencia: string) => void;
}

interface DashboardStats {
  totalRisco: number;
  totalOportunidade: number;
  totalDivergencias: number;
  porTributo: Record<string, { risco: number; oportunidade: number; count: number }>;
}

export function DashboardPage({ onNavigateToMonth }: DashboardProps) {
  const { empresa } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalRisco: 0,
    totalOportunidade: 0,
    totalDivergencias: 0,
    porTributo: {},
  });
  const [apuracoes, setApuracoes] = useState<Apuracao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (empresa) {
      loadDashboardData();
    }
  }, [empresa]);

  async function loadDashboardData() {
    if (!empresa) return;

    setLoading(true);

    const [auditSummary, apuracoesRes] = await Promise.all([
      getAuditSummary(empresa.id),
      supabase
        .from('apuracoes')
        .select('*')
        .eq('empresa_id', empresa.id)
        .order('competencia', { ascending: false }),
    ]);

    setStats(auditSummary);
    setApuracoes(apuracoesRes.data || []);
    setLoading(false);
  }

  const kpiCards = [
    {
      label: 'Total Risco',
      value: formatCurrency(stats.totalRisco),
      icon: ShieldAlert,
      bgColor: 'bg-red-500/10',
      textColor: 'text-red-400',
      borderColor: 'border-red-500/30',
      description: 'Passivo tributario potencial',
    },
    {
      label: 'Total Oportunidades',
      value: formatCurrency(stats.totalOportunidade),
      icon: Coins,
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
      description: 'Creditos recuperaveis',
    },
    {
      label: 'Total Divergencias',
      value: stats.totalDivergencias.toString(),
      icon: AlertTriangle,
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/30',
      description: 'Itens para revisao',
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
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard de Compliance</h1>
        <p className="text-slate-400">Analise consolidada de riscos e oportunidades tributarias</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`bg-slate-800/50 backdrop-blur-sm border ${card.borderColor} rounded-2xl p-6 transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${card.bgColor} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${card.textColor}`} />
                </div>
                {card.label === 'Total Risco' && stats.totalRisco > 0 && (
                  <TrendingDown className="w-5 h-5 text-red-400" />
                )}
                {card.label === 'Total Oportunidades' && stats.totalOportunidade > 0 && (
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                )}
              </div>
              <p className="text-slate-400 text-sm mb-1">{card.label}</p>
              <p className={`text-2xl font-bold ${card.textColor}`}>{card.value}</p>
              <p className="text-slate-500 text-xs mt-2">{card.description}</p>
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
            <h2 className="text-lg font-semibold text-white">Impacto por Tributo</h2>
            <AlertTriangle className="w-5 h-5 text-slate-500" />
          </div>

          {Object.keys(stats.porTributo).length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-slate-400 mb-2">Nenhuma divergencia</p>
              <p className="text-slate-500 text-sm">A folha esta em conformidade</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(stats.porTributo).map(([tributo, data]) => {
                const tributoLabels: Record<string, string> = {
                  'INSS_PATRONAL': 'INSS Patronal',
                  'INSS_SEGURADO': 'INSS Segurado',
                  'INSS_RAT': 'INSS RAT',
                  'INSS_TERCEIROS': 'INSS Terceiros',
                  'FGTS': 'FGTS',
                  'IRRF': 'IRRF',
                  'CSLL': 'CSLL',
                  'MULTIPLO': 'Multiplo',
                };

                const maxValue = Math.max(
                  ...Object.values(stats.porTributo).map(d => d.risco + d.oportunidade)
                );
                const totalTributo = data.risco + data.oportunidade;
                const riscoPercent = maxValue > 0 ? (data.risco / maxValue) * 100 : 0;
                const opPercent = maxValue > 0 ? (data.oportunidade / maxValue) * 100 : 0;

                return (
                  <div key={tributo}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-300">{tributoLabels[tributo] || tributo}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-500">{data.count} itens</span>
                        {data.risco > 0 && (
                          <span className="text-red-400">{formatCurrency(data.risco)}</span>
                        )}
                        {data.oportunidade > 0 && (
                          <span className="text-emerald-400">{formatCurrency(data.oportunidade)}</span>
                        )}
                      </div>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden flex">
                      {data.risco > 0 && (
                        <div
                          className="h-full bg-red-500 rounded-l-full transition-all"
                          style={{ width: `${riscoPercent}%` }}
                        />
                      )}
                      {data.oportunidade > 0 && (
                        <div
                          className={`h-full bg-emerald-500 transition-all ${data.risco === 0 ? 'rounded-l-full' : ''} rounded-r-full`}
                          style={{ width: `${opPercent}%` }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="pt-4 mt-4 border-t border-slate-700">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-red-500" />
                      <span className="text-slate-400">Risco</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-emerald-500" />
                      <span className="text-slate-400">Oportunidade</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}