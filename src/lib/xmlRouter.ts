import { supabase } from './supabase';
import { XmlRouterConfig } from '../types/database';

export interface RouterResult {
  sucesso: boolean;
  tag_encontrada?: string;
  evento_esocial?: string;
  destino_sql?: string;
  erro?: string;
}

let routerCache: Map<string, XmlRouterConfig> | null = null;

async function loadRouterConfig(): Promise<Map<string, XmlRouterConfig>> {
  if (routerCache) {
    return routerCache;
  }

  const { data, error } = await supabase
    .from('xml_router_config')
    .select('*')
    .eq('ativo', true)
    .order('ordem_prioridade', { ascending: false });

  if (error) {
    console.error('Error loading router config:', error);
    return new Map();
  }

  routerCache = new Map();
  data?.forEach((config) => {
    routerCache!.set(config.tag_xml, config);
  });

  return routerCache;
}

export function clearRouterCache(): void {
  routerCache = null;
}

function cleanNamespace(tag: string): string {
  return tag.includes('}') ? tag.split('}')[1] : tag;
}

export async function routeEsocialEvent(conteudoXml: string): Promise<RouterResult> {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(conteudoXml, 'text/xml');

    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      return {
        sucesso: false,
        erro: 'XML inválido: Erro de parsing'
      };
    }

    const root = xmlDoc.documentElement;

    if (!root.tagName.includes('eSocial')) {
      return {
        sucesso: false,
        erro: 'XML inválido: Tag raiz não é eSocial'
      };
    }

    const routerConfig = await loadRouterConfig();

    let tagEvento: string | null = null;
    for (let i = 0; i < root.children.length; i++) {
      const child = root.children[i];
      const tagLimpa = cleanNamespace(child.tagName);

      if (tagLimpa === 'Signature') {
        continue;
      }

      tagEvento = tagLimpa;
      break;
    }

    if (!tagEvento) {
      return {
        sucesso: false,
        erro: 'Nenhuma tag de evento encontrada no XML'
      };
    }

    const destino = routerConfig.get(tagEvento);

    if (destino) {
      return {
        sucesso: true,
        tag_encontrada: tagEvento,
        evento_esocial: destino.codigo_evento,
        destino_sql: destino.tabela_destino
      };
    } else {
      return {
        sucesso: false,
        erro: `Evento desconhecido ou não mapeado: ${tagEvento}`
      };
    }

  } catch (e) {
    return {
      sucesso: false,
      erro: `Erro de leitura: ${e instanceof Error ? e.message : String(e)}`
    };
  }
}
