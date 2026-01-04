import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Archive,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { Importacao } from '../types/database';

interface ImportHistoryProps {
  empresaId: string;
  filterEventType?: string;
  title?: string;
  maxItems?: number;
  showFilters?: boolean;
}

type StatusFilter = 'all' | 'success' | 'partial' | 'error';
type EventFilter = 'all' | 'S-1010' | 'S-1200';

export function ImportHistory({
  empresaId,
  filterEventType,
  title = 'Historico de Importacoes',
  maxItems = 50,
  showFilters = true
}: ImportHistoryProps) {
  const [importacoes, setImportacoes] = useState<Importacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [eventFilter, setEventFilter] = useState<EventFilter>(filterEventType as EventFilter || 'all');
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    loadImportacoes();
  }, [empresaId, filterEventType]);

  async function loadImportacoes() {
    setLoading(true);

    let query = supabase
      .from('importacoes')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(maxItems);

    if (filterEventType) {
      query = query.eq('tipo_evento', filterEventType);
    }

    const { data } = await query;
    setImportacoes(data || []);
    setLoading(false);
  }

  const filteredImportacoes = importacoes.filter((imp) => {
    const matchesStatus = statusFilter === 'all' || imp.status === statusFilter;
    const matchesEvent = eventFilter === 'all' || imp.tipo_evento === eventFilter;
    return matchesStatus && matchesEvent;
  });

  const groupedByEvent = filteredImportacoes.reduce((acc, imp) => {
    if (!acc[imp.tipo_evento]) {
      acc[imp.tipo_evento] = [];
    }
    acc[imp.tipo_evento].push(imp);
    return acc;
  }, {} as Record<string, Importacao[]>);

  function getStatusIcon(status: string) {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'partial':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  }

  function getEventBadge(eventType: string) {
    const colors: Record<string, string> = {
      'S-1010': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'S-1200': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };
    return colors[eventType] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  const stats = {
    total: filteredImportacoes.length,
    s1010: filteredImportacoes.filter(i => i.tipo_evento === 'S-1010').length,
    s1200: filteredImportacoes.filter(i => i.tipo_evento === 'S-1200').length,
    success: filteredImportacoes.filter(i => i.status === 'success').length,
    partial: filteredImportacoes.filter(i => i.status === 'partial').length,
    error: filteredImportacoes.filter(i => i.status === 'error').length,
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8">
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-white">{title}</h2>
          <span className="text-sm text-slate-500">({stats.total} registros)</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {expanded && (
        <>
          {showFilters && !filterEventType && (
            <div className="px-4 pb-4 border-b border-slate-700/50">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <select
                    value={eventFilter}
                    onChange={(e) => setEventFilter(e.target.value as EventFilter)}
                    className="bg-slate-700/50 border border-slate-600 rounded-lg py-1.5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">Todos os eventos</option>
                    <option value="S-1010">S-1010 - Rubricas</option>
                    <option value="S-1200">S-1200 - Remuneracao</option>
                  </select>
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="bg-slate-700/50 border border-slate-600 rounded-lg py-1.5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Todos os status</option>
                  <option value="success">Sucesso</option>
                  <option value="partial">Parcial</option>
                  <option value="error">Erro</option>
                </select>

                <div className="flex items-center gap-3 ml-auto text-xs">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> {stats.success}
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <AlertTriangle className="w-3 h-3" /> {stats.partial}
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <XCircle className="w-3 h-3" /> {stats.error}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-slate-700/50">
            <div className="bg-slate-700/30 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Total</p>
              <p className="text-xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="bg-blue-500/10 rounded-xl p-3">
              <p className="text-xs text-blue-400 mb-1">S-1010</p>
              <p className="text-xl font-bold text-blue-400">{stats.s1010}</p>
            </div>
            <div className="bg-emerald-500/10 rounded-xl p-3">
              <p className="text-xs text-emerald-400 mb-1">S-1200</p>
              <p className="text-xl font-bold text-emerald-400">{stats.s1200}</p>
            </div>
            <div className="bg-slate-700/30 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Sucesso</p>
              <p className="text-xl font-bold text-emerald-400">{stats.success}</p>
            </div>
          </div>

          {filteredImportacoes.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhuma importacao encontrada</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50 max-h-96 overflow-y-auto">
              {filteredImportacoes.map((imp) => (
                <div key={imp.id} className="p-4 hover:bg-slate-700/20 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      {imp.arquivo_origem_zip ? (
                        <Archive className="w-5 h-5 text-slate-400" />
                      ) : (
                        <FileText className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-medium truncate">{imp.nome_arquivo}</p>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded border flex-shrink-0 ${getEventBadge(imp.tipo_evento)}`}>
                          {imp.tipo_evento}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>{formatDate(imp.created_at)}</span>
                        {imp.competencia && (
                          <span>Competencia: {imp.competencia}</span>
                        )}
                        <span>{imp.registros_processados} registros</span>
                        {imp.arquivo_origem_zip && (
                          <span className="text-slate-600" title={`Caminho: ${imp.caminho_no_zip || imp.nome_arquivo}`}>
                            via {imp.arquivo_origem_zip}
                          </span>
                        )}
                      </div>
                      {imp.caminho_no_zip && imp.caminho_no_zip !== imp.nome_arquivo && (
                        <p className="text-xs text-slate-600 mt-1 truncate" title={imp.caminho_no_zip}>
                          {imp.caminho_no_zip}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusIcon(imp.status)}
                      <span className={`text-xs capitalize ${
                        imp.status === 'success' ? 'text-emerald-400' :
                        imp.status === 'partial' ? 'text-amber-400' :
                        imp.status === 'error' ? 'text-red-400' : 'text-slate-400'
                      }`}>
                        {imp.status === 'success' ? 'Sucesso' :
                         imp.status === 'partial' ? 'Parcial' :
                         imp.status === 'error' ? 'Erro' : imp.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
