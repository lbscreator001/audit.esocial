# AuditFolha - Documentacao Tecnica Completa

## Sumario

1. [Visao Geral](#visao-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Estrutura de Arquivos](#estrutura-de-arquivos)
4. [Fluxo de Dados](#fluxo-de-dados)
5. [Banco de Dados](#banco-de-dados)
6. [Modulos e Componentes](#modulos-e-componentes)
7. [Regras de Negocio](#regras-de-negocio)
8. [Guia de Instalacao](#guia-de-instalacao)
9. [Consideracoes de Seguranca](#consideracoes-de-seguranca)

---

## Visao Geral

### Proposito da Aplicacao

O **AuditFolha** e um sistema web de auditoria de folha de pagamento brasileiro que processa eventos do eSocial. A aplicacao importa arquivos XML dos eventos S-1010 (Tabela de Rubricas) e S-1200 (Remuneracao do Trabalhador), recalcula os tributos aplicaveis (INSS, IRRF, FGTS) e identifica divergencias entre os valores originais e os valores recalculados.

### Principais Funcionalidades

- **Importacao de Arquivos**: Upload de arquivos XML individuais ou em lote via ZIP
- **Processamento de Eventos eSocial**: Parsing de S-1010 e S-1200
- **Auditoria Automatica**: Recalculo de bases tributaveis e identificacao de divergencias
- **Dashboard Analitico**: Visao consolidada com KPIs e graficos
- **Gestao de Parametros**: Visualizacao de faixas de INSS, IRRF e parametros do sistema
- **Multi-empresa**: Cada usuario pode gerenciar multiplas empresas

### Stack Tecnologico

| Componente | Tecnologia | Versao |
|------------|------------|--------|
| Frontend | React | 18.3.1 |
| Linguagem | TypeScript | 5.5.3 |
| Build Tool | Vite | 5.4.2 |
| Estilizacao | Tailwind CSS | 3.4.1 |
| Icones | Lucide React | 0.344.0 |
| Backend/DB | Supabase | 2.57.4 |
| ZIP Handler | JSZip | 3.10.1 |

---

## Arquitetura do Sistema

### Diagrama de Componentes

```
+------------------------------------------------------------------+
|                         FRONTEND (React)                          |
+------------------------------------------------------------------+
|                                                                    |
|  +------------------+    +------------------+    +--------------+  |
|  |   AuthContext    |    |      Pages       |    |  Components  |  |
|  | - user session   |    | - LoginPage      |    | - Layout     |  |
|  | - empresa atual  |    | - DashboardPage  |    | - ImportHist |  |
|  | - empresas list  |    | - ImportPage     |    +--------------+  |
|  +------------------+    | - RubricasPage   |                      |
|           |              | - ColaboradoresP |                      |
|           v              | - ParametrosPage |                      |
|  +------------------+    | - MonthlyPayroll |                      |
|  |    Libraries     |    | - EmployeeDetail |                      |
|  | - auditEngine    |    | - CompanySetup   |                      |
|  | - xmlParser      |    +------------------+                      |
|  | - zipExtractor   |             |                                |
|  | - formatters     |             v                                |
|  +------------------+    +------------------+                      |
|           |              |   Supabase SDK   |                      |
|           v              +------------------+                      |
|  +------------------+             |                                |
|  |  Type Definitions|             v                                |
|  |  (database.ts)   |    +------------------+                      |
|  +------------------+    |     SUPABASE     |                      |
|                          | - PostgreSQL DB  |                      |
+--------------------------|  - Auth Service  |----------------------+
                           | - RLS Policies   |
                           +------------------+
```

### Padrao de Arquitetura

A aplicacao segue uma arquitetura **Component-Based** com separacao clara de responsabilidades:

1. **Camada de Apresentacao**: Componentes React em `/src/pages/` e `/src/components/`
2. **Camada de Logica de Negocio**: Funcoes utilitarias em `/src/lib/`
3. **Camada de Dados**: Supabase client com tipos em `/src/types/`
4. **Camada de Estado**: Context API para autenticacao

---

## Estrutura de Arquivos

```
project/
├── .env                          # Variaveis de ambiente (Supabase keys)
├── package.json                  # Dependencias e scripts NPM
├── vite.config.ts                # Configuracao do Vite
├── tailwind.config.js            # Configuracao do Tailwind CSS
├── tsconfig.json                 # Configuracao TypeScript base
├── tsconfig.app.json             # Configuracao TS para aplicacao
├── index.html                    # Entry point HTML
│
├── src/
│   ├── main.tsx                  # Entry point React
│   ├── App.tsx                   # Componente raiz e roteamento
│   ├── index.css                 # Estilos globais (Tailwind)
│   ├── vite-env.d.ts             # Tipos do ambiente Vite
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx       # Contexto de autenticacao e empresa
│   │
│   ├── lib/
│   │   ├── supabase.ts           # Cliente Supabase singleton
│   │   ├── auditEngine.ts        # Motor de auditoria e calculo de tributos
│   │   ├── xmlParser.ts          # Parser de eventos eSocial
│   │   ├── zipExtractor.ts       # Extrator de arquivos ZIP
│   │   └── formatters.ts         # Formatadores de dados (moeda, CPF, etc)
│   │
│   ├── types/
│   │   └── database.ts           # Definicoes de tipos do banco
│   │
│   ├── components/
│   │   ├── Layout.tsx            # Shell principal da aplicacao
│   │   └── ImportHistory.tsx     # Componente de historico de importacoes
│   │
│   └── pages/
│       ├── LoginPage.tsx         # Tela de login/registro
│       ├── CompanySetupPage.tsx  # Configuracao inicial de empresa
│       ├── DashboardPage.tsx     # Dashboard principal
│       ├── ImportPage.tsx        # Importacao de XMLs
│       ├── RubricasPage.tsx      # Listagem de rubricas
│       ├── ColaboradoresPage.tsx # Listagem de colaboradores
│       ├── MonthlyPayrollPage.tsx# Folha mensal
│       ├── EmployeeDetailPage.tsx# Detalhe do colaborador
│       └── ParametrosPage.tsx    # Parametros do sistema
│
└── supabase/
    └── migrations/               # Arquivos de migracao SQL
        ├── 20260103171645_create_payroll_audit_schema.sql
        ├── 20260103215016_create_tax_parameters_tables.sql
        ├── 20260103221649_create_entendimentos_tributacao_table.sql
        ├── 20260103224139_create_evt_s1000_table.sql
        ├── 20260103224832_rename_evt_s1000_empregador_to_evt_s1000_v2.sql
        └── 20260103230311_add_zip_origin_fields_to_importacoes.sql
```

---

## Fluxo de Dados

### Jornada do Usuario

```
1. AUTENTICACAO
   Usuario -> LoginPage -> Supabase Auth -> Session criada
                                         -> AuthContext atualizado

2. CONFIGURACAO INICIAL
   Usuario novo -> CompanySetupPage -> Cria registro em 'empresas'
                                    -> Redireciona para Dashboard

3. IMPORTACAO DE DADOS
   Usuario seleciona XML/ZIP -> ImportPage
                             -> zipExtractor (se ZIP)
                             -> xmlParser.detectEventType()
                             -> parseS1010() ou parseS1200()
                             -> INSERT em rubricas/colaboradores/remuneracoes
                             -> auditEngine.runAudit()
                             -> UPDATE em apuracoes

4. VISUALIZACAO E ANALISE
   Dashboard -> loadDashboardData() -> Consulta apuracoes, divergencias
           -> Exibe KPIs e tabela de competencias
           -> Click em competencia -> MonthlyPayrollPage
                                   -> EmployeeDetailPage
```

### Ciclo de Auditoria

```
ENTRADA: Arquivo S-1200 importado
         |
         v
+------------------+
| parseS1200()     |  Extrai: colaborador, competencia, itens de remuneracao
+------------------+
         |
         v
+------------------+
| processS1200()   |  - Cria/atualiza colaborador
|                  |  - Cria/atualiza remuneracao com bases calculadas
|                  |  - Insere itens_remuneracao
+------------------+
         |
         v
+------------------+
| runAudit()       |  - Carrega parametros vigentes (faixas INSS/IRRF)
|                  |  - Recalcula bases a partir de rubricas
|                  |  - Compara com valores importados
|                  |  - Cria divergencias se houver diferencas
+------------------+
         |
         v
+------------------+
| updateApuracao() |  - Consolida totais da competencia
|                  |  - Conta divergencias
+------------------+
         |
         v
SAIDA: Apuracao atualizada, divergencias identificadas
```

---

## Banco de Dados

### Diagrama ER Simplificado

```
auth.users (Supabase Auth)
    |
    | 1:N
    v
+-------------+
|  empresas   |----+
+-------------+    |
    |              |
    | 1:N          | 1:N (todas as tabelas referenciam empresa_id)
    v              |
+-------------+    |     +-------------+
| rubricas    |<---+---->| colaboradores|
+-------------+    |     +-------------+
    ^              |          |
    |              |          | 1:N
    | (opcional)   |          v
    |              |     +-------------+
+-------------+    |     | remuneracoes |<----+
| itens_      |<---+     +-------------+      |
| remuneracao |----^          |               |
+-------------+    |          | 1:N           |
                   |          v               |
                   |     +-------------+      |
                   +---->| divergencias|------+
                         +-------------+

+-------------+     +-------------+     +-------------+
| importacoes |     | apuracoes   |     | evt_s1000   |
+-------------+     +-------------+     +-------------+

Tabelas Globais (empresa_id = NULL):
+------------------+  +-------------+  +-------------+
| parametros_      |  | faixas_inss |  | faixas_irrf |
| sistema          |  +-------------+  +-------------+
+------------------+

+------------------------+
| entendimentos_         |
| tributacao             |
+------------------------+
```

### Descricao das Tabelas

#### empresas
Armazena as empresas cadastradas por cada usuario.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Chave primaria |
| user_id | uuid | Referencia ao auth.users |
| cnpj | text | CNPJ da empresa (14 digitos) |
| razao_social | text | Nome da empresa |
| created_at | timestamptz | Data de criacao |

#### rubricas
Tabela de rubricas (verbas) importadas do evento S-1010.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Chave primaria |
| empresa_id | uuid | FK para empresas |
| codigo | text | Codigo da rubrica |
| descricao | text | Descricao da rubrica |
| natureza | text | 'provento', 'desconto', 'informativo' |
| tipo | text | Codigo natureza eSocial |
| incid_inss | text | Codigo incidencia INSS (00=nao incide) |
| incid_irrf | text | Codigo incidencia IRRF |
| incid_fgts | text | Codigo incidencia FGTS |

#### colaboradores
Funcionarios extraidos dos eventos S-1200.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Chave primaria |
| empresa_id | uuid | FK para empresas |
| cpf | text | CPF do colaborador |
| nome | text | Nome completo |
| matricula | text | Matricula na empresa |

#### remuneracoes
Resumo mensal da remuneracao de cada colaborador.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Chave primaria |
| empresa_id | uuid | FK para empresas |
| colaborador_id | uuid | FK para colaboradores |
| importacao_id | uuid | FK para importacoes |
| competencia | text | Periodo no formato YYYY-MM |
| valor_bruto | numeric | Total de proventos |
| valor_descontos | numeric | Total de descontos |
| valor_liquido | numeric | Valor liquido |
| base_inss | numeric | Base de calculo INSS |
| base_irrf | numeric | Base de calculo IRRF |
| base_fgts | numeric | Base de calculo FGTS |

#### itens_remuneracao
Detalhamento de cada verba na remuneracao.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Chave primaria |
| remuneracao_id | uuid | FK para remuneracoes |
| rubrica_id | uuid | FK para rubricas (opcional) |
| codigo_rubrica | text | Codigo da rubrica |
| descricao | text | Descricao do item |
| natureza | text | 'provento' ou 'desconto' |
| referencia | numeric | Quantidade (horas, dias) |
| valor | numeric | Valor monetario |

#### divergencias
Inconsistencias identificadas pela auditoria.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Chave primaria |
| empresa_id | uuid | FK para empresas |
| remuneracao_id | uuid | FK para remuneracoes |
| item_remuneracao_id | uuid | FK para itens (opcional) |
| tipo | text | 'INSS', 'IRRF', 'FGTS', 'Rubrica' |
| descricao | text | Descricao da divergencia |
| valor_original | numeric | Valor importado |
| valor_recalculado | numeric | Valor calculado |
| diferenca | numeric | Diferenca entre valores |
| severidade | text | 'low', 'medium', 'high' |

#### apuracoes
Consolidacao mensal da auditoria.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Chave primaria |
| empresa_id | uuid | FK para empresas |
| competencia | text | Periodo YYYY-MM |
| total_bruto_original | numeric | Soma dos brutos importados |
| total_bruto_recalculado | numeric | Soma dos brutos recalculados |
| total_inss_original | numeric | INSS importado |
| total_inss_recalculado | numeric | INSS recalculado |
| total_irrf_original | numeric | IRRF importado |
| total_irrf_recalculado | numeric | IRRF recalculado |
| total_fgts_original | numeric | FGTS importado |
| total_fgts_recalculado | numeric | FGTS recalculado |
| total_divergencias | integer | Contagem de divergencias |

#### parametros_sistema
Parametros tributarios vigentes.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Chave primaria |
| empresa_id | uuid | NULL para parametros globais |
| vigencia_ano | integer | Ano de vigencia |
| vigencia_mes | integer | Mes de vigencia |
| salario_minimo | numeric | Salario minimo vigente |
| teto_inss | numeric | Teto de contribuicao INSS |
| aliquota_fgts | numeric | Aliquota FGTS (%) |
| deducao_dependente_irrf | numeric | Deducao por dependente |

#### faixas_inss
Tabela progressiva do INSS.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Chave primaria |
| empresa_id | uuid | NULL para faixas globais |
| ordem | integer | Ordem da faixa (1-4) |
| valor_limite | numeric | Limite superior da faixa |
| aliquota | numeric | Aliquota da faixa (%) |
| vigencia_ano | integer | Ano de vigencia |
| vigencia_mes | integer | Mes de vigencia |

#### faixas_irrf
Tabela progressiva do IRRF.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Chave primaria |
| empresa_id | uuid | NULL para faixas globais |
| ordem | integer | Ordem da faixa (1-5) |
| valor_limite | numeric | Limite superior (NULL = infinito) |
| aliquota | numeric | Aliquota da faixa (%) |
| valor_deducao | numeric | Deducao da faixa |
| vigencia_ano | integer | Ano de vigencia |
| vigencia_mes | integer | Mes de vigencia |

---

## Modulos e Componentes

### /src/lib/auditEngine.ts

Motor de auditoria responsavel pelo calculo de tributos e identificacao de divergencias.

#### Interfaces

```typescript
interface FaixaINSS {
  limite: number;    // Limite superior da faixa
  aliquota: number;  // Aliquota em percentual
}

interface FaixaIRRF {
  limite: number;    // Limite superior da faixa
  aliquota: number;  // Aliquota em percentual
  deducao: number;   // Valor de deducao da faixa
}

interface ParametrosSistema {
  salario_minimo: number;
  teto_inss: number;
  aliquota_fgts: number;
  deducao_dependente_irrf: number;
}

interface AuditResult {
  divergencias: Divergencia[];
  totalDivergencias: number;
  impactoFinanceiro: number;
}
```

#### Funcoes

##### calcularINSS(salario, faixas)
Calcula o INSS usando a tabela progressiva (4 faixas em 2024).

**Algoritmo:**
1. Inicializa INSS = 0 e salarioRestante = salario
2. Para cada faixa:
   - Calcula a base tributavel na faixa
   - Aplica a aliquota da faixa
   - Acumula o valor
3. Retorna o total arredondado em 2 casas decimais

**Parametros:**
- `salario`: Valor bruto do salario
- `faixas`: Array de faixas INSS (opcional, usa 2024 por padrao)

**Retorno:** Valor do INSS calculado

##### calcularIRRF(salario, inss, dependentes, faixas, deducaoPorDependente)
Calcula o IRRF usando a tabela progressiva (5 faixas em 2024).

**Algoritmo:**
1. Calcula base: salario - inss - (dependentes * deducao)
2. Identifica a faixa correspondente
3. Aplica: (base * aliquota) - deducao_faixa
4. Retorna max(0, valor arredondado)

**Parametros:**
- `salario`: Valor bruto
- `inss`: Valor do INSS ja calculado
- `dependentes`: Numero de dependentes (default: 0)
- `faixas`: Array de faixas IRRF
- `deducaoPorDependente`: Valor por dependente (default: R$ 189,59)

##### calcularFGTS(salario, aliquota)
Calcula o FGTS a 8% (aliquota padrao).

**Formula:** `salario * (aliquota / 100)`

##### runAudit(empresaId, competencia)
Executa a auditoria completa para uma empresa/competencia.

**Processo:**
1. Carrega parametros vigentes do banco
2. Busca todas as remuneracoes da competencia
3. Para cada remuneracao:
   - Remove divergencias anteriores
   - Recalcula bases a partir dos itens
   - Compara com valores importados
   - Cria divergencias se diferenca > 1%
4. Salva divergencias no banco
5. Atualiza tabela de apuracoes

**Tipos de Divergencias Detectadas:**
- **Rubrica**: Rubrica usada no S-1200 nao existe no S-1010
- **INSS**: Base de calculo do INSS divergente
- **IRRF**: Base de calculo do IRRF divergente
- **FGTS**: Base de calculo do FGTS divergente

---

### /src/lib/xmlParser.ts

Parser para eventos do eSocial (S-1010 e S-1200).

#### Funcoes

##### parseS1010(xmlContent)
Extrai rubricas do evento S-1010.

**Tags XML processadas:**
- `ideRubrica`: Identificacao da rubrica
- `dadosRubrica`: Dados da rubrica
- `codRubr`: Codigo da rubrica
- `dscRubr`: Descricao
- `natRubr`: Natureza da rubrica
- `tpRubr`: Tipo (1=provento, 2=desconto, 3=informativo)
- `codIncCP`: Incidencia INSS
- `codIncIRRF`: Incidencia IRRF
- `codIncFGTS`: Incidencia FGTS

**Retorno:** Array de `ParsedRubrica`

##### parseS1200(xmlContent)
Extrai remuneracoes do evento S-1200.

**Tags XML processadas:**
- `ideEvento/perApur`: Competencia (YYYY-MM)
- `ideTrabalhador/cpfTrab`: CPF do trabalhador
- `ideTrabalhador/nmTrab`: Nome do trabalhador
- `dmDev/ideDmDev`: Matricula
- `detVerbas/ideRubrica`: Identificacao da rubrica
- `detVerbas/qtdRubr`: Quantidade/referencia
- `detVerbas/vrRubr`: Valor

**Retorno:** Array de `ParsedRemuneracao`

##### detectEventType(xmlContent)
Identifica o tipo de evento eSocial no XML.

**Eventos reconhecidos:** S-1000 a S-5013 (40+ tipos)

**Eventos suportados para processamento:** S-1010, S-1200

##### isEventSupported(eventType)
Verifica se o evento e processavel pela aplicacao.

##### getEventDescription(eventType)
Retorna descricao legivel do tipo de evento.

---

### /src/lib/zipExtractor.ts

Utilitario para extracao de arquivos ZIP.

#### Funcoes

##### extractXmlsFromZip(file, onProgress)
Extrai todos os XMLs de um arquivo ZIP.

**Validacoes:**
- Tamanho maximo: 500MB
- Formato: Apenas arquivos .zip

**Processo:**
1. Valida tamanho do arquivo
2. Carrega ZIP com JSZip
3. Filtra apenas arquivos .xml
4. Extrai conteudo de cada XML
5. Retorna array com nome, caminho e conteudo

**Callback de progresso:** `(extracted, total) => void`

##### validateZipSize(file)
Valida se o arquivo ZIP esta dentro do limite.

##### isZipFile(file) / isXmlFile(fileName)
Validadores de tipo de arquivo.

---

### /src/lib/formatters.ts

Funcoes de formatacao para exibicao.

| Funcao | Entrada | Saida |
|--------|---------|-------|
| formatCurrency(value) | 1234.56 | R$ 1.234,56 |
| formatNumber(value) | 1234.56 | 1.234,56 |
| formatCPF(cpf) | 12345678901 | 123.456.789-01 |
| formatCNPJ(cnpj) | 12345678000199 | 12.345.678/0001-99 |
| formatCompetencia(comp) | 2024-01 | Janeiro de 2024 |
| formatCompetenciaShort(comp) | 2024-01 | 01/2024 |
| formatPercentage(value) | 0.155 | 15,50% |

---

### /src/contexts/AuthContext.tsx

Contexto de autenticacao e gestao de empresas.

#### Estado Gerenciado

```typescript
interface AuthContextType {
  user: User | null;          // Usuario autenticado
  session: Session | null;    // Sessao Supabase
  empresa: Empresa | null;    // Empresa selecionada
  empresas: Empresa[];        // Lista de empresas do usuario
  loading: boolean;           // Estado de carregamento
  signIn: (email, password) => Promise<{error}>;
  signUp: (email, password) => Promise<{error}>;
  signOut: () => Promise<void>;
  setEmpresa: (empresa) => void;
  loadEmpresas: () => Promise<void>;
}
```

#### Comportamento

1. **Inicializacao:**
   - Verifica sessao existente via `supabase.auth.getSession()`
   - Carrega empresas do usuario se autenticado
   - Seleciona primeira empresa como padrao

2. **onAuthStateChange:**
   - Monitora mudancas de autenticacao
   - Recarrega empresas ao fazer login
   - Limpa estado ao fazer logout

---

### /src/pages/ (Paginas)

#### LoginPage.tsx
Tela de login e registro com design moderno.

**Funcionalidades:**
- Login com email/senha
- Registro de nova conta
- Tratamento de erros
- Responsivo mobile/desktop

#### CompanySetupPage.tsx
Configuracao inicial de empresa para novos usuarios.

**Validacoes:**
- CNPJ com 14 digitos
- Razao social obrigatoria

#### DashboardPage.tsx
Dashboard principal com metricas consolidadas.

**Dados exibidos:**
- Total de colaboradores
- Folha bruta total
- Quantidade de divergencias
- Potencial de recuperacao

**Componentes:**
- Cards de KPI
- Tabela de apuracoes por competencia
- Grafico de divergencias por tipo

#### ImportPage.tsx
Interface de importacao de arquivos XML/ZIP.

**Recursos:**
- Drag-and-drop
- Extracao de ZIP com progresso
- Processamento em lote
- Historico de importacoes
- Funcao de limpeza de dados

**Fluxo de processamento:**
1. Detecta tipo do arquivo (XML/ZIP)
2. Se ZIP, extrai todos os XMLs
3. Para cada XML:
   - Detecta tipo de evento
   - Se suportado, processa
   - Se nao suportado, lista separadamente

#### MonthlyPayrollPage.tsx
Visao da folha de pagamento mensal.

**Funcionalidades:**
- Busca por nome
- Ordenacao por colunas
- Destaque de linhas com divergencias
- Navegacao para detalhe do colaborador

#### EmployeeDetailPage.tsx
Detalhamento completo da remuneracao do colaborador.

**Secoes:**
- Dados do colaborador
- Resumo financeiro (bruto, descontos, liquido)
- Bases tributarias (INSS, IRRF, FGTS)
- Lista de itens/verbas
- Divergencias encontradas

#### ParametrosPage.tsx
Visualizacao de parametros tributarios.

**Abas:**
- Geral: Salario minimo, teto INSS, aliquota FGTS
- INSS: Tabela de faixas
- IRRF: Tabela de faixas
- Entendimentos: Referencia de tributacao por rubrica

---

## Regras de Negocio

### Calculo de INSS (2024)

Tabela progressiva com 4 faixas:

| Faixa | Limite | Aliquota |
|-------|--------|----------|
| 1 | R$ 1.412,00 | 7,5% |
| 2 | R$ 2.666,68 | 9,0% |
| 3 | R$ 4.000,03 | 12,0% |
| 4 | R$ 7.786,02 | 14,0% |

**Exemplo de calculo para salario de R$ 5.000,00:**
```
Faixa 1: 1.412,00 * 7,5% = 105,90
Faixa 2: (2.666,68 - 1.412,00) * 9,0% = 112,92
Faixa 3: (4.000,03 - 2.666,68) * 12,0% = 160,00
Faixa 4: (5.000,00 - 4.000,03) * 14,0% = 139,99
TOTAL: R$ 518,81
```

### Calculo de IRRF (2024)

Tabela progressiva com 5 faixas:

| Faixa | Limite | Aliquota | Deducao |
|-------|--------|----------|---------|
| 1 | R$ 2.259,20 | Isento | - |
| 2 | R$ 2.826,65 | 7,5% | R$ 169,44 |
| 3 | R$ 3.751,05 | 15,0% | R$ 381,44 |
| 4 | R$ 4.664,68 | 22,5% | R$ 662,77 |
| 5 | Acima | 27,5% | R$ 896,00 |

**Base de calculo:** Salario - INSS - (Dependentes * R$ 189,59)

### Calculo de FGTS

Aliquota fixa de 8% sobre a remuneracao bruta.

### Incidencia de Tributos

A incidencia de cada tributo sobre uma rubrica e definida pelos codigos:
- **00**: Nao incide
- **Outros codigos**: Incide conforme legislacao

### Identificacao de Divergencias

Uma divergencia e criada quando:
```
|valor_recalculado - valor_original| > 1% * valor_original
```

Tolerancia de 1% para evitar falsos positivos por arredondamentos.

---

## Guia de Instalacao

### Pre-requisitos

- Node.js 18+
- NPM ou Yarn
- Conta no Supabase

### Passos

1. **Clone o repositorio**
```bash
git clone <repository-url>
cd project
```

2. **Instale as dependencias**
```bash
npm install
```

3. **Configure as variaveis de ambiente**

Crie um arquivo `.env` na raiz:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

4. **Execute as migracoes no Supabase**

Acesse o SQL Editor do Supabase e execute os arquivos de migracao em ordem.

5. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

### Scripts Disponiveis

| Script | Descricao |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de producao |
| `npm run preview` | Preview do build |
| `npm run lint` | Verificacao ESLint |
| `npm run typecheck` | Verificacao TypeScript |

---

## Consideracoes de Seguranca

### Row Level Security (RLS)

Todas as tabelas utilizam RLS para garantir isolamento de dados:

```sql
-- Exemplo de politica
CREATE POLICY "Usuarios podem ver suas empresas"
  ON empresas FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

### Autenticacao

- Autenticacao gerenciada pelo Supabase Auth
- Senhas com minimo de 6 caracteres
- Confirmacao de email desabilitada por padrao
- Sessoes JWT com expiracao automatica

### Validacoes

- CNPJ validado (14 digitos)
- Tamanho maximo de ZIP (500MB)
- Sanitizacao de inputs via TypeScript types

### Boas Praticas Implementadas

1. Chaves de API apenas no .env
2. Nao exposicao de erros detalhados ao usuario
3. Cascade deletes para manter integridade referencial
4. Indices em colunas frequentemente consultadas

---

## Proximos Passos e Melhorias Sugeridas

1. **Processamento de mais eventos eSocial** (S-1000, S-1005, S-2200)
2. **Export de relatorios** (PDF, Excel)
3. **Historico de alteracoes** (audit trail)
4. **Notificacoes** de novas divergencias
5. **API REST** para integracoes
6. **Testes automatizados** (Jest, Cypress)
7. **Cache de parametros** no frontend
8. **Paginacao** para grandes volumes

---

*Documentacao gerada em Janeiro de 2026*
*Versao 1.0*
