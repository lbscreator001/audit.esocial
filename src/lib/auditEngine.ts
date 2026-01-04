import { supabase } from './supabase';
import type { Rubrica, Remuneracao, ItemRemuneracao, Divergencia } from '../types/database';

interface AuditResult {
  divergencias: Omit<Divergencia, 'id' | 'created_at'>[];
  totalDivergencias: number;
  impactoFinanceiro: number;
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
}

interface ParametrosAuditoria {
  parametros: ParametrosSistema;
  faixasINSS: FaixaINSS[];
  faixasIRRF: FaixaIRRF[];
}

const INSS_FAIXAS_2024 = [
  { limite: 1412.00, aliquota: 7.5 },
  { limite: 2666.68, aliquota: 9.0 },
  { limite: 4000.03, aliquota: 12.0 },
  { limite: 7786.02, aliquota: 14.0 },
];

const IRRF_FAIXAS_2024 = [
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
      console.warn('Tax parameters not found in database, using defaults');
      return {
        parametros: DEFAULT_PARAMETROS,
        faixasINSS: INSS_FAIXAS_2024,
        faixasIRRF: IRRF_FAIXAS_2024,
      };
    }

    const { data: inssData, error: inssError } = await supabase
      .from('faixas_inss')
      .select('*')
      .is('empresa_id', null)
      .eq('vigencia_ano', paramsData.vigencia_ano)
      .eq('vigencia_mes', paramsData.vigencia_mes)
      .order('ordem');

    if (inssError) throw inssError;

    const { data: irrfData, error: irrfError } = await supabase
      .from('faixas_irrf')
      .select('*')
      .is('empresa_id', null)
      .eq('vigencia_ano', paramsData.vigencia_ano)
      .eq('vigencia_mes', paramsData.vigencia_mes)
      .order('ordem');

    if (irrfError) throw irrfError;

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

export async function runAudit(empresaId: string, competencia?: string): Promise<AuditResult> {
  const result: AuditResult = {
    divergencias: [],
    totalDivergencias: 0,
    impactoFinanceiro: 0,
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
          descricao: `Rubrica ${item.codigo_rubrica} nao cadastrada na tabela S-1010`,
          valor_original: item.valor,
          valor_recalculado: 0,
          diferenca: item.valor,
          severidade: 'high',
        };
        result.divergencias.push(divergencia);
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

    const inssCalculado = calcularINSS(baseInssTributavel, faixasINSS);
    const irrfCalculado = calcularIRRF(baseIrrfTributavel, inssCalculado, 0, faixasIRRF, parametros.deducao_dependente_irrf);
    const fgtsCalculado = calcularFGTS(baseFgtsTributavel, parametros.aliquota_fgts);

    const inssOriginal = itens
      .filter((i) => i.natureza === 'desconto' && i.codigo_rubrica.includes('INSS'))
      .reduce((sum, i) => sum + i.valor, 0);

    const irrfOriginal = itens
      .filter((i) => i.natureza === 'desconto' && (i.codigo_rubrica.includes('IRRF') || i.codigo_rubrica.includes('IR')))
      .reduce((sum, i) => sum + i.valor, 0);

    const tolerancia = 0.01;

    if (Math.abs(baseInssTributavel - remuneracao.base_inss) > tolerancia * remuneracao.base_inss) {
      const divergencia: Omit<Divergencia, 'id' | 'created_at'> = {
        empresa_id: empresaId,
        remuneracao_id: remuneracao.id,
        item_remuneracao_id: null,
        tipo: 'INSS',
        descricao: 'Base de calculo do INSS divergente',
        valor_original: remuneracao.base_inss,
        valor_recalculado: baseInssTributavel,
        diferenca: baseInssTributavel - remuneracao.base_inss,
        severidade: 'medium',
      };
      result.divergencias.push(divergencia);
    }

    if (Math.abs(baseIrrfTributavel - remuneracao.base_irrf) > tolerancia * remuneracao.base_irrf) {
      const divergencia: Omit<Divergencia, 'id' | 'created_at'> = {
        empresa_id: empresaId,
        remuneracao_id: remuneracao.id,
        item_remuneracao_id: null,
        tipo: 'IRRF',
        descricao: 'Base de calculo do IRRF divergente',
        valor_original: remuneracao.base_irrf,
        valor_recalculado: baseIrrfTributavel,
        diferenca: baseIrrfTributavel - remuneracao.base_irrf,
        severidade: 'medium',
      };
      result.divergencias.push(divergencia);
    }

    if (Math.abs(baseFgtsTributavel - remuneracao.base_fgts) > tolerancia * remuneracao.base_fgts) {
      const divergencia: Omit<Divergencia, 'id' | 'created_at'> = {
        empresa_id: empresaId,
        remuneracao_id: remuneracao.id,
        item_remuneracao_id: null,
        tipo: 'FGTS',
        descricao: 'Base de calculo do FGTS divergente',
        valor_original: remuneracao.base_fgts,
        valor_recalculado: baseFgtsTributavel,
        diferenca: baseFgtsTributavel - remuneracao.base_fgts,
        severidade: 'medium',
      };
      result.divergencias.push(divergencia);
    }
  }

  for (const div of result.divergencias) {
    await supabase.from('divergencias').insert(div);
    result.impactoFinanceiro += Math.abs(div.diferenca);
  }

  result.totalDivergencias = result.divergencias.length;

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