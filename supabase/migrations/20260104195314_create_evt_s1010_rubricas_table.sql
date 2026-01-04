/*
  # Create S-1010 Event Table (Tabela de Rubricas)

  1. New Tables
    - `evt_s1010`
      - Stores eSocial S-1010 event data (Tabela de Rubricas)
      - Maintains exact layout from tb_esocial_unified structure
      - Adds identification columns: usuario_id, empresa_id, xml_id
      
  2. Columns
    - Metadata: id, xml_version, xml_parsing_timestamp
    - Identification: usuario_id, empresa_id, xml_id
    - Event Identification: tp_amb, proc_emi, ver_proc
    - Employer Identification: emp_tp_insc, emp_nr_insc
    - Rubric Operation: rub_operation_type, rub_cod_rubr, rub_ide_tab_rubr, rub_ini_valid, rub_fim_valid
    - Rubric Details: rub_dsc_rubr, rub_nat_rubr, rub_tp_rubr, rub_cod_inc_cp, rub_cod_inc_irrf, rub_cod_inc_fgts, rub_cod_inc_sind
    - Receipt & Processing: rec_tp_amb, rec_dh_recepcao, rec_versao_app_recepcao, rec_protocolo_envio, rec_cd_resposta, rec_desc_resposta, rec_dh_processamento, rec_nr_recibo, rec_hash
    - Complex Types: signature_transforms
    
  3. Indexes
    - Primary key on id
    - Foreign key indexes for empresa_id and usuario_id
    - Business logic indexes for common queries
    
  4. Security
    - Enable RLS on evt_s1010 table
    - Add policies for authenticated users to access their company's data
    - Use optimized RLS with (select auth.uid())
*/

-- ============================================================
-- CREATE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS evt_s1010 (
    -- Metadata Columns
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    xml_version VARCHAR(20) NOT NULL,
    xml_parsing_timestamp timestamptz DEFAULT now(),
    
    -- Identification Columns (ADDED)
    usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    xml_id VARCHAR(100) NOT NULL,
    
    -- Event Identification (ideEvento)
    tp_amb INTEGER,
    proc_emi INTEGER,
    ver_proc VARCHAR(100),
    
    -- Employer Identification (ideEmpregador)
    emp_tp_insc INTEGER,
    emp_nr_insc VARCHAR(20),
    
    -- Rubric Operation & Identification (Converged from inclusao/alteracao/exclusao)
    rub_operation_type VARCHAR(20), -- inclusao, alteracao, or exclusao
    rub_cod_rubr VARCHAR(50),
    rub_ide_tab_rubr VARCHAR(50),
    rub_ini_valid VARCHAR(7), -- Format YYYY-MM
    rub_fim_valid VARCHAR(7), -- Format YYYY-MM (Nullable)
    
    -- Rubric Details (dadosRubrica)
    rub_dsc_rubr TEXT,
    rub_nat_rubr NUMERIC,
    rub_tp_rubr INTEGER,
    rub_cod_inc_cp INTEGER,
    rub_cod_inc_irrf INTEGER,
    rub_cod_inc_fgts INTEGER,
    rub_cod_inc_sind INTEGER,
    
    -- Receipt & Processing (recibo/retornoEvento)
    rec_tp_amb INTEGER,
    rec_dh_recepcao timestamptz,
    rec_versao_app_recepcao VARCHAR(50),
    rec_protocolo_envio VARCHAR(100),
    rec_cd_resposta INTEGER,
    rec_desc_resposta TEXT,
    rec_dh_processamento timestamptz,
    rec_nr_recibo VARCHAR(100),
    rec_hash TEXT,
    
    -- Complex Types / Lists
    signature_transforms JSONB,
    
    -- Audit Columns
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- ADD COMMENTS
-- ============================================================

COMMENT ON TABLE evt_s1010 IS 'Armazena eventos S-1010 do eSocial - Tabela de Rubricas da folha de pagamento';

COMMENT ON COLUMN evt_s1010.usuario_id IS 'Usuário que processou o XML do eSocial';
COMMENT ON COLUMN evt_s1010.empresa_id IS 'Empresa à qual este evento pertence';
COMMENT ON COLUMN evt_s1010.xml_id IS 'Identificador único do XML processado';

COMMENT ON COLUMN evt_s1010.rub_operation_type IS 'Tipo de operação: inclusao, alteracao ou exclusao';
COMMENT ON COLUMN evt_s1010.rub_cod_rubr IS 'Código da rubrica atribuído pela empresa';
COMMENT ON COLUMN evt_s1010.rub_ide_tab_rubr IS 'Identificador da tabela de rubricas';
COMMENT ON COLUMN evt_s1010.rub_ini_valid IS 'Início da validade (formato YYYY-MM)';
COMMENT ON COLUMN evt_s1010.rub_fim_valid IS 'Fim da validade (formato YYYY-MM)';

COMMENT ON COLUMN evt_s1010.rub_dsc_rubr IS 'Descrição da rubrica';
COMMENT ON COLUMN evt_s1010.rub_nat_rubr IS 'Natureza da rubrica conforme tabela 01 do eSocial';
COMMENT ON COLUMN evt_s1010.rub_tp_rubr IS 'Tipo da rubrica (1-Vencimento, 2-Desconto, 3-Informativo, 4-Informativo dedutores)';
COMMENT ON COLUMN evt_s1010.rub_cod_inc_cp IS 'Código de incidência tributária da rubrica para a Previdência Social';
COMMENT ON COLUMN evt_s1010.rub_cod_inc_irrf IS 'Código de incidência tributária da rubrica para o IRRF';
COMMENT ON COLUMN evt_s1010.rub_cod_inc_fgts IS 'Código de incidência da rubrica para o FGTS';
COMMENT ON COLUMN evt_s1010.rub_cod_inc_sind IS 'Código de incidência da rubrica para contribuição sindical';

-- ============================================================
-- CREATE INDEXES
-- ============================================================

-- Foreign key indexes (for performance)
CREATE INDEX IF NOT EXISTS idx_evt_s1010_empresa_id 
  ON evt_s1010(empresa_id);

CREATE INDEX IF NOT EXISTS idx_evt_s1010_usuario_id 
  ON evt_s1010(usuario_id);

-- Business logic indexes
CREATE INDEX IF NOT EXISTS idx_evt_s1010_xml_id 
  ON evt_s1010(xml_id);

CREATE INDEX IF NOT EXISTS idx_evt_s1010_cod_rubr 
  ON evt_s1010(rub_cod_rubr);

CREATE INDEX IF NOT EXISTS idx_evt_s1010_ide_tab_rubr 
  ON evt_s1010(rub_ide_tab_rubr);

CREATE INDEX IF NOT EXISTS idx_evt_s1010_ini_valid 
  ON evt_s1010(rub_ini_valid);

CREATE INDEX IF NOT EXISTS idx_evt_s1010_operation 
  ON evt_s1010(rub_operation_type);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_evt_s1010_empresa_cod_rubr 
  ON evt_s1010(empresa_id, rub_cod_rubr);

CREATE INDEX IF NOT EXISTS idx_evt_s1010_empresa_validade 
  ON evt_s1010(empresa_id, rub_ini_valid, rub_fim_valid);

-- ============================================================
-- CREATE TRIGGER FOR UPDATED_AT
-- ============================================================

CREATE TRIGGER trigger_evt_s1010_updated_at
  BEFORE UPDATE ON evt_s1010
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE evt_s1010 ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CREATE RLS POLICIES
-- ============================================================

CREATE POLICY "Users can view S-1010 events of own companies"
  ON evt_s1010
  FOR SELECT
  TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can insert S-1010 events for own companies"
  ON evt_s1010
  FOR INSERT
  TO authenticated
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can update S-1010 events of own companies"
  ON evt_s1010
  FOR UPDATE
  TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())))
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can delete S-1010 events of own companies"
  ON evt_s1010
  FOR DELETE
  TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));