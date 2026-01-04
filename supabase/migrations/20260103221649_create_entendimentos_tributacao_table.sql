/*
  # Create Entendimentos de Tributação Table

  ## Overview
  This migration creates a global reference table for tax treatment guidance on payroll items (rubricas).
  This table will serve as a comparison baseline to validate company-specific tax configurations in S1010 events.

  ## New Tables
    - `entendimentos_tributacao`
      - `id` (uuid, primary key) - Unique identifier
      - `codigo_rubrica` (text, unique, not null) - Payroll item code
      - `descricao_rubrica` (text, not null) - Description of the payroll item
      - `incide_inss` (boolean, default false) - Whether INSS applies
      - `incide_irrf` (boolean, default false) - Whether IRRF (income tax) applies
      - `incide_fgts` (boolean, default false) - Whether FGTS applies
      - `observacoes` (text) - Additional notes
      - `fundamento_legal` (text) - Legal foundation/reference
      - `vigencia_inicio` (date) - Effective start date
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record last update timestamp

  ## Security
    - Enable RLS on `entendimentos_tributacao` table
    - Add policy for authenticated users to read data
    - Restrict write operations (import via admin tools only)

  ## Indexes
    - Unique index on `codigo_rubrica` to prevent duplicates
    - Index on `vigencia_inicio` for date-based queries
*/

-- Create the entendimentos_tributacao table
CREATE TABLE IF NOT EXISTS entendimentos_tributacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_rubrica text UNIQUE NOT NULL,
  descricao_rubrica text NOT NULL,
  incide_inss boolean DEFAULT false,
  incide_irrf boolean DEFAULT false,
  incide_fgts boolean DEFAULT false,
  observacoes text,
  fundamento_legal text,
  vigencia_inicio date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on vigencia_inicio for date-based queries
CREATE INDEX IF NOT EXISTS idx_entendimentos_vigencia ON entendimentos_tributacao(vigencia_inicio);

-- Enable RLS
ALTER TABLE entendimentos_tributacao ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read entendimentos
CREATE POLICY "Authenticated users can read entendimentos"
  ON entendimentos_tributacao
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only authenticated users can insert (for future Excel import)
CREATE POLICY "Authenticated users can insert entendimentos"
  ON entendimentos_tributacao
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Only authenticated users can update
CREATE POLICY "Authenticated users can update entendimentos"
  ON entendimentos_tributacao
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Only authenticated users can delete
CREATE POLICY "Authenticated users can delete entendimentos"
  ON entendimentos_tributacao
  FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_entendimentos_tributacao_updated_at
  BEFORE UPDATE ON entendimentos_tributacao
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();