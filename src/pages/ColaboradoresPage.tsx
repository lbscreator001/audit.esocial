import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCPF } from '../lib/formatters';
import {
  Search,
  Users,
  ChevronRight,
  User
} from 'lucide-react';
import type { Colaborador } from '../types/database';

interface ColaboradoresPageProps {
  onNavigateToEmployee: (colaboradorId: string, competencia: string) => void;
}

interface ColaboradorComRemuneracoes extends Colaborador {
  totalRemuneracoes: number;
  ultimaCompetencia: string | null;
}

export function ColaboradoresPage({ onNavigateToEmployee }: ColaboradoresPageProps) {
  const { empresa } = useAuth();
  const [colaboradores, setColaboradores] = useState<ColaboradorComRemuneracoes[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (empresa) {
      loadColaboradores();
    }
  }, [empresa]);

  async function loadColaboradores() {
    if (!empresa) return;

    setLoading(true);

    const { data: colaboradoresData } = await supabase
      .from('colaboradores')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('nome', { ascending: true });

    if (colaboradoresData) {
      const colaboradoresComDados = await Promise.all(
        colaboradoresData.map(async (c) => {
          const { data: remuneracoes } = await supabase
            .from('remuneracoes')
            .select('competencia')
            .eq('colaborador_id', c.id)
            .order('competencia', { ascending: false });

          return {
            ...c,
            totalRemuneracoes: remuneracoes?.length || 0,
            ultimaCompetencia: remuneracoes?.[0]?.competencia || null,
          };
        })
      );

      setColaboradores(colaboradoresComDados);
    }

    setLoading(false);
  }

  const filteredColaboradores = colaboradores.filter((c) => {
    const search = searchTerm.toLowerCase();
    return (
      c.nome.toLowerCase().includes(search) ||
      c.cpf.includes(search) ||
      (c.matricula && c.matricula.toLowerCase().includes(search))
    );
  });

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
        <h1 className="text-2xl font-bold text-white mb-1">Colaboradores</h1>
        <p className="text-slate-400">
          {filteredColaboradores.length} colaborador{filteredColaboradores.length !== 1 ? 'es' : ''} cadastrado{filteredColaboradores.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome, CPF ou matricula..."
          className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {colaboradores.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-12 text-center">
          <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Nenhum colaborador cadastrado</h3>
          <p className="text-slate-400">
            Importe arquivos XML do evento S-1200 para cadastrar os colaboradores
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredColaboradores.map((colaborador) => (
            <div
              key={colaborador.id}
              onClick={() => {
                if (colaborador.ultimaCompetencia) {
                  onNavigateToEmployee(colaborador.id, colaborador.ultimaCompetencia);
                }
              }}
              className={`bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 transition-all ${
                colaborador.ultimaCompetencia
                  ? 'hover:border-emerald-500/50 cursor-pointer'
                  : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">{colaborador.nome}</h3>
                  <p className="text-slate-400 text-sm">{formatCPF(colaborador.cpf)}</p>
                  {colaborador.matricula && (
                    <p className="text-slate-500 text-xs">Mat: {colaborador.matricula}</p>
                  )}
                </div>
                {colaborador.ultimaCompetencia && (
                  <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  {colaborador.totalRemuneracoes} competencia{colaborador.totalRemuneracoes !== 1 ? 's' : ''}
                </span>
                {colaborador.ultimaCompetencia && (
                  <span className="text-emerald-400">
                    Ultima: {colaborador.ultimaCompetencia}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}