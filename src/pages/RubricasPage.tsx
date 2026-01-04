import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Search,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Filter,
  History
} from 'lucide-react';
import { ImportHistory } from '../components/ImportHistory';
import type { Rubrica } from '../types/database';

type FilterNatureza = 'all' | 'provento' | 'desconto';

export function RubricasPage() {
  const { empresa } = useAuth();
  const [rubricas, setRubricas] = useState<Rubrica[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNatureza, setFilterNatureza] = useState<FilterNatureza>('all');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (empresa) {
      loadRubricas();
    }
  }, [empresa]);

  async function loadRubricas() {
    if (!empresa) return;

    setLoading(true);

    const { data } = await supabase
      .from('rubricas')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('codigo', { ascending: true });

    setRubricas(data || []);
    setLoading(false);
  }

  const filteredRubricas = rubricas.filter((r) => {
    const matchesSearch =
      r.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.descricao.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesNatureza =
      filterNatureza === 'all' || r.natureza === filterNatureza;

    return matchesSearch && matchesNatureza;
  });

  function getIncidenciaLabel(codigo: string): { label: string; active: boolean } {
    if (codigo === '00' || !codigo) {
      return { label: 'Nao incide', active: false };
    }
    return { label: `Cod ${codigo}`, active: true };
  }

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
        <h1 className="text-2xl font-bold text-white mb-1">Tabela de Rubricas</h1>
        <p className="text-slate-400">
          Rubricas cadastradas via evento S-1010 ({filteredRubricas.length} registros)
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por codigo ou descricao..."
            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-500" />
          <select
            value={filterNatureza}
            onChange={(e) => setFilterNatureza(e.target.value as FilterNatureza)}
            className="bg-slate-800/50 border border-slate-700 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="all">Todas</option>
            <option value="provento">Proventos</option>
            <option value="desconto">Descontos</option>
          </select>
        </div>

        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors ${
            showHistory
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <History className="w-5 h-5" />
          Historico XML
        </button>
      </div>

      {showHistory && empresa && (
        <ImportHistory
          empresaId={empresa.id}
          filterEventType="S-1010"
          title="Historico de XMLs S-1010 Importados"
          showFilters={false}
        />
      )}

      {rubricas.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-12 text-center">
          <FileSpreadsheet className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Nenhuma rubrica cadastrada</h3>
          <p className="text-slate-400">
            Importe um arquivo XML do evento S-1010 para cadastrar as rubricas
          </p>
        </div>
      ) : (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Codigo</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Descricao</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">Natureza</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">INSS</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">IRRF</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">FGTS</th>
                </tr>
              </thead>
              <tbody>
                {filteredRubricas.map((rubrica) => {
                  const inss = getIncidenciaLabel(rubrica.incid_inss);
                  const irrf = getIncidenciaLabel(rubrica.incid_irrf);
                  const fgts = getIncidenciaLabel(rubrica.incid_fgts);

                  return (
                    <tr
                      key={rubrica.id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <span className="font-mono text-emerald-400">{rubrica.codigo}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-white">{rubrica.descricao}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${
                            rubrica.natureza === 'provento'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : rubrica.natureza === 'desconto'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-slate-500/10 text-slate-400'
                          }`}
                        >
                          {rubrica.natureza === 'provento'
                            ? 'Provento'
                            : rubrica.natureza === 'desconto'
                            ? 'Desconto'
                            : 'Info'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {inss.active ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <XCircle className="w-4 h-4" />
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {irrf.active ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <XCircle className="w-4 h-4" />
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {fgts.active ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <XCircle className="w-4 h-4" />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Legenda de Incidencias</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-slate-300 mb-2">INSS (codIncCP)</h3>
            <ul className="space-y-1 text-slate-400">
              <li>00 - Nao incide</li>
              <li>01 - Mensal</li>
              <li>02 - 13o Salario</li>
              <li>03 - Exclusiva do empregador</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-slate-300 mb-2">IRRF (codIncIRRF)</h3>
            <ul className="space-y-1 text-slate-400">
              <li>00 - Nao incide</li>
              <li>01 - Tributavel</li>
              <li>09 - Tributacao exclusiva</li>
              <li>13 - Isento (65+)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-slate-300 mb-2">FGTS (codIncFGTS)</h3>
            <ul className="space-y-1 text-slate-400">
              <li>00 - Nao incide</li>
              <li>01 - Mensal</li>
              <li>03 - 13o Salario</li>
              <li>04 - Rescisao</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}