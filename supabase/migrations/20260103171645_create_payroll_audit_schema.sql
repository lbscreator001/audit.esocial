/*
  # Payroll Audit System Schema

  1. New Tables
    - `empresas` - Company data (CNPJ, name)
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `cnpj` (text, unique)
      - `razao_social` (text)
      - `created_at` (timestamptz)
    
    - `rubricas` - Rubrics table from S-1010 event
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, references empresas)
      - `codigo` (text) - rubric code
      - `descricao` (text) - description
      - `natureza` (text) - nature (provento/desconto)
      - `tipo` (text) - type
      - `incid_inss` (text) - INSS incidence
      - `incid_irrf` (text) - IRRF incidence
      - `incid_fgts` (text) - FGTS incidence
      - `created_at` (timestamptz)
    
    - `colaboradores` - Employees extracted from S-1200
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, references empresas)
      - `cpf` (text)
      - `nome` (text)
      - `matricula` (text)
      - `created_at` (timestamptz)
    
    - `importacoes` - XML import history
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, references empresas)
      - `tipo_evento` (text) - S-1010 or S-1200
      - `nome_arquivo` (text)
      - `competencia` (text) - period (YYYY-MM)
      - `status` (text) - pending, processing, success, error
      - `registros_processados` (integer)
      - `erros` (jsonb)
      - `created_at` (timestamptz)
    
    - `remuneracoes` - Monthly remuneration from S-1200
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, references empresas)
      - `colaborador_id` (uuid, references colaboradores)
      - `importacao_id` (uuid, references importacoes)
      - `competencia` (text) - YYYY-MM
      - `valor_bruto` (numeric)
      - `valor_descontos` (numeric)
      - `valor_liquido` (numeric)
      - `base_inss` (numeric)
      - `base_irrf` (numeric)
      - `base_fgts` (numeric)
      - `created_at` (timestamptz)
    
    - `itens_remuneracao` - Each payroll item/rubric
      - `id` (uuid, primary key)
      - `remuneracao_id` (uuid, references remuneracoes)
      - `rubrica_id` (uuid, references rubricas, nullable)
      - `codigo_rubrica` (text)
      - `descricao` (text)
      - `natureza` (text)
      - `referencia` (numeric) - hours, days, percentage
      - `valor` (numeric)
      - `created_at` (timestamptz)
    
    - `divergencias` - Identified discrepancies
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, references empresas)
      - `remuneracao_id` (uuid, references remuneracoes)
      - `item_remuneracao_id` (uuid, references itens_remuneracao, nullable)
      - `tipo` (text) - type of discrepancy
      - `descricao` (text)
      - `valor_original` (numeric)
      - `valor_recalculado` (numeric)
      - `diferenca` (numeric)
      - `severidade` (text) - low, medium, high
      - `created_at` (timestamptz)
    
    - `apuracoes` - Recalculated values
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, references empresas)
      - `competencia` (text)
      - `total_bruto_original` (numeric)
      - `total_bruto_recalculado` (numeric)
      - `total_inss_original` (numeric)
      - `total_inss_recalculado` (numeric)
      - `total_irrf_original` (numeric)
      - `total_irrf_recalculado` (numeric)
      - `total_fgts_original` (numeric)
      - `total_fgts_recalculado` (numeric)
      - `total_divergencias` (integer)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create empresas table
CREATE TABLE IF NOT EXISTS empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cnpj text NOT NULL,
  razao_social text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, cnpj)
);

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own companies"
  ON empresas FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own companies"
  ON empresas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own companies"
  ON empresas FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own companies"
  ON empresas FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create rubricas table
CREATE TABLE IF NOT EXISTS rubricas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
  codigo text NOT NULL,
  descricao text NOT NULL,
  natureza text NOT NULL DEFAULT 'provento',
  tipo text,
  incid_inss text DEFAULT '00',
  incid_irrf text DEFAULT '00',
  incid_fgts text DEFAULT '00',
  created_at timestamptz DEFAULT now(),
  UNIQUE(empresa_id, codigo)
);

ALTER TABLE rubricas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rubrics of own companies"
  ON rubricas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = rubricas.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert rubrics for own companies"
  ON rubricas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = rubricas.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update rubrics of own companies"
  ON rubricas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = rubricas.empresa_id
      AND empresas.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = rubricas.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete rubrics of own companies"
  ON rubricas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = rubricas.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

-- Create colaboradores table
CREATE TABLE IF NOT EXISTS colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
  cpf text NOT NULL,
  nome text NOT NULL,
  matricula text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(empresa_id, cpf)
);

ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view employees of own companies"
  ON colaboradores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = colaboradores.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert employees for own companies"
  ON colaboradores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = colaboradores.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update employees of own companies"
  ON colaboradores FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = colaboradores.empresa_id
      AND empresas.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = colaboradores.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete employees of own companies"
  ON colaboradores FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = colaboradores.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

-- Create importacoes table
CREATE TABLE IF NOT EXISTS importacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
  tipo_evento text NOT NULL,
  nome_arquivo text NOT NULL,
  competencia text,
  status text NOT NULL DEFAULT 'pending',
  registros_processados integer DEFAULT 0,
  erros jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE importacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view imports of own companies"
  ON importacoes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = importacoes.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert imports for own companies"
  ON importacoes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = importacoes.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update imports of own companies"
  ON importacoes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = importacoes.empresa_id
      AND empresas.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = importacoes.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete imports of own companies"
  ON importacoes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = importacoes.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

-- Create remuneracoes table
CREATE TABLE IF NOT EXISTS remuneracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
  colaborador_id uuid REFERENCES colaboradores(id) ON DELETE CASCADE NOT NULL,
  importacao_id uuid REFERENCES importacoes(id) ON DELETE SET NULL,
  competencia text NOT NULL,
  valor_bruto numeric DEFAULT 0,
  valor_descontos numeric DEFAULT 0,
  valor_liquido numeric DEFAULT 0,
  base_inss numeric DEFAULT 0,
  base_irrf numeric DEFAULT 0,
  base_fgts numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(colaborador_id, competencia)
);

ALTER TABLE remuneracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view remunerations of own companies"
  ON remuneracoes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = remuneracoes.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert remunerations for own companies"
  ON remuneracoes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = remuneracoes.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update remunerations of own companies"
  ON remuneracoes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = remuneracoes.empresa_id
      AND empresas.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = remuneracoes.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete remunerations of own companies"
  ON remuneracoes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = remuneracoes.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

-- Create itens_remuneracao table
CREATE TABLE IF NOT EXISTS itens_remuneracao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remuneracao_id uuid REFERENCES remuneracoes(id) ON DELETE CASCADE NOT NULL,
  rubrica_id uuid REFERENCES rubricas(id) ON DELETE SET NULL,
  codigo_rubrica text NOT NULL,
  descricao text,
  natureza text NOT NULL DEFAULT 'provento',
  referencia numeric DEFAULT 0,
  valor numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE itens_remuneracao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view remuneration items of own companies"
  ON itens_remuneracao FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM remuneracoes
      JOIN empresas ON empresas.id = remuneracoes.empresa_id
      WHERE remuneracoes.id = itens_remuneracao.remuneracao_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert remuneration items for own companies"
  ON itens_remuneracao FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM remuneracoes
      JOIN empresas ON empresas.id = remuneracoes.empresa_id
      WHERE remuneracoes.id = itens_remuneracao.remuneracao_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update remuneration items of own companies"
  ON itens_remuneracao FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM remuneracoes
      JOIN empresas ON empresas.id = remuneracoes.empresa_id
      WHERE remuneracoes.id = itens_remuneracao.remuneracao_id
      AND empresas.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM remuneracoes
      JOIN empresas ON empresas.id = remuneracoes.empresa_id
      WHERE remuneracoes.id = itens_remuneracao.remuneracao_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete remuneration items of own companies"
  ON itens_remuneracao FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM remuneracoes
      JOIN empresas ON empresas.id = remuneracoes.empresa_id
      WHERE remuneracoes.id = itens_remuneracao.remuneracao_id
      AND empresas.user_id = auth.uid()
    )
  );

-- Create divergencias table
CREATE TABLE IF NOT EXISTS divergencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
  remuneracao_id uuid REFERENCES remuneracoes(id) ON DELETE CASCADE NOT NULL,
  item_remuneracao_id uuid REFERENCES itens_remuneracao(id) ON DELETE SET NULL,
  tipo text NOT NULL,
  descricao text NOT NULL,
  valor_original numeric DEFAULT 0,
  valor_recalculado numeric DEFAULT 0,
  diferenca numeric DEFAULT 0,
  severidade text NOT NULL DEFAULT 'medium',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE divergencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view discrepancies of own companies"
  ON divergencias FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = divergencias.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert discrepancies for own companies"
  ON divergencias FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = divergencias.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update discrepancies of own companies"
  ON divergencias FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = divergencias.empresa_id
      AND empresas.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = divergencias.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete discrepancies of own companies"
  ON divergencias FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = divergencias.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

-- Create apuracoes table
CREATE TABLE IF NOT EXISTS apuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
  competencia text NOT NULL,
  total_bruto_original numeric DEFAULT 0,
  total_bruto_recalculado numeric DEFAULT 0,
  total_inss_original numeric DEFAULT 0,
  total_inss_recalculado numeric DEFAULT 0,
  total_irrf_original numeric DEFAULT 0,
  total_irrf_recalculado numeric DEFAULT 0,
  total_fgts_original numeric DEFAULT 0,
  total_fgts_recalculado numeric DEFAULT 0,
  total_divergencias integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(empresa_id, competencia)
);

ALTER TABLE apuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view calculations of own companies"
  ON apuracoes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = apuracoes.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert calculations for own companies"
  ON apuracoes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = apuracoes.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update calculations of own companies"
  ON apuracoes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = apuracoes.empresa_id
      AND empresas.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = apuracoes.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete calculations of own companies"
  ON apuracoes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = apuracoes.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rubricas_empresa ON rubricas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa ON colaboradores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_importacoes_empresa ON importacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_remuneracoes_empresa ON remuneracoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_remuneracoes_colaborador ON remuneracoes(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_remuneracoes_competencia ON remuneracoes(competencia);
CREATE INDEX IF NOT EXISTS idx_itens_remuneracao_remuneracao ON itens_remuneracao(remuneracao_id);
CREATE INDEX IF NOT EXISTS idx_divergencias_empresa ON divergencias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_divergencias_remuneracao ON divergencias(remuneracao_id);
CREATE INDEX IF NOT EXISTS idx_apuracoes_empresa ON apuracoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_apuracoes_competencia ON apuracoes(competencia);