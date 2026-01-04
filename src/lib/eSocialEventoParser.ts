import { Database } from '../types/database';

type EventoS1010Insert = Database['public']['Tables']['evt_s1010']['Insert'];

function getElementText(parent: Element | null, tagName: string): string | null {
  if (!parent) return null;
  const element = parent.getElementsByTagName(tagName)[0];
  return element?.textContent || null;
}

function getElementNumber(parent: Element | null, tagName: string): number | null {
  const text = getElementText(parent, tagName);
  return text ? Number(text) : null;
}

function cleanNamespace(tag: string): string {
  return tag.includes('}') ? tag.split('}')[1] : tag;
}

export function extractXmlId(xmlContent: string): string | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      return null;
    }

    const root = xmlDoc.documentElement;

    for (let i = 0; i < root.children.length; i++) {
      const child = root.children[i];
      const tagLimpa = cleanNamespace(child.tagName);

      if (tagLimpa === 'Signature') {
        continue;
      }

      const idAttr = child.getAttribute('Id');
      if (idAttr) {
        return idAttr;
      }

      for (let j = 0; j < child.children.length; j++) {
        const subChild = child.children[j];
        const subIdAttr = subChild.getAttribute('Id');
        if (subIdAttr) {
          return subIdAttr;
        }
      }
    }

    return null;
  } catch (e) {
    console.error('Error extracting XML ID:', e);
    return null;
  }
}

export function parseS1010Complete(
  xmlContent: string,
  empresaId: string,
  usuarioId: string | null
): Partial<EventoS1010Insert> | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      console.error('XML parse error');
      return null;
    }

    const root = xmlDoc.documentElement;
    const xmlVersion = root.getAttribute('xmlns') || '1.0';

    const xmlId = extractXmlId(xmlContent);
    if (!xmlId) {
      console.error('XML ID not found');
      return null;
    }

    const ideEvento = root.getElementsByTagName('ideEvento')[0];
    const ideEmpregador = root.getElementsByTagName('ideEmpregador')[0];

    let operationType: string | null = null;
    let rubricaData: Element | null = null;

    const inclusao = root.getElementsByTagName('inclusao')[0];
    const alteracao = root.getElementsByTagName('alteracao')[0];
    const exclusao = root.getElementsByTagName('exclusao')[0];

    if (inclusao) {
      operationType = 'inclusao';
      rubricaData = inclusao;
    } else if (alteracao) {
      operationType = 'alteracao';
      rubricaData = alteracao;
    } else if (exclusao) {
      operationType = 'exclusao';
      rubricaData = exclusao;
    }

    const ideRubrica = rubricaData?.getElementsByTagName('ideRubrica')[0];
    const dadosRubrica = rubricaData?.getElementsByTagName('dadosRubrica')[0];

    const recibo = root.getElementsByTagName('Recibo')[0];
    const retornoEvento = root.getElementsByTagName('retornoEvento')[0];

    const result: Partial<EventoS1010Insert> = {
      empresa_id: empresaId,
      usuario_id: usuarioId,
      xml_id: xmlId,
      xml_version: xmlVersion,

      tp_amb: getElementNumber(ideEvento, 'tpAmb'),
      proc_emi: getElementNumber(ideEvento, 'procEmi'),
      ver_proc: getElementText(ideEvento, 'verProc'),

      emp_tp_insc: getElementNumber(ideEmpregador, 'tpInsc'),
      emp_nr_insc: getElementText(ideEmpregador, 'nrInsc'),

      rub_operation_type: operationType,
      rub_cod_rubr: getElementText(ideRubrica, 'codRubr'),
      rub_ide_tab_rubr: getElementText(ideRubrica, 'ideTabRubr'),
      rub_ini_valid: getElementText(ideRubrica, 'iniValid'),
      rub_fim_valid: getElementText(ideRubrica, 'fimValid'),

      rub_dsc_rubr: getElementText(dadosRubrica, 'dscRubr'),
      rub_nat_rubr: getElementNumber(dadosRubrica, 'natRubr'),
      rub_tp_rubr: getElementNumber(dadosRubrica, 'tpRubr'),
      rub_cod_inc_cp: getElementNumber(dadosRubrica, 'codIncCP'),
      rub_cod_inc_irrf: getElementNumber(dadosRubrica, 'codIncIRRF'),
      rub_cod_inc_fgts: getElementNumber(dadosRubrica, 'codIncFGTS'),
      rub_cod_inc_sind: getElementNumber(dadosRubrica, 'codIncSIND'),

      rec_tp_amb: getElementNumber(retornoEvento, 'tpAmb'),
      rec_dh_recepcao: getElementText(retornoEvento, 'dhRecepcao'),
      rec_versao_app_recepcao: getElementText(retornoEvento, 'versaoAppRecepcao'),
      rec_protocolo_envio: getElementText(retornoEvento, 'protocoloEnvio'),
      rec_cd_resposta: getElementNumber(retornoEvento, 'cdResposta'),
      rec_desc_resposta: getElementText(retornoEvento, 'descResposta'),
      rec_dh_processamento: getElementText(retornoEvento, 'dhProcessamento'),
      rec_nr_recibo: getElementText(recibo, 'nrRecibo'),
      rec_hash: getElementText(recibo, 'hash'),
    };

    return result;
  } catch (e) {
    console.error('Error parsing S-1010 XML:', e);
    return null;
  }
}

export function parseCompleteEvent(
  xmlContent: string,
  eventoType: string,
  empresaId: string,
  usuarioId: string | null
): any {
  switch (eventoType) {
    case 'S-1010':
      return parseS1010Complete(xmlContent, empresaId, usuarioId);
    default:
      console.warn(`Parser for event ${eventoType} not implemented yet`);
      return null;
  }
}
