export interface ParsedRubrica {
  codigo: string;
  descricao: string;
  natureza: string;
  tipo: string;
  incidInss: string;
  incidIrrf: string;
  incidFgts: string;
}

export interface ParsedColaborador {
  cpf: string;
  nome: string;
  matricula: string;
}

export interface ParsedItemRemuneracao {
  codigoRubrica: string;
  descricao: string;
  natureza: string;
  naturezaRubrica: string;
  referencia: number;
  valor: number;
}

export interface ParsedRemuneracao {
  colaborador: ParsedColaborador;
  competencia: string;
  itens: ParsedItemRemuneracao[];
}

export interface ParsedEmpregador {
  tpInsc: number;
  nrInsc: string;
  iniValid: string;
  fimValid: string;
  nmRazao: string;
  classTrib: string;
  indCoop: number;
  indConstr: number;
  indDesoneracao: boolean;
  indOptRegEletron: number;
  natJurid: string;
  multTabRubricas: string;
  infoComplementares: Record<string, string>;
}

export interface ParsedEstabelecimento {
  tpInsc: number;
  nrInsc: string;
  iniValid: string;
  fimValid: string;
  cnaePrep: string;
  aliqRat: number;
  fap: number;
  aliqRatAjust: number;
  fpas: string;
  codTercs: string;
  codTercsSusp: string;
  infoPcd: {
    contPcd: number;
    contApr: number;
  } | null;
}

export interface ParsedProcesso {
  idEvento: string;
  tpProc: number;
  nrProc: string;
  iniValid: string;
  fimValid: string;
  indSusp: number;
  codSusp: string;
  indDecisao: string;
  tpInscEstab: number;
  nrInscEstab: string;
  ufVara: string;
  tpVara: number;
  extDecisao: string;
  obsProc: string;
  dadosProcJud: {
    ufVara: string;
    codMunic: string;
    idVara: string;
  } | null;
  infoSusp: Array<{
    codSusp: string;
    indSusp: number;
    dtDecisao: string;
    indDeposito: number;
  }>;
}

function getTextContent(element: Element, tagName: string): string {
  const el = element.getElementsByTagName(tagName)[0];
  return el?.textContent?.trim() || '';
}

function getNumberContent(element: Element, tagName: string): number {
  const text = getTextContent(element, tagName);
  return parseFloat(text) || 0;
}

function getBooleanContent(element: Element, tagName: string): boolean {
  const text = getTextContent(element, tagName);
  return text === 'S' || text === '1' || text === 'true';
}

function getNaturezaDescricao(codigo: string): string {
  const naturezas: Record<string, string> = {
    '1': 'provento',
    '2': 'desconto',
    '3': 'informativo',
    '4': 'informativo_dedutora',
  };
  return naturezas[codigo] || 'provento';
}

function validateXml(doc: Document): void {
  const parseError = doc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    throw new Error('Erro ao processar XML: formato invalido');
  }
}

export function parseS1000(xmlContent: string): ParsedEmpregador | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');
  validateXml(doc);

  const evtInfoEmpregador = doc.getElementsByTagName('evtInfoEmpregador')[0];
  if (!evtInfoEmpregador) {
    const retornoEvento = doc.getElementsByTagName('eSocial')[0];
    if (!retornoEvento) return null;
  }

  const ideEmpregador = doc.getElementsByTagName('ideEmpregador')[0];
  const infoEmpregador = doc.getElementsByTagName('infoEmpregador')[0];
  const dadosEmpregador = doc.getElementsByTagName('dadosEmpregador')[0] ||
                          doc.getElementsByTagName('infoCadastro')[0];

  if (!ideEmpregador && !dadosEmpregador) return null;

  const inclusao = doc.getElementsByTagName('inclusao')[0];
  const alteracao = doc.getElementsByTagName('alteracao')[0];
  const novaValidade = alteracao?.getElementsByTagName('novaValidade')[0];
  const idePeriodo = doc.getElementsByTagName('idePeriodo')[0];

  let iniValid = '';
  let fimValid = '';

  if (novaValidade) {
    iniValid = getTextContent(novaValidade, 'iniValid');
    fimValid = getTextContent(novaValidade, 'fimValid');
  } else if (idePeriodo) {
    iniValid = getTextContent(idePeriodo, 'iniValid');
    fimValid = getTextContent(idePeriodo, 'fimValid');
  } else if (inclusao) {
    const idePeriodoIncl = inclusao.getElementsByTagName('idePeriodo')[0];
    if (idePeriodoIncl) {
      iniValid = getTextContent(idePeriodoIncl, 'iniValid');
      fimValid = getTextContent(idePeriodoIncl, 'fimValid');
    }
  }

  const infoCadastro = dadosEmpregador || doc.getElementsByTagName('infoCadastro')[0];

  const empregador: ParsedEmpregador = {
    tpInsc: getNumberContent(ideEmpregador || doc, 'tpInsc') || 1,
    nrInsc: getTextContent(ideEmpregador || doc, 'nrInsc'),
    iniValid,
    fimValid,
    nmRazao: getTextContent(infoCadastro || doc, 'nmRazao'),
    classTrib: getTextContent(infoCadastro || doc, 'classTrib'),
    indCoop: getNumberContent(infoCadastro || doc, 'indCoop'),
    indConstr: getNumberContent(infoCadastro || doc, 'indConstr'),
    indDesoneracao: getBooleanContent(infoCadastro || doc, 'indDesoneracao'),
    indOptRegEletron: getNumberContent(infoCadastro || doc, 'indOptRegEletron'),
    natJurid: getTextContent(infoCadastro || doc, 'natJurid'),
    multTabRubricas: getTextContent(infoCadastro || doc, 'multTabRubricas'),
    infoComplementares: {},
  };

  const infoCompl = doc.getElementsByTagName('infoCompl')[0];
  if (infoCompl) {
    const situacaoPJ = infoCompl.getElementsByTagName('situacaoPJ')[0];
    if (situacaoPJ) {
      empregador.infoComplementares['indSitPJ'] = getTextContent(situacaoPJ, 'indSitPJ');
    }
  }

  return empregador;
}

export function parseS1005(xmlContent: string): ParsedEstabelecimento[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');
  validateXml(doc);

  const estabelecimentos: ParsedEstabelecimento[] = [];

  const infoEstabElements = doc.getElementsByTagName('infoEstab');

  if (infoEstabElements.length === 0) {
    const ideEstab = doc.getElementsByTagName('ideEstab')[0];
    const dadosEstab = doc.getElementsByTagName('dadosEstab')[0];

    if (ideEstab || dadosEstab) {
      const estab = extractEstabelecimento(doc, ideEstab, dadosEstab);
      if (estab) estabelecimentos.push(estab);
    }
  } else {
    for (let i = 0; i < infoEstabElements.length; i++) {
      const infoEstab = infoEstabElements[i];
      const ideEstab = infoEstab.getElementsByTagName('ideEstab')[0];
      const dadosEstab = infoEstab.getElementsByTagName('dadosEstab')[0];

      const estab = extractEstabelecimento(infoEstab, ideEstab, dadosEstab);
      if (estab) estabelecimentos.push(estab);
    }
  }

  if (estabelecimentos.length === 0) {
    const inclusao = doc.getElementsByTagName('inclusao')[0] ||
                     doc.getElementsByTagName('alteracao')[0];
    if (inclusao) {
      const ideEstab = inclusao.getElementsByTagName('ideEstab')[0];
      const dadosEstab = inclusao.getElementsByTagName('dadosEstab')[0];
      const estab = extractEstabelecimento(inclusao, ideEstab, dadosEstab);
      if (estab) estabelecimentos.push(estab);
    }
  }

  return estabelecimentos;
}

function extractEstabelecimento(
  context: Element | Document,
  ideEstab: Element | undefined,
  dadosEstab: Element | undefined
): ParsedEstabelecimento | null {
  const idePeriodo = context.getElementsByTagName('idePeriodo')[0];
  const novaValidade = context.getElementsByTagName('novaValidade')[0];
  const aliqGilrat = dadosEstab?.getElementsByTagName('aliqGilrat')[0];
  const infoCaepf = dadosEstab?.getElementsByTagName('infoCaepf')[0];
  const infoObra = dadosEstab?.getElementsByTagName('infoObra')[0];
  const infoTrab = dadosEstab?.getElementsByTagName('infoTrab')[0];
  const infoPcd = infoTrab?.getElementsByTagName('infoPCD')[0];

  let iniValid = '';
  let fimValid = '';

  if (novaValidade) {
    iniValid = getTextContent(novaValidade, 'iniValid');
    fimValid = getTextContent(novaValidade, 'fimValid');
  } else if (idePeriodo) {
    iniValid = getTextContent(idePeriodo, 'iniValid');
    fimValid = getTextContent(idePeriodo, 'fimValid');
  }

  const aliqRat = aliqGilrat
    ? getNumberContent(aliqGilrat, 'aliqRat')
    : getNumberContent(dadosEstab || context, 'aliqRat');

  const fap = aliqGilrat
    ? getNumberContent(aliqGilrat, 'fap')
    : getNumberContent(dadosEstab || context, 'fap');

  const estabelecimento: ParsedEstabelecimento = {
    tpInsc: getNumberContent(ideEstab || context, 'tpInsc') || 1,
    nrInsc: getTextContent(ideEstab || context, 'nrInsc'),
    iniValid,
    fimValid,
    cnaePrep: getTextContent(dadosEstab || context, 'cnaePrep'),
    aliqRat: aliqRat || 2,
    fap: fap || 1,
    aliqRatAjust: (aliqRat || 2) * (fap || 1),
    fpas: getTextContent(dadosEstab || context, 'fpas') ||
          getTextContent(aliqGilrat || context, 'fpas'),
    codTercs: getTextContent(dadosEstab || context, 'codTercs'),
    codTercsSusp: getTextContent(dadosEstab || context, 'codTercsSusp'),
    infoPcd: infoPcd ? {
      contPcd: getNumberContent(infoPcd, 'contPCD') || getNumberContent(infoPcd, 'qtdPCD'),
      contApr: getNumberContent(infoPcd, 'contApr') || getNumberContent(infoPcd, 'qtdApr'),
    } : null,
  };

  if (!estabelecimento.nrInsc) return null;

  return estabelecimento;
}

export function parseS1070(xmlContent: string): ParsedProcesso[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');
  validateXml(doc);

  const processos: ParsedProcesso[] = [];

  const evtTabProcesso = doc.getElementsByTagName('evtTabProcesso')[0];
  const ideEvento = doc.getElementsByTagName('ideEvento')[0];
  const idEvento = evtTabProcesso?.getAttribute('Id') ||
                   getTextContent(ideEvento || doc, 'Id') || '';

  const infoProcessoElements = doc.getElementsByTagName('infoProcesso');

  if (infoProcessoElements.length === 0) {
    const processo = extractProcessoFromDoc(doc, idEvento);
    if (processo) processos.push(processo);
  } else {
    for (let i = 0; i < infoProcessoElements.length; i++) {
      const infoProcesso = infoProcessoElements[i];
      const processo = extractProcesso(infoProcesso, idEvento);
      if (processo) processos.push(processo);
    }
  }

  if (processos.length === 0) {
    const inclusao = doc.getElementsByTagName('inclusao')[0];
    const alteracao = doc.getElementsByTagName('alteracao')[0];
    const target = inclusao || alteracao;

    if (target) {
      const processo = extractProcessoFromContext(target, idEvento);
      if (processo) processos.push(processo);
    }
  }

  return processos;
}

function extractProcessoFromDoc(doc: Document, idEvento: string): ParsedProcesso | null {
  const ideProcesso = doc.getElementsByTagName('ideProcesso')[0];
  const dadosProc = doc.getElementsByTagName('dadosProc')[0] ||
                    doc.getElementsByTagName('dadosProcJud')[0];

  if (!ideProcesso) return null;

  return extractProcessoData(doc, ideProcesso, dadosProc, idEvento);
}

function extractProcesso(infoProcesso: Element, idEvento: string): ParsedProcesso | null {
  const ideProcesso = infoProcesso.getElementsByTagName('ideProcesso')[0];
  const dadosProc = infoProcesso.getElementsByTagName('dadosProc')[0] ||
                    infoProcesso.getElementsByTagName('dadosProcJud')[0];

  if (!ideProcesso) return null;

  return extractProcessoData(infoProcesso, ideProcesso, dadosProc, idEvento);
}

function extractProcessoFromContext(context: Element, idEvento: string): ParsedProcesso | null {
  const ideProcesso = context.getElementsByTagName('ideProcesso')[0];
  const dadosProc = context.getElementsByTagName('dadosProc')[0] ||
                    context.getElementsByTagName('dadosProcJud')[0];

  if (!ideProcesso) return null;

  return extractProcessoData(context, ideProcesso, dadosProc, idEvento);
}

function extractProcessoData(
  context: Element | Document,
  ideProcesso: Element,
  dadosProc: Element | undefined,
  idEvento: string
): ParsedProcesso {
  const idePeriodo = context.getElementsByTagName('idePeriodo')[0];
  const novaValidade = context.getElementsByTagName('novaValidade')[0];
  const dadosProcJud = dadosProc?.getElementsByTagName('dadosProcJud')[0] ||
                       context.getElementsByTagName('dadosProcJud')[0];

  let iniValid = '';
  let fimValid = '';

  if (novaValidade) {
    iniValid = getTextContent(novaValidade, 'iniValid');
    fimValid = getTextContent(novaValidade, 'fimValid');
  } else if (idePeriodo) {
    iniValid = getTextContent(idePeriodo, 'iniValid');
    fimValid = getTextContent(idePeriodo, 'fimValid');
  }

  const infoSuspElements = context.getElementsByTagName('infoSusp');
  const infoSusp: ParsedProcesso['infoSusp'] = [];

  for (let i = 0; i < infoSuspElements.length; i++) {
    const susp = infoSuspElements[i];
    infoSusp.push({
      codSusp: getTextContent(susp, 'codSusp'),
      indSusp: getNumberContent(susp, 'indSusp'),
      dtDecisao: getTextContent(susp, 'dtDecisao'),
      indDeposito: getNumberContent(susp, 'indDeposito'),
    });
  }

  let indSusp = 0;
  let codSusp = '';

  if (infoSusp.length > 0) {
    indSusp = infoSusp[0].indSusp;
    codSusp = infoSusp[0].codSusp;
  } else {
    indSusp = getNumberContent(dadosProc || context, 'indSusp');
    codSusp = getTextContent(dadosProc || context, 'codSusp');
  }

  return {
    idEvento,
    tpProc: getNumberContent(ideProcesso, 'tpProc'),
    nrProc: getTextContent(ideProcesso, 'nrProc'),
    iniValid,
    fimValid,
    indSusp,
    codSusp,
    indDecisao: getTextContent(dadosProc || context, 'indDecisao'),
    tpInscEstab: getNumberContent(dadosProc || context, 'tpInsc'),
    nrInscEstab: getTextContent(dadosProc || context, 'nrInsc'),
    ufVara: dadosProcJud ? getTextContent(dadosProcJud, 'ufVara') : '',
    tpVara: dadosProcJud ? getNumberContent(dadosProcJud, 'tpVara') : 0,
    extDecisao: getTextContent(dadosProc || context, 'extDecisao'),
    obsProc: getTextContent(dadosProc || context, 'obsProc'),
    dadosProcJud: dadosProcJud ? {
      ufVara: getTextContent(dadosProcJud, 'ufVara'),
      codMunic: getTextContent(dadosProcJud, 'codMunic'),
      idVara: getTextContent(dadosProcJud, 'idVara'),
    } : null,
    infoSusp,
  };
}

export function parseS1010(xmlContent: string): ParsedRubrica[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');
  validateXml(doc);

  const rubricas: ParsedRubrica[] = [];

  const ideRubricaElements = doc.getElementsByTagName('ideRubrica');
  const dadosRubricaElements = doc.getElementsByTagName('dadosRubrica');

  if (ideRubricaElements.length === 0) {
    const infoRubricaElements = doc.getElementsByTagName('infoRubrica');
    for (let i = 0; i < infoRubricaElements.length; i++) {
      const infoRubrica = infoRubricaElements[i];

      const ideRubrica = infoRubrica.getElementsByTagName('ideRubrica')[0];
      const dadosRubrica = infoRubrica.getElementsByTagName('dadosRubrica')[0];

      if (ideRubrica && dadosRubrica) {
        const codigo = getTextContent(ideRubrica, 'codRubr');
        const descricao = getTextContent(dadosRubrica, 'dscRubr');
        const natRubr = getTextContent(dadosRubrica, 'natRubr');
        const tpRubr = getTextContent(dadosRubrica, 'tpRubr');

        const codIncCP = getTextContent(dadosRubrica, 'codIncCP');
        const codIncIRRF = getTextContent(dadosRubrica, 'codIncIRRF');
        const codIncFGTS = getTextContent(dadosRubrica, 'codIncFGTS');

        rubricas.push({
          codigo,
          descricao,
          natureza: getNaturezaDescricao(tpRubr),
          tipo: natRubr,
          incidInss: codIncCP || '00',
          incidIrrf: codIncIRRF || '00',
          incidFgts: codIncFGTS || '00',
        });
      }
    }
  } else {
    for (let i = 0; i < ideRubricaElements.length; i++) {
      const ideRubrica = ideRubricaElements[i];
      const dadosRubrica = dadosRubricaElements[i];

      const codigo = getTextContent(ideRubrica, 'codRubr');
      const descricao = dadosRubrica ? getTextContent(dadosRubrica, 'dscRubr') : '';
      const natRubr = dadosRubrica ? getTextContent(dadosRubrica, 'natRubr') : '';
      const tpRubr = dadosRubrica ? getTextContent(dadosRubrica, 'tpRubr') : '1';

      const codIncCP = dadosRubrica ? getTextContent(dadosRubrica, 'codIncCP') : '00';
      const codIncIRRF = dadosRubrica ? getTextContent(dadosRubrica, 'codIncIRRF') : '00';
      const codIncFGTS = dadosRubrica ? getTextContent(dadosRubrica, 'codIncFGTS') : '00';

      if (codigo) {
        rubricas.push({
          codigo,
          descricao,
          natureza: getNaturezaDescricao(tpRubr),
          tipo: natRubr,
          incidInss: codIncCP,
          incidIrrf: codIncIRRF,
          incidFgts: codIncFGTS,
        });
      }
    }
  }

  return rubricas;
}

export function parseS1200(xmlContent: string): ParsedRemuneracao[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');
  validateXml(doc);

  const remuneracoes: ParsedRemuneracao[] = [];

  let competencia = '';
  const ideEventoElements = doc.getElementsByTagName('ideEvento');
  if (ideEventoElements.length > 0) {
    const perApur = getTextContent(ideEventoElements[0], 'perApur');
    competencia = perApur;
  }

  if (!competencia) {
    const evtRemunElements = doc.getElementsByTagName('evtRemun');
    if (evtRemunElements.length > 0) {
      const ideEvento = evtRemunElements[0].getElementsByTagName('ideEvento')[0];
      if (ideEvento) {
        competencia = getTextContent(ideEvento, 'perApur');
      }
    }
  }

  const dmDevElements = doc.getElementsByTagName('dmDev');

  for (let i = 0; i < dmDevElements.length; i++) {
    const dmDev = dmDevElements[i];

    const colaborador: ParsedColaborador = {
      cpf: '',
      nome: '',
      matricula: '',
    };

    const parent = dmDev.parentElement;
    if (parent) {
      const ideTrabalhador = parent.getElementsByTagName('ideTrabalhador')[0];
      if (ideTrabalhador) {
        colaborador.cpf = getTextContent(ideTrabalhador, 'cpfTrab');
        colaborador.nome = getTextContent(ideTrabalhador, 'nmTrab') ||
                          getTextContent(ideTrabalhador, 'nome') ||
                          'Colaborador';
      }

      const infoPerApur = parent.getElementsByTagName('infoPerApur')[0];
      if (infoPerApur) {
        const ideEstabLot = infoPerApur.getElementsByTagName('ideEstabLot')[0];
        if (ideEstabLot) {
          colaborador.matricula = getTextContent(dmDev, 'ideDmDev') || '';
        }
      }
    }

    if (!colaborador.cpf) {
      const trabalhadorElements = doc.getElementsByTagName('ideTrabalhador');
      if (trabalhadorElements.length > 0) {
        colaborador.cpf = getTextContent(trabalhadorElements[0], 'cpfTrab');
        colaborador.nome = getTextContent(trabalhadorElements[0], 'nmTrab') ||
                          getTextContent(trabalhadorElements[0], 'nome') ||
                          'Colaborador';
      }
    }

    const itens: ParsedItemRemuneracao[] = [];
    const detVerbasElements = dmDev.getElementsByTagName('detVerbas');

    for (let j = 0; j < detVerbasElements.length; j++) {
      const detVerbas = detVerbasElements[j];

      const ideRubrica = detVerbas.getElementsByTagName('ideRubrica')[0];
      if (ideRubrica) {
        const codigoRubrica = getTextContent(ideRubrica, 'codRubr');
        const natRubr = getTextContent(ideRubrica, 'natRubr');
        const tpRubr = getTextContent(ideRubrica, 'tpRubr');

        const qtdRubr = getTextContent(detVerbas, 'qtdRubr');
        const vrRubr = getTextContent(detVerbas, 'vrRubr');

        itens.push({
          codigoRubrica,
          descricao: '',
          natureza: getNaturezaDescricao(tpRubr),
          naturezaRubrica: natRubr,
          referencia: parseFloat(qtdRubr) || 0,
          valor: parseFloat(vrRubr) || 0,
        });
      }
    }

    if (!colaborador.matricula) {
      colaborador.matricula = getTextContent(dmDev, 'ideDmDev');
    }

    if (itens.length > 0 && colaborador.cpf) {
      remuneracoes.push({
        colaborador,
        competencia,
        itens,
      });
    }
  }

  if (remuneracoes.length === 0) {
    const infoPerApurElements = doc.getElementsByTagName('infoPerApur');

    for (let i = 0; i < infoPerApurElements.length; i++) {
      const infoPerApur = infoPerApurElements[i];

      const colaborador: ParsedColaborador = {
        cpf: '',
        nome: '',
        matricula: '',
      };

      const trabalhadorElements = doc.getElementsByTagName('ideTrabalhador');
      if (trabalhadorElements.length > 0) {
        colaborador.cpf = getTextContent(trabalhadorElements[0], 'cpfTrab');
        colaborador.nome = getTextContent(trabalhadorElements[0], 'nmTrab') || 'Colaborador';
      }

      const itens: ParsedItemRemuneracao[] = [];
      const detVerbasElements = infoPerApur.getElementsByTagName('detVerbas');

      for (let j = 0; j < detVerbasElements.length; j++) {
        const detVerbas = detVerbasElements[j];

        const codigoRubrica = getTextContent(detVerbas, 'codRubr');
        const tpRubr = getTextContent(detVerbas, 'tpRubr');
        const natRubr = getTextContent(detVerbas, 'natRubr');
        const qtdRubr = getTextContent(detVerbas, 'qtdRubr');
        const vrRubr = getTextContent(detVerbas, 'vrRubr');

        if (codigoRubrica) {
          itens.push({
            codigoRubrica,
            descricao: '',
            natureza: getNaturezaDescricao(tpRubr),
            naturezaRubrica: natRubr,
            referencia: parseFloat(qtdRubr) || 0,
            valor: parseFloat(vrRubr) || 0,
          });
        }
      }

      if (itens.length > 0 && colaborador.cpf) {
        remuneracoes.push({
          colaborador,
          competencia,
          itens,
        });
      }
    }
  }

  return remuneracoes;
}

export type SupportedEventType = 'S-1000' | 'S-1005' | 'S-1010' | 'S-1070' | 'S-1200';
export type EventType = SupportedEventType | string;

const EVENT_PATTERNS: { pattern: RegExp; type: string }[] = [
  { pattern: /evtTabRubrica|S-1010/i, type: 'S-1010' },
  { pattern: /evtRemun|S-1200/i, type: 'S-1200' },
  { pattern: /evtInfoEmpregador|S-1000/i, type: 'S-1000' },
  { pattern: /evtTabEstab|S-1005/i, type: 'S-1005' },
  { pattern: /evtTabLotacao|S-1020/i, type: 'S-1020' },
  { pattern: /evtTabCargo|S-1030/i, type: 'S-1030' },
  { pattern: /evtTabCarreira|S-1035/i, type: 'S-1035' },
  { pattern: /evtTabFuncao|S-1040/i, type: 'S-1040' },
  { pattern: /evtTabHorTur|S-1050/i, type: 'S-1050' },
  { pattern: /evtTabAmbiente|S-1060/i, type: 'S-1060' },
  { pattern: /evtTabProcesso|S-1070/i, type: 'S-1070' },
  { pattern: /evtTabOperPort|S-1080/i, type: 'S-1080' },
  { pattern: /evtAdmissao|S-2200/i, type: 'S-2200' },
  { pattern: /evtAltCadastral|S-2205/i, type: 'S-2205' },
  { pattern: /evtAltContratual|S-2206/i, type: 'S-2206' },
  { pattern: /evtCAT|S-2210/i, type: 'S-2210' },
  { pattern: /evtMonit|S-2220/i, type: 'S-2220' },
  { pattern: /evtAfastTemp|S-2230/i, type: 'S-2230' },
  { pattern: /evtExpRisco|S-2240/i, type: 'S-2240' },
  { pattern: /evtDeslig|S-2299/i, type: 'S-2299' },
  { pattern: /evtTSVInicio|S-2300/i, type: 'S-2300' },
  { pattern: /evtTSVAltContr|S-2306/i, type: 'S-2306' },
  { pattern: /evtTSVTermino|S-2399/i, type: 'S-2399' },
  { pattern: /evtCdBenPrRP|S-2400/i, type: 'S-2400' },
  { pattern: /evtCdBenIn|S-2405/i, type: 'S-2405' },
  { pattern: /evtCdBenAlt|S-2410/i, type: 'S-2410' },
  { pattern: /evtBenPrRP|S-2416/i, type: 'S-2416' },
  { pattern: /evtCdBenTerm|S-2418/i, type: 'S-2418' },
  { pattern: /evtReabreEvPer|S-2420/i, type: 'S-2420' },
  { pattern: /evtPgtos|S-1210/i, type: 'S-1210' },
  { pattern: /evtContratAvNP|S-1250/i, type: 'S-1250' },
  { pattern: /evtAqProd|S-1260/i, type: 'S-1260' },
  { pattern: /evtComProd|S-1270/i, type: 'S-1270' },
  { pattern: /evtInfoComplPer|S-1280/i, type: 'S-1280' },
  { pattern: /evtFechaEvPer|S-1299/i, type: 'S-1299' },
  { pattern: /evtExclusao|S-3000/i, type: 'S-3000' },
  { pattern: /evtBasesTrab|S-5001/i, type: 'S-5001' },
  { pattern: /evtIrrfBenef|S-5002/i, type: 'S-5002' },
  { pattern: /evtBasesFGTS|S-5003/i, type: 'S-5003' },
  { pattern: /evtCS|S-5011/i, type: 'S-5011' },
  { pattern: /evtTotConting|S-5012/i, type: 'S-5012' },
  { pattern: /evtFGTS|S-5013/i, type: 'S-5013' },
];

const SUPPORTED_EVENTS: SupportedEventType[] = ['S-1000', 'S-1005', 'S-1010', 'S-1070', 'S-1200'];

export function detectEventType(xmlContent: string): EventType {
  for (const { pattern, type } of EVENT_PATTERNS) {
    if (pattern.test(xmlContent)) {
      return type;
    }
  }
  return 'unknown';
}

export function isEventSupported(eventType: EventType): eventType is SupportedEventType {
  return SUPPORTED_EVENTS.includes(eventType as SupportedEventType);
}

export function getEventDescription(eventType: string): string {
  const descriptions: Record<string, string> = {
    'S-1000': 'Informacoes do Empregador',
    'S-1005': 'Tabela de Estabelecimentos',
    'S-1010': 'Tabela de Rubricas',
    'S-1020': 'Tabela de Lotacoes',
    'S-1030': 'Tabela de Cargos',
    'S-1035': 'Tabela de Carreiras',
    'S-1040': 'Tabela de Funcoes',
    'S-1050': 'Tabela de Horarios',
    'S-1060': 'Tabela de Ambientes',
    'S-1070': 'Tabela de Processos Administrativos/Judiciais',
    'S-1080': 'Tabela de Operadores Portuarios',
    'S-1200': 'Remuneracao do Trabalhador',
    'S-1210': 'Pagamentos de Rendimentos',
    'S-1250': 'Aquisicao de Producao Rural',
    'S-1260': 'Comercializacao da Producao Rural',
    'S-1270': 'Contratacao de Trabalhadores Avulsos',
    'S-1280': 'Informacoes Complementares',
    'S-1299': 'Fechamento dos Eventos Periodicos',
    'S-2200': 'Cadastramento Inicial / Admissao',
    'S-2205': 'Alteracao de Dados Cadastrais',
    'S-2206': 'Alteracao de Contrato de Trabalho',
    'S-2210': 'CAT',
    'S-2220': 'Monitoramento da Saude',
    'S-2230': 'Afastamento Temporario',
    'S-2240': 'Condicoes Ambientais',
    'S-2299': 'Desligamento',
    'S-2300': 'TSV - Inicio',
    'S-2306': 'TSV - Alteracao',
    'S-2399': 'TSV - Termino',
    'S-2400': 'Beneficio - RP',
    'S-2405': 'Beneficio - Inicio',
    'S-2410': 'Beneficio - Alteracao',
    'S-2416': 'Beneficio - RP',
    'S-2418': 'Beneficio - Termino',
    'S-2420': 'Reabertura de Eventos',
    'S-3000': 'Exclusao de Eventos',
    'S-5001': 'Bases do Trabalhador',
    'S-5002': 'IRRF Beneficiario',
    'S-5003': 'Bases de FGTS',
    'S-5011': 'Totalizador de Contribuicoes',
    'S-5012': 'Totalizador de Contingencia',
    'S-5013': 'Totalizador de FGTS',
    'unknown': 'Evento nao identificado',
  };
  return descriptions[eventType] || 'Evento desconhecido';
}
