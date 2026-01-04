import { useEffect, useState } from 'react';
import { Settings, DollarSign, TrendingUp, Users, AlertCircle, FileText, Receipt, Scale, BookOpen, Search, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatPercentage } from '../lib/formatters';
import { EntendimentoTributacao } from '../types/database';

interface ParametrosSistema {
  id: string;
  salario_minimo: number;
  teto_inss: number;
  aliquota_fgts: number;
  deducao_dependente_irrf: number;
  vigencia_ano: number;
  vigencia_mes: number;
}

interface FaixaINSS {
  id: string;
  ordem: number;
  valor_limite: number;
  aliquota: number;
}

interface FaixaIRRF {
  id: string;
  ordem: number;
  valor_limite: number | null;
  aliquota: number;
  valor_deducao: number;
}

type TabType = 'gerais' | 'inss' | 'irrf' | 'entendimentos';

export default function ParametrosPage() {
  const [activeTab, setActiveTab] = useState<TabType>('gerais');
  const [parametros, setParametros] = useState<ParametrosSistema | null>(null);
  const [faixasINSS, setFaixasINSS] = useState<FaixaINSS[]>([]);
  const [faixasIRRF, setFaixasIRRF] = useState<FaixaIRRF[]>([]);
  const [entendimentos, setEntendimentos] = useState<EntendimentoTributacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterInss, setFilterInss] = useState<boolean | null>(null);
  const [filterIrrf, setFilterIrrf] = useState<boolean | null>(null);
  const [filterFgts, setFilterFgts] = useState<boolean | null>(null);

  useEffect(() => {
    loadParametros();
  }, []);

  useEffect(() => {
    if (activeTab === 'entendimentos') {
      loadEntendimentos();
    }
  }, [activeTab]);

  async function loadParametros() {
    try {
      setLoading(true);
      setError(null);

      const { data: paramsData, error: paramsError } = await supabase
        .from('parametros_sistema')
        .select('*')
        .is('empresa_id', null)
        .order('vigencia_ano', { ascending: false })
        .order('vigencia_mes', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (paramsError) throw paramsError;

      if (paramsData) {
        setParametros(paramsData);

        const { data: inssData, error: inssError } = await supabase
          .from('faixas_inss')
          .select('*')
          .is('empresa_id', null)
          .eq('vigencia_ano', paramsData.vigencia_ano)
          .eq('vigencia_mes', paramsData.vigencia_mes)
          .order('ordem');

        if (inssError) throw inssError;
        setFaixasINSS(inssData || []);

        const { data: irrfData, error: irrfError } = await supabase
          .from('faixas_irrf')
          .select('*')
          .is('empresa_id', null)
          .eq('vigencia_ano', paramsData.vigencia_ano)
          .eq('vigencia_mes', paramsData.vigencia_mes)
          .order('ordem');

        if (irrfError) throw irrfError;
        setFaixasIRRF(irrfData || []);
      }
    } catch (err) {
      console.error('Error loading parameters:', err);
      setError('Erro ao carregar parâmetros tributários');
    } finally {
      setLoading(false);
    }
  }

  async function loadEntendimentos() {
    try {
      const { data, error: entendimentosError } = await supabase
        .from('entendimentos_tributacao')
        .select('*')
        .order('codigo_rubrica');

      if (entendimentosError) throw entendimentosError;
      setEntendimentos(data || []);
    } catch (err) {
      console.error('Error loading entendimentos:', err);
    }
  }

  function getFilteredEntendimentos() {
    return entendimentos.filter((entendimento) => {
      const matchesSearch = searchTerm === '' ||
        entendimento.codigo_rubrica.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entendimento.descricao_rubrica.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesInss = filterInss === null || entendimento.incide_inss === filterInss;
      const matchesIrrf = filterIrrf === null || entendimento.incide_irrf === filterIrrf;
      const matchesFgts = filterFgts === null || entendimento.incide_fgts === filterFgts;

      return matchesSearch && matchesInss && matchesIrrf && matchesFgts;
    });
  }

  function clearFilters() {
    setSearchTerm('');
    setFilterInss(null);
    setFilterIrrf(null);
    setFilterFgts(null);
  }

  function calcularParcelaDeducaoINSS(faixa: FaixaINSS, faixaAnterior?: FaixaINSS): number {
    if (!faixaAnterior) return 0;

    const valorAnterior = faixaAnterior.valor_limite;
    const aliquotaAtual = faixa.aliquota / 100;
    const aliquotaAnterior = faixaAnterior.aliquota / 100;

    return valorAnterior * (aliquotaAtual - aliquotaAnterior);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando parâmetros...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-red-900">Erro ao carregar dados</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!parametros) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-yellow-900">Parâmetros não configurados</h3>
          <p className="text-sm text-yellow-700 mt-1">
            Nenhum parâmetro tributário foi encontrado no sistema.
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'gerais' as TabType, label: 'Parâmetros Gerais', icon: FileText },
    { id: 'inss' as TabType, label: 'Tabela INSS', icon: Receipt },
    { id: 'irrf' as TabType, label: 'Tabela IRRF', icon: Scale },
    { id: 'entendimentos' as TabType, label: 'Entendimento de Tributação', icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Settings className="w-8 h-8 text-blue-600" />
          Parâmetros Tributários e Trabalhistas
        </h1>
        <p className="mt-2 text-gray-600">
          Valores de referência e tabelas tributárias utilizadas nos cálculos de auditoria de folha de pagamento
        </p>
        {parametros && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            <span>Vigente em {parametros.vigencia_ano}</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'gerais' && parametros && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Salário Mínimo</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(parametros.salario_minimo)}</p>
          <p className="text-sm text-gray-500 mt-2">Referência nacional</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Teto INSS</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(parametros.teto_inss)}</p>
          <p className="text-sm text-gray-500 mt-2">Limite máximo de contribuição</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Alíquota FGTS</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatPercentage(parametros.aliquota_fgts)}</p>
          <p className="text-sm text-gray-500 mt-2">Sobre remuneração</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Dedução IRRF</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(parametros.deducao_dependente_irrf)}</p>
          <p className="text-sm text-gray-500 mt-2">Por dependente</p>
        </div>
            </div>
          )}

          {activeTab === 'inss' && (
            <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Tabela Progressiva do INSS</h2>
          <p className="text-blue-100 text-sm mt-1">
            Contribuição calculada por faixas de salário
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Faixa
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Até (Salário)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alíquota
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Parcela a Deduzir
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {faixasINSS.map((faixa, index) => {
                const faixaAnterior = index > 0 ? faixasINSS[index - 1] : undefined;
                const parcelaDeducao = calcularParcelaDeducaoINSS(faixa, faixaAnterior);

                return (
                  <tr key={faixa.id} className={index % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-semibold text-sm">
                        {faixa.ordem}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900">
                      {formatCurrency(faixa.valor_limite)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {formatPercentage(faixa.aliquota)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900">
                      {parcelaDeducao > 0 ? formatCurrency(parcelaDeducao) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-100">
              <tr>
                <td colSpan={4} className="px-6 py-3 text-sm text-gray-600">
                  <strong>Teto Máximo de Contribuição:</strong> {parametros && formatCurrency(parametros.teto_inss)} (aplica-se a alíquota máxima sobre o valor que exceder a última faixa)
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
            </div>
          )}

          {activeTab === 'irrf' && (
            <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Tabela Progressiva do IRRF</h2>
          <p className="text-purple-100 text-sm mt-1">
            Imposto de Renda Retido na Fonte
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Faixa
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Base de Cálculo (Até)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alíquota
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Parcela a Deduzir
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {faixasIRRF.map((faixa, index) => {
                const isIsento = faixa.aliquota === 0;

                return (
                  <tr key={faixa.id} className={index % 2 === 0 ? 'bg-white' : 'bg-purple-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                        isIsento ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {faixa.ordem}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900">
                      {faixa.valor_limite ? formatCurrency(faixa.valor_limite) : 'Acima do limite anterior'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {isIsento ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          ISENTO
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                          {formatPercentage(faixa.aliquota)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900">
                      {faixa.valor_deducao > 0 ? formatCurrency(faixa.valor_deducao) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-100">
              <tr>
                <td colSpan={4} className="px-6 py-3 text-sm text-gray-600">
                  <strong>Observação:</strong> Base de cálculo = Salário bruto - INSS - Dependentes ({parametros && formatCurrency(parametros.deducao_dependente_irrf)} cada) - Pensão alimentícia
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
            </div>
          )}

          {activeTab === 'entendimentos' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  Esta seção contém os entendimentos globais de tributação por rubrica,
                  servindo como referência para comparação com as parametrizações específicas
                  da empresa no evento S1010.
                </p>
              </div>

              {entendimentos.length > 0 && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar por código ou descrição..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Limpar Filtros
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">INSS:</span>
                      <button
                        onClick={() => setFilterInss(filterInss === true ? null : true)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                          filterInss === true
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setFilterInss(filterInss === false ? null : false)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                          filterInss === false
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Não
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">IRRF:</span>
                      <button
                        onClick={() => setFilterIrrf(filterIrrf === true ? null : true)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                          filterIrrf === true
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setFilterIrrf(filterIrrf === false ? null : false)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                          filterIrrf === false
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Não
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">FGTS:</span>
                      <button
                        onClick={() => setFilterFgts(filterFgts === true ? null : true)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                          filterFgts === true
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setFilterFgts(filterFgts === false ? null : false)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                          filterFgts === false
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Não
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {entendimentos.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum entendimento cadastrado
                  </h3>
                  <p className="text-gray-600">
                    Os entendimentos de tributação serão carregados via importação de Excel.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Código
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Descrição
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            INSS
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            IRRF
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            FGTS
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Observações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getFilteredEntendimentos().map((entendimento, index) => (
                          <tr key={entendimento.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-mono text-sm font-medium text-gray-900">
                                {entendimento.codigo_rubrica}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{entendimento.descricao_rubrica}</div>
                              {entendimento.fundamento_legal && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {entendimento.fundamento_legal}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                entendimento.incide_inss
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {entendimento.incide_inss ? 'Sim' : 'Não'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                entendimento.incide_irrf
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {entendimento.incide_irrf ? 'Sim' : 'Não'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                entendimento.incide_fgts
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {entendimento.incide_fgts ? 'Sim' : 'Não'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-600 max-w-xs truncate">
                                {entendimento.observacoes || '-'}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        Exibindo <span className="font-semibold">{getFilteredEntendimentos().length}</span> de <span className="font-semibold">{entendimentos.length}</span> entendimentos
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
