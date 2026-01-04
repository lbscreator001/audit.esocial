import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DashboardPage } from './pages/DashboardPage';
import { MonthlyPayrollPage } from './pages/MonthlyPayrollPage';
import { EmployeeDetailPage } from './pages/EmployeeDetailPage';
import { ImportPage } from './pages/ImportPage';
import { RubricasPage } from './pages/RubricasPage';
import { AnaliseRubricasPage } from './pages/AnaliseRubricasPage';
import { ColaboradoresPage } from './pages/ColaboradoresPage';
import ParametrosPage from './pages/ParametrosPage';
import { LoginPage } from './pages/LoginPage';
import { CompanySetupPage } from './pages/CompanySetupPage';
import { Layout } from './components/Layout';
import { formatCompetenciaShort } from './lib/formatters';

type Page =
  | { type: 'dashboard' }
  | { type: 'import' }
  | { type: 'rubricas' }
  | { type: 'analise-rubricas' }
  | { type: 'colaboradores' }
  | { type: 'parametros' }
  | { type: 'monthly'; competencia: string }
  | { type: 'employee'; colaboradorId: string; competencia: string };

function AppContent() {
  const { user, empresa, empresas, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>({ type: 'dashboard' });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (empresas.length === 0 || !empresa) {
    return <CompanySetupPage />;
  }

  function handleNavigate(page: string) {
    switch (page) {
      case 'dashboard':
        setCurrentPage({ type: 'dashboard' });
        break;
      case 'import':
        setCurrentPage({ type: 'import' });
        break;
      case 'rubricas':
        setCurrentPage({ type: 'rubricas' });
        break;
      case 'analise-rubricas':
        setCurrentPage({ type: 'analise-rubricas' });
        break;
      case 'colaboradores':
        setCurrentPage({ type: 'colaboradores' });
        break;
      case 'parametros':
        setCurrentPage({ type: 'parametros' });
        break;
    }
  }

  function handleNavigateToMonth(competencia: string) {
    setCurrentPage({ type: 'monthly', competencia });
  }

  function handleNavigateToEmployee(colaboradorId: string, competencia: string) {
    setCurrentPage({ type: 'employee', colaboradorId, competencia });
  }

  function getPageId(): string {
    switch (currentPage.type) {
      case 'dashboard':
      case 'monthly':
      case 'employee':
        return 'dashboard';
      case 'import':
        return 'import';
      case 'rubricas':
        return 'rubricas';
      case 'analise-rubricas':
        return 'analise-rubricas';
      case 'colaboradores':
        return 'colaboradores';
      case 'parametros':
        return 'parametros';
    }
  }

  function getBreadcrumbs(): { label: string; page?: string }[] {
    switch (currentPage.type) {
      case 'dashboard':
        return [{ label: 'Dashboard' }];
      case 'monthly':
        return [
          { label: 'Dashboard', page: 'dashboard' },
          { label: formatCompetenciaShort(currentPage.competencia) },
        ];
      case 'employee':
        return [
          { label: 'Dashboard', page: 'dashboard' },
          { label: formatCompetenciaShort(currentPage.competencia), page: 'monthly' },
          { label: 'Colaborador' },
        ];
      case 'import':
        return [{ label: 'Importar XML' }];
      case 'rubricas':
        return [{ label: 'Rubricas' }];
      case 'analise-rubricas':
        return [{ label: 'Analise de Rubricas' }];
      case 'colaboradores':
        return [{ label: 'Colaboradores' }];
      case 'parametros':
        return [{ label: 'Parametros' }];
    }
  }

  function handleBreadcrumbNavigate(page: string) {
    if (page === 'dashboard') {
      setCurrentPage({ type: 'dashboard' });
    } else if (page === 'monthly' && currentPage.type === 'employee') {
      setCurrentPage({ type: 'monthly', competencia: currentPage.competencia });
    }
  }

  function renderPage() {
    switch (currentPage.type) {
      case 'dashboard':
        return <DashboardPage onNavigateToMonth={handleNavigateToMonth} />;
      case 'monthly':
        return (
          <MonthlyPayrollPage
            competencia={currentPage.competencia}
            onNavigateToEmployee={handleNavigateToEmployee}
          />
        );
      case 'employee':
        return (
          <EmployeeDetailPage
            colaboradorId={currentPage.colaboradorId}
            competencia={currentPage.competencia}
          />
        );
      case 'import':
        return <ImportPage />;
      case 'rubricas':
        return <RubricasPage />;
      case 'analise-rubricas':
        return <AnaliseRubricasPage />;
      case 'colaboradores':
        return <ColaboradoresPage onNavigateToEmployee={handleNavigateToEmployee} />;
      case 'parametros':
        return <ParametrosPage />;
    }
  }

  return (
    <Layout
      currentPage={getPageId()}
      onNavigate={handleBreadcrumbNavigate}
      onSidebarNavigate={handleNavigate}
      breadcrumbs={getBreadcrumbs()}
    >
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;