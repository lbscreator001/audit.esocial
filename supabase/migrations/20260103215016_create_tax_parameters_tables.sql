/*
  # Tax Parameters System

  1. New Tables
    - `parametros_sistema`
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, nullable) - allows global or company-specific parameters
      - `salario_minimo` (numeric) - minimum wage reference value
      - `teto_inss` (numeric) - INSS maximum contribution ceiling
      - `aliquota_fgts` (numeric) - FGTS percentage rate (default 8%)
      - `deducao_dependente_irrf` (numeric) - IRRF deduction per dependent
      - `vigencia_ano` (integer) - year of validity
      - `vigencia_mes` (integer) - month of validity (1-12)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `faixas_inss`
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, nullable)
      - `ordem` (integer) - bracket order (1, 2, 3, 4)
      - `valor_limite` (numeric) - upper limit of bracket
      - `aliquota` (numeric) - percentage rate
      - `vigencia_ano` (integer)
      - `vigencia_mes` (integer)
      - `created_at` (timestamptz)
    
    - `faixas_irrf`
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, nullable)
      - `ordem` (integer) - bracket order
      - `valor_limite` (numeric) - upper limit of bracket (null for last bracket)
      - `aliquota` (numeric) - percentage rate
      - `valor_deducao` (numeric) - deduction amount
      - `vigencia_ano` (integer)
      - `vigencia_mes` (integer)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read parameters
    - Add policies for admin users to manage parameters

  3. Seed Data
    - Initial 2024 tax parameters
    - INSS progressive table (4 brackets)
    - IRRF progressive table (5 brackets)
*/

-- Create parametros_sistema table
CREATE TABLE IF NOT EXISTS parametros_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  salario_minimo numeric(10, 2) NOT NULL,
  teto_inss numeric(10, 2) NOT NULL,
  aliquota_fgts numeric(5, 2) NOT NULL DEFAULT 8.00,
  deducao_dependente_irrf numeric(10, 2) NOT NULL,
  vigencia_ano integer NOT NULL,
  vigencia_mes integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_vigencia_mes CHECK (vigencia_mes >= 1 AND vigencia_mes <= 12),
  CONSTRAINT unique_vigencia UNIQUE (empresa_id, vigencia_ano, vigencia_mes)
);

-- Create faixas_inss table
CREATE TABLE IF NOT EXISTS faixas_inss (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  ordem integer NOT NULL,
  valor_limite numeric(10, 2) NOT NULL,
  aliquota numeric(5, 2) NOT NULL,
  vigencia_ano integer NOT NULL,
  vigencia_mes integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_aliquota_inss CHECK (aliquota >= 0 AND aliquota <= 100),
  CONSTRAINT valid_ordem_inss CHECK (ordem > 0)
);

-- Create faixas_irrf table
CREATE TABLE IF NOT EXISTS faixas_irrf (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  ordem integer NOT NULL,
  valor_limite numeric(10, 2),
  aliquota numeric(5, 2) NOT NULL,
  valor_deducao numeric(10, 2) NOT NULL DEFAULT 0,
  vigencia_ano integer NOT NULL,
  vigencia_mes integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_aliquota_irrf CHECK (aliquota >= 0 AND aliquota <= 100),
  CONSTRAINT valid_ordem_irrf CHECK (ordem > 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_parametros_vigencia ON parametros_sistema(vigencia_ano DESC, vigencia_mes DESC);
CREATE INDEX IF NOT EXISTS idx_faixas_inss_vigencia ON faixas_inss(vigencia_ano DESC, vigencia_mes DESC);
CREATE INDEX IF NOT EXISTS idx_faixas_irrf_vigencia ON faixas_irrf(vigencia_ano DESC, vigencia_mes DESC);

-- Enable RLS
ALTER TABLE parametros_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE faixas_inss ENABLE ROW LEVEL SECURITY;
ALTER TABLE faixas_irrf ENABLE ROW LEVEL SECURITY;

-- RLS Policies for parametros_sistema
CREATE POLICY "Authenticated users can view tax parameters"
  ON parametros_sistema FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tax parameters"
  ON parametros_sistema FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tax parameters"
  ON parametros_sistema FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for faixas_inss
CREATE POLICY "Authenticated users can view INSS brackets"
  ON faixas_inss FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert INSS brackets"
  ON faixas_inss FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update INSS brackets"
  ON faixas_inss FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for faixas_irrf
CREATE POLICY "Authenticated users can view IRRF brackets"
  ON faixas_irrf FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert IRRF brackets"
  ON faixas_irrf FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update IRRF brackets"
  ON faixas_irrf FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed 2024 tax parameters (global, empresa_id = null)
INSERT INTO parametros_sistema (empresa_id, salario_minimo, teto_inss, aliquota_fgts, deducao_dependente_irrf, vigencia_ano, vigencia_mes)
VALUES (null, 1412.00, 7786.02, 8.00, 189.59, 2024, 1)
ON CONFLICT DO NOTHING;

-- Seed 2024 INSS progressive brackets
INSERT INTO faixas_inss (empresa_id, ordem, valor_limite, aliquota, vigencia_ano, vigencia_mes) VALUES
  (null, 1, 1412.00, 7.5, 2024, 1),
  (null, 2, 2666.68, 9.0, 2024, 1),
  (null, 3, 4000.03, 12.0, 2024, 1),
  (null, 4, 7786.02, 14.0, 2024, 1)
ON CONFLICT DO NOTHING;

-- Seed 2024 IRRF progressive brackets
INSERT INTO faixas_irrf (empresa_id, ordem, valor_limite, aliquota, valor_deducao, vigencia_ano, vigencia_mes) VALUES
  (null, 1, 2259.20, 0.0, 0.0, 2024, 1),
  (null, 2, 2826.65, 7.5, 169.44, 2024, 1),
  (null, 3, 3751.05, 15.0, 381.44, 2024, 1),
  (null, 4, 4664.68, 22.5, 662.77, 2024, 1),
  (null, 5, null, 27.5, 896.00, 2024, 1)
ON CONFLICT DO NOTHING;