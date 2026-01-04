import { ReactNode, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard,
  Upload,
  FileSpreadsheet,
  Users,
  Menu,
  X,
  FileText,
  ChevronRight,
  Building2,
  Settings,
  ChevronDown,
  Plus,
  Check,
  LogOut
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onSidebarNavigate?: (page: string) => void;
  breadcrumbs?: { label: string; page?: string }[];
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'import', label: 'Importar XML', icon: Upload },
  { id: 'rubricas', label: 'Rubricas', icon: FileSpreadsheet },
  { id: 'colaboradores', label: 'Colaboradores', icon: Users },
  { id: 'parametros', label: 'Parâmetros', icon: Settings },
];

export function Layout({ children, currentPage, onNavigate, onSidebarNavigate, breadcrumbs }: LayoutProps) {
  const { user, empresa, empresas, setEmpresa, loadEmpresas, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCnpj, setNewCnpj] = useState('');
  const [newRazaoSocial, setNewRazaoSocial] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const handleSidebarClick = onSidebarNavigate || onNavigate;

  function formatCNPJ(cnpj: string) {
    return cnpj.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    );
  }

  function formatCNPJInput(value: string) {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  }

  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);

    if (!user?.id) {
      setCreateError('Usuario nao autenticado');
      setCreating(false);
      return;
    }

    const cleanCnpj = newCnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      setCreateError('CNPJ deve ter 14 digitos');
      setCreating(false);
      return;
    }

    const { data, error } = await supabase
      .from('empresas')
      .insert({
        user_id: user.id,
        cnpj: cleanCnpj,
        razao_social: newRazaoSocial,
      })
      .select()
      .single();

    if (error) {
      setCreateError(error.message);
      setCreating(false);
      return;
    }

    setEmpresa(data);
    await loadEmpresas();
    setNewCnpj('');
    setNewRazaoSocial('');
    setShowCreateModal(false);
    setCreating(false);
  }

  function handleSelectCompany(selectedEmpresa: typeof empresa) {
    setEmpresa(selectedEmpresa);
    setShowCompanyDropdown(false);
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 rounded-lg text-slate-300 hover:text-white"
      >
        <Menu className="w-6 h-6" />
      </button>

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-slate-800 border-r border-slate-700 z-50 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <span className="text-lg font-bold text-white">AuditFolha</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-slate-700">
            <div className="relative">
              <button
                onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                className="w-full flex items-center gap-3 p-2 rounded-xl bg-slate-700/50 hover:bg-slate-700 transition-colors"
              >
                <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-slate-300" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  {empresa ? (
                    <>
                      <p className="text-sm font-medium text-white truncate">
                        {empresa.razao_social}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatCNPJ(empresa.cnpj)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">Selecionar empresa</p>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showCompanyDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showCompanyDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-700 border border-slate-600 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    {empresas.length > 0 && (
                      <div className="py-2">
                        <p className="px-4 py-1 text-xs font-medium text-slate-400 uppercase">Empresas cadastradas</p>
                        {empresas.map((emp) => (
                          <button
                            key={emp.id}
                            onClick={() => handleSelectCompany(emp)}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-600/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-sm text-white truncate">{emp.razao_social}</p>
                              <p className="text-xs text-slate-500">{formatCNPJ(emp.cnpj)}</p>
                            </div>
                            {empresa?.id === emp.id && (
                              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="border-t border-slate-600">
                    <button
                      onClick={() => {
                        setShowCompanyDropdown(false);
                        setShowCreateModal(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="font-medium">Criar Nova Empresa</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    handleSidebarClick(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-700">
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sair</span>
            </button>
          </div>

        </div>
      </aside>

      <main className="lg:ml-64">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="bg-slate-800/50 border-b border-slate-700 px-6 py-3">
            <div className="flex items-center gap-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center gap-2">
                  {index > 0 && <ChevronRight className="w-4 h-4 text-slate-600" />}
                  {crumb.page ? (
                    <button
                      onClick={() => onNavigate(crumb.page!)}
                      className="text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="text-slate-300">{crumb.label}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 lg:p-8">{children}</div>
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Criar Nova Empresa</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewCnpj('');
                  setNewRazaoSocial('');
                  setCreateError('');
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={newCnpj}
                  onChange={(e) => setNewCnpj(formatCNPJInput(e.target.value))}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  placeholder="00.000.000/0000-00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Razao Social
                </label>
                <input
                  type="text"
                  value={newRazaoSocial}
                  onChange={(e) => setNewRazaoSocial(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  placeholder="Nome da empresa"
                  required
                />
              </div>

              {createError && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-400 text-sm">
                  {createError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewCnpj('');
                    setNewRazaoSocial('');
                    setCreateError('');
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Criar Empresa'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCompanyDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowCompanyDropdown(false)}
        />
      )}
    </div>
  );
}