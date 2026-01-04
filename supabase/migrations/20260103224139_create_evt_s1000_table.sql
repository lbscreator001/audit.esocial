/*
  # Create S-1000 Event Table (Employer Information)

  1. New Tables
    - `evt_s1000`
      - Stores S-1000 event data (employer/company information from eSocial)
      - Fields include:
        - Control and identification (id_evento, tp_insc, nr_insc, tipo_operacao)
        - Validity period (ini_valid, fim_valid)
        - Main taxation data (class_trib, ind_des_folha, ind_opt_reg_eletron, ind_porte)
        - Specific indicators (ind_coop, ind_constr, ind_opc_cp, cnpj_efr)
        - Exemptions (isencao_nr_certif, isencao_dt_venc)
        - Import audit (data_importacao, empresa_id)

  2. Security
    - Enable RLS on `evt_s1000` table
    - Add policies for authenticated users to manage their company data

  3. Important Notes
    - S-1000 event contains employer/company identification and classification information
    - Each company (empresa) can have multiple S-1000 records for different validity periods
    - tipo_operacao can be: 'inclusao', 'alteracao', or 'exclusao'
*/

CREATE TABLE IF NOT EXISTS evt_s1000 (
    id_evento VARCHAR(36) PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tp_insc CHAR(1) NOT NULL,
    nr_insc VARCHAR(14) NOT NULL,
    tipo_operacao VARCHAR(10) NOT NULL,
    ini_valid CHAR(7) NOT NULL,
    fim_valid CHAR(7),
    class_trib CHAR(2),
    ind_des_folha CHAR(1),
    ind_opt_reg_eletron CHAR(1),
    ind_porte CHAR(1),
    ind_coop CHAR(1),
    ind_constr CHAR(1),
    ind_opc_cp CHAR(1),
    cnpj_efr VARCHAR(14),
    isencao_nr_certif VARCHAR(40),
    isencao_dt_venc DATE,
    data_importacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT evt_s1000_tipo_operacao_check CHECK (tipo_operacao IN ('inclusao', 'alteracao', 'exclusao'))
);

CREATE INDEX IF NOT EXISTS idx_evt_s1000_empresa_id ON evt_s1000(empresa_id);
CREATE INDEX IF NOT EXISTS idx_evt_s1000_nr_insc ON evt_s1000(nr_insc);
CREATE INDEX IF NOT EXISTS idx_evt_s1000_ini_valid ON evt_s1000(ini_valid);

ALTER TABLE evt_s1000 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company S-1000 events"
  ON evt_s1000 FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = evt_s1000.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert S-1000 events for their companies"
  ON evt_s1000 FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = evt_s1000.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update S-1000 events for their companies"
  ON evt_s1000 FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = evt_s1000.empresa_id
      AND empresas.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = evt_s1000.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete S-1000 events for their companies"
  ON evt_s1000 FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = evt_s1000.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );