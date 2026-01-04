import { supabase } from './supabase';
import type { Rubrica, Divergencia } from '../types/database';

export interface AuditResult {
  divergencias: Array<Omit<Divergencia, 'id' | 'created_at'>>;
  totalDivergencias: number;
  impactoFinanceiro: number;
  totalRisco: number;
  totalOportunidade: number;
  rubricasAnalisadas: number;
  rubricasComDivergencia: number;
}

export interface AuditDateRange {
  competenciaInicio: string;
  competenciaFim: string;
}

interface FaixaINSS {
  limite: number;
  aliquota: number;
}

interface FaixaIRRF {
  limite: number;
  aliquota: number;
  deducao: number;
}

interface ParametrosSistema {
  salario_minimo: number;
  teto_inss: number;
  aliquota_fgts: number;
  deducao_dependente_irrf: number;
  aliquota_inss_patronal: number;
  aliquota_rat: number;
  aliquota_terceiros: number;
}

interface ParametrosAuditoria {
  parametros: ParametrosSistema;
  faixasINSS: FaixaINSS[];
  faixasIRRF: FaixaIRRF[];
}

interface BaseConhecimentoRubrica {
  natureza_rubrica: string;
  descricao_padrao: string;
  incid_inss_padrao: string;
  incid_irrf_padrao: string;
  incid_fgts_padrao: string;
  fundamentacao_legal: string | null;
}

interface ProcessoJudicial {
  id: string;
  nr_processo: string;
  tp_proc: number;
  ind_suspensao: number | null;
  cod_susp: string | null;
  ini_valid: string | null;
  fim_valid: string | null;
}

interface RubricaProcessoVinculo {
  rubrica_id: string;
  processo_id: string;
  tributo_suspenso: string;
}

type TipoImpacto = 'risco' | 'oportunidade' | 'informativo';
type TributoAfetado = 'INSS_PATRONAL' | 'INSS_SEGURADO' | 'INSS_RAT' | 'FGTS' | 'IRRF' | 'MULTIPLO';

const INSS_FAIXAS_2024: FaixaINSS[] = [
  { limite: 1412.00, aliquota: 7.5 },
  { limite: 2666.68, aliquota: 9.0 },
  { limite: 4000.03, aliquota: 12.0 },
  { limite: 7786.02, aliquota: 14.0 },
];

const IRRF_FAIXAS_2024: FaixaIRRF[] = [
  { limite: 2259.20, aliquota: 0, deducao: 0 },
  { limite: 2826.65, aliquota: 7.5, deducao: 169.44 },
  { limite: 3751.05, aliquota: 15.0, deducao: 381.44 },
  { limite: 4664.68, aliquota: 22.5, deducao: 662.77 },
  { limite: Infinity, aliquota: 27.5, deducao: 896.00 },
];

const DEFAULT_PARAMETROS: ParametrosSistema = {
  salario_minimo: 1412.00,
  teto_inss: 7786.02,
  aliquota_fgts: 8.00,
  deducao_dependente_irrf: 189.59,
  aliquota_inss_patronal: 20.00,
  aliquota_rat: 2.00,
  aliquota_terceiros: 5.80,
};

let parametrosCache: ParametrosAuditoria | null = null;

async function getParametrosVigentes(competencia?: string): Promise<ParametrosAuditoria> {
  if (parametrosCache) {
    return parametrosCache;
  }

  try {
    let ano = new Date().getFullYear();
    let mes = new Date().getMonth() + 1;

    if (competencia) {
      const [anoComp, mesComp] = competencia.split('-').map(Number);
      if (anoComp && mesComp) {
        ano = anoComp;
        mes = mesComp;
      }
    }

    const { data: paramsData, error: paramsError } = await supabase
      .from('parametros_sistema')
      .select('*')
      .is('empresa_id', null)
      .lte('vigencia_ano', ano)
      .order('vigencia_ano', { ascending: false })
      .order('vigencia_mes', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paramsError) throw paramsError;

    if (!paramsData) {
      return {
        parametros: DEFAULT_PARAMETROS,
        faixasINSS: INSS_FAIXAS_2024,
        faixasIRRF: IRRF_FAIXAS_2024,
      };
    }

    const { data: inssData } = await supabase
      .from('faixas_inss')
      .select('*')
      .is('empresa_id', null)
      .eq('vigencia_ano', paramsData.vigencia_ano)
      .eq('vigencia_mes', paramsData.vigencia_mes)
      .order('ordem');

    const { data: irrfData } = await supabase
      .from('faixas_irrf')
      .select('*')
      .is('empresa_id', null)
      .eq('vigencia_ano', paramsData.vigencia_ano)
      .eq('vigencia_mes', paramsData.vigencia_mes)
      .order('ordem');

    const faixasINSS: FaixaINSS[] = (inssData || []).map(f => ({
      limite: f.valor_limite,
      aliquota: f.aliquota,
    }));

    const faixasIRRF: FaixaIRRF[] = (irrfData || []).map(f => ({
      limite: f.valor_limite || Infinity,
      aliquota: f.aliquota,
      deducao: f.valor_deducao,
    }));

    parametrosCache = {
      parametros: {
        salario_minimo: paramsData.salario_minimo,
        teto_inss: paramsData.teto_inss,
        aliquota_fgts: paramsData.aliquota_fgts,
        deducao_dependente_irrf: paramsData.deducao_dependente_irrf,
        aliquota_inss_patronal: 20.00,
        aliquota_rat: 2.00,
        aliquota_terceiros: 5.80,
      },
      faixasINSS: faixasINSS.length > 0 ? faixasINSS : INSS_FAIXAS_2024,
      faixasIRRF: faixasIRRF.length > 0 ? faixasIRRF : IRRF_FAIXAS_2024,
    };

    return parametrosCache;
  } catch (error) {
    console.error('Error loading tax parameters:', error);
    return {
      parametros: DEFAULT_PARAMETROS,
      faixasINSS: INSS_FAIXAS_2024,
      faixasIRRF: IRRF_FAIXAS_2024,
    };
  }
}

async function loadBaseConhecimento(): Promise<Map<string, BaseConhecimentoRubrica>> {
  const { data, error } = await supabase
    .from('base_conhecimento_rubricas')
    .select('*');

  if (error) {
    console.error('Error loading base conhecimento:', error);
    return new Map();
  }

  const map = new Map<string, BaseConhecimentoRubrica>();
  data?.forEach(item => {
    map.set(item.natureza_rubrica, {
      natureza_rubrica: item.natureza_rubrica,
      descricao_padrao: item.descricao_padrao,
      incid_inss_padrao: item.incid_inss_padrao,
      incid_irrf_padrao: item.incid_irrf_padrao,
      incid_fgts_padrao: item.incid_fgts_padrao,
      fundamentacao_legal: item.fundamentacao_legal,
    });
  });

  return map;
}

async function loadProcessosJudiciais(empresaId: string): Promise<ProcessoJudicial[]> {
  const { data, error } = await supabase
    .from('evt_s1070')
    .select('id, nr_processo, tp_proc, ind_suspensao, cod_susp, ini_valid, fim_valid')
    .eq('empresa_id', empresaId);

  if (error) {
    console.error('Error loading processos:', error);
    return [];
  }

  return data || [];
}

async function loadRubricaProcessoVinculos(empresaId: string): Promise<RubricaProcessoVinculo[]> {
  const { data, error } = await supabase
    .from('rubrica_processo_vinculo')
    .select('rubrica_id, processo_id, tributo_suspenso')
    .eq('empresa_id', empresaId);

  if (error) {
    console.error('Error loading vinculos:', error);
    return [];
  }

  return data || [];
}

function incidenciaAtiva(codigo: string): boolean {
  return codigo !== '00' && codigo !== '' && codigo !== null;
}

function determinarTipoImpacto(
  clienteIncide: boolean,
  legalIncide: boolean,
  temProcesso: boolean
): { tipo: TipoImpacto; justificado: boolean } {
  if (clienteIncide === legalIncide) {
    return { tipo: 'informativo', justificado: true };
  }

  if (temProcesso) {
    return { tipo: 'informativo', justificado: true };
  }

  if (clienteIncide && !legalIncide) {
    return { tipo: 'oportunidade', justificado: false };
  }

  return { tipo: 'risco', justificado: false };
}

async function calcularImpactoFinanceiro(
  empresaId: string,
  rubricaCodigo: string,
  tributo: TributoAfetado,
  tipoImpacto: TipoImpacto,
  competenciaInicio: string,
  competenciaFim: string,
  parametros: ParametrosSistema
): Promise<number> {
  const { data: itens, error } = await supabase
    .from('itens_remuneracao')
    .select(`
      id,
      valor,
      natureza,
      remuneracao:remuneracoes!inner(
        id,
        competencia,
        empresa_id
      )
    `)
    .eq('codigo_rubrica', rubricaCodigo)
    .gte('remuneracao.competencia', competenciaInicio)
    .lte('remuneracao.competencia', competenciaFim)
    .eq('remuneracao.empresa_id', empresaId);

  if (error || !itens) {
    console.error('Error calculating impact:', error);
    return 0;
  }

  let totalBase = 0;
  for (const item of itens) {
    if (item.natureza === 'provento') {
      totalBase += item.valor;
    }
  }

  let aliquota = 0;
  switch (tributo) {
    case 'INSS_PATRONAL':
      aliquota = parametros.aliquota_inss_patronal / 100;
      break;
    case 'INSS_SEGURADO':
      aliquota = 0.14;
      break;
    case 'INSS_RAT':
      aliquota = parametros.aliquota_rat / 100;
      break;
    case 'FGTS':
      aliquota = parametros.aliquota_fgts / 100;
      break;
    case 'IRRF':
      aliquota = 0.275;
      break;
    case 'MULTIPLO':
      aliquota = (parametros.aliquota_inss_patronal + parametros.aliquota_fgts) / 100;
      break;
  }

  const impacto = totalBase * aliquota;

  return Math.round(impacto * 100) / 100;
}

export function calcularINSS(salario: number, faixas: FaixaINSS[] = INSS_FAIXAS_2024): number {
  let inss = 0;
  let salarioRestante = salario;
  let faixaAnterior = 0;

  for (const faixa of faixas) {
    if (salarioRestante <= 0) break;

    const baseFaixa = Math.min(salarioRestante, faixa.limite - faixaAnterior);
    inss += baseFaixa * (faixa.aliquota / 100);
    salarioRestante -= baseFaixa;
    faixaAnterior = faixa.limite;
  }

  return Math.round(inss * 100) / 100;
}

export function calcularIRRF(
  salario: number,
  inss: number,
  dependentes: number = 0,
  faixas: FaixaIRRF[] = IRRF_FAIXAS_2024,
  deducaoPorDependente: number = 189.59
): number {
  const baseCalculo = salario - inss - (dependentes * deducaoPorDependente);

  if (baseCalculo <= 0) return 0;

  for (const faixa of faixas) {
    if (baseCalculo <= faixa.limite) {
      const irrf = (baseCalculo * (faixa.aliquota / 100)) - faixa.deducao;
      return Math.max(0, Math.round(irrf * 100) / 100);
    }
  }

  return 0;
}

export function calcularFGTS(salario: number, aliquota: number = 8.0): number {
  return Math.round(salario * (aliquota / 100) * 100) / 100;
}

export async function runAudit(
  empresaId: string,
  dateRange?: AuditDateRange
): Promise<AuditResult> {
  const result: AuditResult = {
    divergencias: [],
    totalDivergencias: 0,
    impactoFinanceiro: 0,
    totalRisco: 0,
    totalOportunidade: 0,
    rubricasAnalisadas: 0,
    rubricasComDivergencia: 0,
  };

  const competenciaInicio = dateRange?.competenciaInicio || getCompetencia60MesesAtras();
  const competenciaFim = dateRange?.competenciaFim || getCompetenciaAtual();

  const [baseConhecimento, processos, vinculos, { parametros }] = await Promise.all([
    loadBaseConhecimento(),
    loadProcessosJudiciais(empresaId),
    loadRubricaProcessoVinculos(empresaId),
    getParametrosVigentes(competenciaFim),
  ]);

  const processosMap = new Map<string, ProcessoJudicial>();
  processos.forEach(p => processosMap.set(p.id, p));

  const rubricaVinculosMap = new Map<string, RubricaProcessoVinculo[]>();
  vinculos.forEach(v => {
    const existing = rubricaVinculosMap.get(v.rubrica_id) || [];
    existing.push(v);
    rubricaVinculosMap.set(v.rubrica_id, existing);
  });

  const { data: rubricas, error: rubricasError } = await supabase
    .from('rubricas')
    .select('*')
    .eq('empresa_id', empresaId);

  if (rubricasError || !rubricas) {
    console.error('Error loading rubricas:', rubricasError);
    return result;
  }

  result.rubricasAnalisadas = rubricas.length;

  const rubricasComDivergencia = new Set<string>();

  for (const rubrica of rubricas) {
    const natureza = rubrica.tipo;

    if (!natureza) continue;

    const padrao = baseConhecimento.get(natureza);

    if (!padrao) {
      continue;
    }

    const vinculosRubrica = rubricaVinculosMap.get(rubrica.id) || [];
    const temProcessoINSS = vinculosRubrica.some(v =>
      v.tributo_suspenso === 'INSS' || v.tributo_suspenso === 'TODOS'
    );
    const temProcessoFGTS = vinculosRubrica.some(v =>
      v.tributo_suspenso === 'FGTS' || v.tributo_suspenso === 'TODOS'
    );
    const temProcessoIRRF = vinculosRubrica.some(v =>
      v.tributo_suspenso === 'IRRF' || v.tributo_suspenso === 'TODOS'
    );

    const clienteINSS = incidenciaAtiva(rubrica.incid_inss);
    const legalINSS = incidenciaAtiva(padrao.incid_inss_padrao);
    const inssAnalise = determinarTipoImpacto(clienteINSS, legalINSS, temProcessoINSS);

    if (!inssAnalise.justificado) {
      const impacto = await calcularImpactoFinanceiro(
        empresaId,
        rubrica.codigo,
        'INSS_PATRONAL',
        inssAnalise.tipo,
        competenciaInicio,
        competenciaFim,
        parametros
      );

      if (impacto > 0) {
        rubricasComDivergencia.add(rubrica.id);

        const divergencia: Omit<Divergencia, 'id' | 'created_at'> = {
          empresa_id: empresaId,
          remuneracao_id: null,
          item_remuneracao_id: null,
          tipo: 'INSS',
          tipo_impacto: inssAnalise.tipo,
          tributo_afetado: 'INSS_PATRONAL',
          natureza_rubrica: natureza,
          descricao: inssAnalise.tipo === 'risco'
            ? `Rubrica ${rubrica.codigo} nao tributa INSS mas deveria. Base legal: ${padrao.fundamentacao_legal || 'Art. 28, Lei 8.212/91'}`
            : `Rubrica ${rubrica.codigo} tributa INSS indevidamente. Possivel credito. Base legal: ${padrao.fundamentacao_legal || 'Art. 28, §9, Lei 8.212/91'}`,
          valor_original: clienteINSS ? impacto : 0,
          valor_recalculado: legalINSS ? impacto : 0,
          diferenca: impacto,
          severidade: impacto > 10000 ? 'high' : impacto > 1000 ? 'medium' : 'low',
          fundamento_legal: padrao.fundamentacao_legal,
          status_analise: 'pendente',
          competencia_inicio: competenciaInicio,
          competencia_fim: competenciaFim,
          processo_vinculado: null,
        };

        result.divergencias.push(divergencia);

        if (inssAnalise.tipo === 'risco') {
          result.totalRisco += impacto;
        } else {
          result.totalOportunidade += impacto;
        }
      }
    }

    const clienteFGTS = incidenciaAtiva(rubrica.incid_fgts);
    const legalFGTS = incidenciaAtiva(padrao.incid_fgts_padrao);
    const fgtsAnalise = determinarTipoImpacto(clienteFGTS, legalFGTS, temProcessoFGTS);

    if (!fgtsAnalise.justificado) {
      const impacto = await calcularImpactoFinanceiro(
        empresaId,
        rubrica.codigo,
        'FGTS',
        fgtsAnalise.tipo,
        competenciaInicio,
        competenciaFim,
        parametros
      );

      if (impacto > 0) {
        rubricasComDivergencia.add(rubrica.id);

        const divergencia: Omit<Divergencia, 'id' | 'created_at'> = {
          empresa_id: empresaId,
          remuneracao_id: null,
          item_remuneracao_id: null,
          tipo: 'FGTS',
          tipo_impacto: fgtsAnalise.tipo,
          tributo_afetado: 'FGTS',
          natureza_rubrica: natureza,
          descricao: fgtsAnalise.tipo === 'risco'
            ? `Rubrica ${rubrica.codigo} nao tributa FGTS mas deveria. Base legal: ${padrao.fundamentacao_legal || 'Art. 15, Lei 8.036/90'}`
            : `Rubrica ${rubrica.codigo} tributa FGTS indevidamente. Possivel credito. Base legal: ${padrao.fundamentacao_legal || 'Art. 28, §9, Lei 8.212/91'}`,
          valor_original: clienteFGTS ? impacto : 0,
          valor_recalculado: legalFGTS ? impacto : 0,
          diferenca: impacto,
          severidade: impacto > 10000 ? 'high' : impacto > 1000 ? 'medium' : 'low',
          fundamento_legal: padrao.fundamentacao_legal,
          status_analise: 'pendente',
          competencia_inicio: competenciaInicio,
          competencia_fim: competenciaFim,
          processo_vinculado: null,
        };

        result.divergencias.push(divergencia);

        if (fgtsAnalise.tipo === 'risco') {
          result.totalRisco += impacto;
        } else {
          result.totalOportunidade += impacto;
        }
      }
    }

    const clienteIRRF = incidenciaAtiva(rubrica.incid_irrf);
    const legalIRRF = incidenciaAtiva(padrao.incid_irrf_padrao);
    const irrfAnalise = determinarTipoImpacto(clienteIRRF, legalIRRF, temProcessoIRRF);

    if (!irrfAnalise.justificado) {
      const impacto = await calcularImpactoFinanceiro(
        empresaId,
        rubrica.codigo,
        'IRRF',
        irrfAnalise.tipo,
        competenciaInicio,
        competenciaFim,
        parametros
      );

      if (impacto > 0) {
        rubricasComDivergencia.add(rubrica.id);

        const divergencia: Omit<Divergencia, 'id' | 'created_at'> = {
          empresa_id: empresaId,
          remuneracao_id: null,
          item_remuneracao_id: null,
          tipo: 'IRRF',
          tipo_impacto: irrfAnalise.tipo,
          tributo_afetado: 'IRRF',
          natureza_rubrica: natureza,
          descricao: irrfAnalise.tipo === 'risco'
            ? `Rubrica ${rubrica.codigo} nao tributa IRRF mas deveria. Base legal: ${padrao.fundamentacao_legal || 'Art. 7, Lei 7.713/88'}`
            : `Rubrica ${rubrica.codigo} tributa IRRF indevidamente. Possivel restituicao. Base legal: ${padrao.fundamentacao_legal || 'Art. 6, Lei 7.713/88'}`,
          valor_original: clienteIRRF ? impacto : 0,
          valor_recalculado: legalIRRF ? impacto : 0,
          diferenca: impacto,
          severidade: impacto > 10000 ? 'high' : impacto > 1000 ? 'medium' : 'low',
          fundamento_legal: padrao.fundamentacao_legal,
          status_analise: 'pendente',
          competencia_inicio: competenciaInicio,
          competencia_fim: competenciaFim,
          processo_vinculado: null,
        };

        result.divergencias.push(divergencia);

        if (irrfAnalise.tipo === 'risco') {
          result.totalRisco += impacto;
        } else {
          result.totalOportunidade += impacto;
        }
      }
    }
  }

  result.rubricasComDivergencia = rubricasComDivergencia.size;

  await supabase
    .from('divergencias')
    .delete()
    .eq('empresa_id', empresaId)
    .gte('competencia_inicio', competenciaInicio)
    .lte('competencia_fim', competenciaFim);

  for (const div of result.divergencias) {
    await supabase.from('divergencias').insert(div);
  }

  result.totalDivergencias = result.divergencias.length;
  result.impactoFinanceiro = result.totalRisco + result.totalOportunidade;

  return result;
}

export async function runAuditLegacy(
  empresaId: string,
  competencia?: string
): Promise<AuditResult> {
  const result: AuditResult = {
    divergencias: [],
    totalDivergencias: 0,
    impactoFinanceiro: 0,
    totalRisco: 0,
    totalOportunidade: 0,
    rubricasAnalisadas: 0,
    rubricasComDivergencia: 0,
  };

  const { parametros, faixasINSS, faixasIRRF } = await getParametrosVigentes(competencia);

  let query = supabase
    .from('remuneracoes')
    .select('*')
    .eq('empresa_id', empresaId);

  if (competencia) {
    query = query.eq('competencia', competencia);
  }

  const { data: remuneracoes } = await query;

  if (!remuneracoes || remuneracoes.length === 0) {
    return result;
  }

  const { data: rubricas } = await supabase
    .from('rubricas')
    .select('*')
    .eq('empresa_id', empresaId);

  const rubricasMap = new Map<string, Rubrica>();
  rubricas?.forEach((r) => rubricasMap.set(r.codigo, r));

  for (const remuneracao of remuneracoes) {
    const { data: itens } = await supabase
      .from('itens_remuneracao')
      .select('*')
      .eq('remuneracao_id', remuneracao.id);

    if (!itens) continue;

    await supabase
      .from('divergencias')
      .delete()
      .eq('remuneracao_id', remuneracao.id);

    let baseInssTributavel = 0;
    let baseIrrfTributavel = 0;
    let baseFgtsTributavel = 0;

    for (const item of itens) {
      const rubrica = rubricasMap.get(item.codigo_rubrica);

      if (!rubrica) {
        const divergencia: Omit<Divergencia, 'id' | 'created_at'> = {
          empresa_id: empresaId,
          remuneracao_id: remuneracao.id,
          item_remuneracao_id: item.id,
          tipo: 'Rubrica',
          tipo_impacto: 'risco',
          tributo_afetado: 'MULTIPLO',
          natureza_rubrica: null,
          descricao: `Rubrica ${item.codigo_rubrica} nao cadastrada na tabela S-1010`,
          valor_original: item.valor,
          valor_recalculado: 0,
          diferenca: item.valor,
          severidade: 'high',
          fundamento_legal: null,
          status_analise: 'pendente',
          competencia_inicio: remuneracao.competencia,
          competencia_fim: remuneracao.competencia,
          processo_vinculado: null,
        };
        result.divergencias.push(divergencia);
        result.totalRisco += item.valor;
        continue;
      }

      if (item.natureza === 'provento') {
        if (rubrica.incid_inss && rubrica.incid_inss !== '00') {
          baseInssTributavel += item.valor;
        }
        if (rubrica.incid_irrf && rubrica.incid_irrf !== '00') {
          baseIrrfTributavel += item.valor;
        }
        if (rubrica.incid_fgts && rubrica.incid_fgts !== '00') {
          baseFgtsTributavel += item.valor;
        }
      }
    }

    const tolerancia = 0.01;

    if (Math.abs(baseInssTributavel - remuneracao.base_inss) > tolerancia * remuneracao.base_inss) {
      const diferenca = baseInssTributavel - remuneracao.base_inss;
      const tipoImpacto: TipoImpacto = diferenca > 0 ? 'risco' : 'oportunidade';

      const divergencia: Omit<Divergencia, 'id' | 'created_at'> = {
        empresa_id: empresaId,
        remuneracao_id: remuneracao.id,
        item_remuneracao_id: null,
        tipo: 'INSS',
        tipo_impacto: tipoImpacto,
        tributo_afetado: 'INSS_SEGURADO',
        natureza_rubrica: null,
        descricao: 'Base de calculo do INSS divergente',
        valor_original: remuneracao.base_inss,
        valor_recalculado: baseInssTributavel,
        diferenca: diferenca,
        severidade: 'medium',
        fundamento_legal: null,
        status_analise: 'pendente',
        competencia_inicio: remuneracao.competencia,
        competencia_fim: remuneracao.competencia,
        processo_vinculado: null,
      };
      result.divergencias.push(divergencia);

      if (tipoImpacto === 'risco') {
        result.totalRisco += Math.abs(diferenca);
      } else {
        result.totalOportunidade += Math.abs(diferenca);
      }
    }

    if (Math.abs(baseIrrfTributavel - remuneracao.base_irrf) > tolerancia * remuneracao.base_irrf) {
      const diferenca = baseIrrfTributavel - remuneracao.base_irrf;
      const tipoImpacto: TipoImpacto = diferenca > 0 ? 'risco' : 'oportunidade';

      const divergencia: Omit<Divergencia, 'id' | 'created_at'> = {
        empresa_id: empresaId,
        remuneracao_id: remuneracao.id,
        item_remuneracao_id: null,
        tipo: 'IRRF',
        tipo_impacto: tipoImpacto,
        tributo_afetado: 'IRRF',
        natureza_rubrica: null,
        descricao: 'Base de calculo do IRRF divergente',
        valor_original: remuneracao.base_irrf,
        valor_recalculado: baseIrrfTributavel,
        diferenca: diferenca,
        severidade: 'medium',
        fundamento_legal: null,
        status_analise: 'pendente',
        competencia_inicio: remuneracao.competencia,
        competencia_fim: remuneracao.competencia,
        processo_vinculado: null,
      };
      result.divergencias.push(divergencia);

      if (tipoImpacto === 'risco') {
        result.totalRisco += Math.abs(diferenca);
      } else {
        result.totalOportunidade += Math.abs(diferenca);
      }
    }

    if (Math.abs(baseFgtsTributavel - remuneracao.base_fgts) > tolerancia * remuneracao.base_fgts) {
      const diferenca = baseFgtsTributavel - remuneracao.base_fgts;
      const tipoImpacto: TipoImpacto = diferenca > 0 ? 'risco' : 'oportunidade';

      const divergencia: Omit<Divergencia, 'id' | 'created_at'> = {
        empresa_id: empresaId,
        remuneracao_id: remuneracao.id,
        item_remuneracao_id: null,
        tipo: 'FGTS',
        tipo_impacto: tipoImpacto,
        tributo_afetado: 'FGTS',
        natureza_rubrica: null,
        descricao: 'Base de calculo do FGTS divergente',
        valor_original: remuneracao.base_fgts,
        valor_recalculado: baseFgtsTributavel,
        diferenca: diferenca,
        severidade: 'medium',
        fundamento_legal: null,
        status_analise: 'pendente',
        competencia_inicio: remuneracao.competencia,
        competencia_fim: remuneracao.competencia,
        processo_vinculado: null,
      };
      result.divergencias.push(divergencia);

      if (tipoImpacto === 'risco') {
        result.totalRisco += Math.abs(diferenca);
      } else {
        result.totalOportunidade += Math.abs(diferenca);
      }
    }
  }

  for (const div of result.divergencias) {
    await supabase.from('divergencias').insert(div);
  }

  result.totalDivergencias = result.divergencias.length;
  result.impactoFinanceiro = result.totalRisco + result.totalOportunidade;

  const competencias = [...new Set(remuneracoes.map((r) => r.competencia))];
  for (const comp of competencias) {
    await updateApuracaoWithDivergencias(empresaId, comp);
  }

  return result;
}

async function updateApuracaoWithDivergencias(empresaId: string, competencia: string) {
  const { data: remuneracoes } = await supabase
    .from('remuneracoes')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('competencia', competencia);

  if (!remuneracoes) return;

  const { data: divergencias } = await supabase
    .from('divergencias')
    .select('id')
    .eq('empresa_id', empresaId)
    .in('remuneracao_id', remuneracoes.map((r) => r.id));

  await supabase
    .from('apuracoes')
    .update({ total_divergencias: divergencias?.length || 0 })
    .eq('empresa_id', empresaId)
    .eq('competencia', competencia);
}

function getCompetenciaAtual(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getCompetencia60MesesAtras(): string {
  const now = new Date();
  now.setMonth(now.getMonth() - 60);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function getAuditSummary(empresaId: string): Promise<{
  totalRisco: number;
  totalOportunidade: number;
  totalDivergencias: number;
  porTributo: Record<string, { risco: number; oportunidade: number; count: number }>;
}> {
  const { data: divergencias, error } = await supabase
    .from('divergencias')
    .select('tipo_impacto, tributo_afetado, diferenca')
    .eq('empresa_id', empresaId);

  if (error || !divergencias) {
    return {
      totalRisco: 0,
      totalOportunidade: 0,
      totalDivergencias: 0,
      porTributo: {},
    };
  }

  let totalRisco = 0;
  let totalOportunidade = 0;
  const porTributo: Record<string, { risco: number; oportunidade: number; count: number }> = {};

  for (const div of divergencias) {
    const tributo = div.tributo_afetado || 'OUTROS';
    const impacto = Math.abs(div.diferenca);

    if (!porTributo[tributo]) {
      porTributo[tributo] = { risco: 0, oportunidade: 0, count: 0 };
    }

    porTributo[tributo].count++;

    if (div.tipo_impacto === 'risco') {
      totalRisco += impacto;
      porTributo[tributo].risco += impacto;
    } else if (div.tipo_impacto === 'oportunidade') {
      totalOportunidade += impacto;
      porTributo[tributo].oportunidade += impacto;
    }
  }

  return {
    totalRisco,
    totalOportunidade,
    totalDivergencias: divergencias.length,
    porTributo,
  };
}
