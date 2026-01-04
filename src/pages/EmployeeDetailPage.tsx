import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatCompetencia, formatCPF } from '../lib/formatters';
import {
  User,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Download,
  Info
} from 'lucide-react';
import type { Remuneracao, Colaborador, ItemRemuneracao, Divergencia, Rubrica } from '../types/database';

interface EmployeeDetailProps {
  colaboradorId: string;
  competencia: string;
}

interface ItemRemuneracaoComRubrica extends ItemRemuneracao {
  rubrica?: Rubrica | null;
  divergencia?: Divergencia | null;
}

export function EmployeeDetailPage({ colaboradorId, competencia }: EmployeeDetailProps) {
  const { empresa } = useAuth();
  const [colaborador, setColaborador] = useState<Colaborador | null>(null);
  const [remuneracao, setRemuneracao] = useState<Remuneracao | null>(null);
  const [itens, setItens] = useState<ItemRemuneracaoComRubrica[]>([]);
  const [divergencias, setDivergencias] = useState<Divergencia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (empresa && colaboradorId && competencia) {
      loadData();
    }
  }, [empresa, colaboradorId, competencia]);

  async function loadData() {
    if (!empresa) return;

    setLoading(true);

    const { data: colaboradorData } = await supabase
      .from('colaboradores')
      .select('*')
      .eq('id', colaboradorId)
      .single();

    if (colaboradorData) {
      setColaborador(colaboradorData);
    }

    const { data: remuneracaoData } = await supabase
      .from('remuneracoes')
      .select('*')
      .eq('colaborador_id', colaboradorId)
      .eq('competencia', competencia)
      .maybeSingle();

    if (remuneracaoData) {
      setRemuneracao(remuneracaoData);

      const { data: itensData } = await supabase
        .from('itens_remuneracao')
        .select(`
          *,
          rubrica:rubricas(*)
        `)
        .eq('remuneracao_id', remuneracaoData.id);

      const { data: divergenciasData } = await supabase
        .from('divergencias')
        .select('*')
        .eq('remuneracao_id', remuneracaoData.id);

      setDivergencias(divergenciasData || []);

      if (itensData) {
        const divergenciasPorItem: Record<string, Divergencia> = {};
        divergenciasData?.forEach((d) => {
          if (d.item_remuneracao_id) {
            divergenciasPorItem[d.item_remuneracao_id] = d;
          }
        });

        const itensComDados = itensData.map((item) => ({
          ...item,
          rubrica: item.rubrica as Rubrica | null,
          divergencia: divergenciasPorItem[item.id] || null,
        }));

        setItens(itensComDados);
      }
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!colaborador || !remuneracao) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Dados nao encontrados</p>
      </div>
    );
  }

  const proventos = itens.filter((i) => i.natureza === 'provento');
  const descontos = itens.filter((i) => i.natureza === 'desconto');
  const totalProventos = proventos.reduce((sum, i) => sum + i.valor, 0);
  const totalDescontos = descontos.reduce((sum, i) => sum + i.valor, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center">
            <User className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{colaborador.nome}</h1>
            <p className="text-slate-400">CPF: {formatCPF(colaborador.cpf)}</p>
            {colaborador.matricula && (
              <p className="text-slate-500 text-sm">Matricula: {colaborador.matricula}</p>
            )}
          </div>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors">
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <p className="text-slate-400 text-sm mb-2">Competencia</p>
        <p className="text-lg font-semibold text-white">{formatCompetencia(competencia)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm mb-1">Salario Bruto</p>
          <p className="text-xl font-bold text-white">{formatCurrency(remuneracao.valor_bruto)}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm mb-1">Total Descontos</p>
          <p className="text-xl font-bold text-red-400">{formatCurrency(remuneracao.valor_descontos)}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm mb-1">Salario Liquido</p>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(remuneracao.valor_liquido)}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm mb-1">Divergencias</p>
          <div className={`text-xl font-bold ${divergencias.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {divergencias.length > 0 ? (
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {divergencias.length}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                OK
              </span>
            )}
          </div>
        </div>
      </div>

      {divergencias.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <h2 className="text-lg font-semibold text-amber-400">Divergencias Identificadas</h2>
          </div>
          <div className="space-y-3">
            {divergencias.map((div) => (
              <div
                key={div.id}
                className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-block px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded mb-2">
                      {div.tipo}
                    </span>
                    <p className="text-white">{div.descricao}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-sm">Diferenca</p>
                    <p className={`font-bold ${div.diferenca > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {div.diferenca > 0 ? '+' : ''}{formatCurrency(div.diferenca)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-700/50 flex gap-6 text-sm">
                  <div>
                    <span className="text-slate-500">Original:</span>
                    <span className="text-slate-300 ml-2">{formatCurrency(div.valor_original)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Recalculado:</span>
                    <span className="text-emerald-400 ml-2">{formatCurrency(div.valor_recalculado)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h2 className="font-semibold text-white">Proventos</h2>
            </div>
            <span className="text-emerald-400 font-semibold">{formatCurrency(totalProventos)}</span>
          </div>
          <div className="divide-y divide-slate-700/50">
            {proventos.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                Nenhum provento registrado
              </div>
            ) : (
              proventos.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 ${item.divergencia ? 'bg-amber-500/5' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-slate-500 font-mono">{item.codigo_rubrica}</span>
                        {item.divergencia && (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                      <p className="text-white">
                        {item.rubrica?.descricao || item.descricao || 'Rubrica nao identificada'}
                      </p>
                      {item.referencia > 0 && (
                        <p className="text-slate-500 text-sm">Ref: {item.referencia}</p>
                      )}
                    </div>
                    <span className="text-emerald-400 font-medium whitespace-nowrap">
                      {formatCurrency(item.valor)}
                    </span>
                  </div>
                  {!item.rubrica && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-400">
                      <Info className="w-3 h-3" />
                      Rubrica nao cadastrada no S-1010
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-400" />
              <h2 className="font-semibold text-white">Descontos</h2>
            </div>
            <span className="text-red-400 font-semibold">{formatCurrency(totalDescontos)}</span>
          </div>
          <div className="divide-y divide-slate-700/50">
            {descontos.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                Nenhum desconto registrado
              </div>
            ) : (
              descontos.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 ${item.divergencia ? 'bg-amber-500/5' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-slate-500 font-mono">{item.codigo_rubrica}</span>
                        {item.divergencia && (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                      <p className="text-white">
                        {item.rubrica?.descricao || item.descricao || 'Rubrica nao identificada'}
                      </p>
                      {item.referencia > 0 && (
                        <p className="text-slate-500 text-sm">Ref: {item.referencia}</p>
                      )}
                    </div>
                    <span className="text-red-400 font-medium whitespace-nowrap">
                      -{formatCurrency(item.valor)}
                    </span>
                  </div>
                  {!item.rubrica && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-400">
                      <Info className="w-3 h-3" />
                      Rubrica nao cadastrada no S-1010
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Bases de Calculo</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-slate-400 text-sm mb-1">Base INSS</p>
            <p className="text-xl font-bold text-white">{formatCurrency(remuneracao.base_inss)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm mb-1">Base IRRF</p>
            <p className="text-xl font-bold text-white">{formatCurrency(remuneracao.base_irrf)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm mb-1">Base FGTS</p>
            <p className="text-xl font-bold text-white">{formatCurrency(remuneracao.base_fgts)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}