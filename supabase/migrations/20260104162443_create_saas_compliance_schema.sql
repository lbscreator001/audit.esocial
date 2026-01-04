/*
  # Transformacao SaaS Compliance - Schema de Auditoria Tributaria

  ## Objetivo
  Preparar o banco de dados para suportar auditoria tributaria completa com:
  - Source of Truth (base de conhecimento de rubricas)
  - Processos judiciais (S-1070)
  - Dados da empresa para auditoria (S-1000/S-1005)
  - Classificacao de divergencias como Risco vs Oportunidade

  ## Novas Tabelas
  1. `base_conhecimento_rubricas` - Parametrizacao legal padrao (Source of Truth)
  2. `evt_s1070` - Processos administrativos/judiciais
  3. `dados_empresa_auditoria` - Informacoes tributarias da empresa

  ## Alteracoes
  - Tabela `divergencias`: novos campos para classificacao de impacto

  ## Seguranca
  - RLS habilitado em todas as tabelas
  - Politicas restritivas por empresa
*/

-- =============================================================================
-- TABELA: base_conhecimento_rubricas (Source of Truth)
-- Armazena a parametrizacao legal padrao para cada natureza de rubrica
-- =============================================================================
CREATE TABLE IF NOT EXISTS base_conhecimento_rubricas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  natureza_rubrica text NOT NULL UNIQUE,
  descricao_padrao text NOT NULL,
  incid_inss_padrao text NOT NULL DEFAULT '00',
  incid_irrf_padrao text NOT NULL DEFAULT '00',
  incid_fgts_padrao text NOT NULL DEFAULT '00',
  fundamentacao_legal text,
  observacoes text,
  vigencia_inicio date DEFAULT '2000-01-01',
  vigencia_fim date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE base_conhecimento_rubricas IS 'Source of Truth - Parametrizacao legal padrao para cada natureza de rubrica conforme legislacao vigente';
COMMENT ON COLUMN base_conhecimento_rubricas.natureza_rubrica IS 'Codigo da natureza conforme tabela eSocial (ex: 1000, 1201, 9201)';
COMMENT ON COLUMN base_conhecimento_rubricas.incid_inss_padrao IS 'Incidencia INSS padrao conforme legislacao (00=nao incide)';
COMMENT ON COLUMN base_conhecimento_rubricas.fundamentacao_legal IS 'Base legal (ex: Art. 28, Lei 8.212/91)';

-- Indice para busca por natureza
CREATE INDEX IF NOT EXISTS idx_base_conhecimento_natureza ON base_conhecimento_rubricas(natureza_rubrica);

-- RLS - Tabela global, leitura para todos autenticados
ALTER TABLE base_conhecimento_rubricas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados podem ler base de conhecimento"
  ON base_conhecimento_rubricas FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- TABELA: evt_s1070 (Processos Administrativos/Judiciais)
-- Armazena processos que podem justificar diferencas de tributacao
-- =============================================================================
CREATE TABLE IF NOT EXISTS evt_s1070 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  id_evento text,
  nr_processo text NOT NULL,
  tp_proc integer NOT NULL,
  ind_suspensao integer,
  cod_susp text,
  ind_decisao text,
  tp_insc_estab integer,
  nr_insc_estab text,
  uf_vara text,
  tp_vara integer,
  ext_decisao text,
  obs_processo text,
  dt_inicio date,
  dt_fim date,
  ini_valid text,
  fim_valid text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT evt_s1070_tp_proc_check CHECK (tp_proc IN (1, 2, 3, 4)),
  CONSTRAINT evt_s1070_ind_suspensao_check CHECK (ind_suspensao IS NULL OR ind_suspensao IN (1, 2, 3, 4, 5, 90, 91, 92))
);

COMMENT ON TABLE evt_s1070 IS 'Eventos S-1070 - Processos Administrativos/Judiciais que podem justificar suspensao de tributos';
COMMENT ON COLUMN evt_s1070.nr_processo IS 'Numero do processo administrativo ou judicial';
COMMENT ON COLUMN evt_s1070.tp_proc IS 'Tipo: 1=Administrativo, 2=Judicial, 3=FAP, 4=Outro';
COMMENT ON COLUMN evt_s1070.ind_suspensao IS 'Indicador de suspensao da exigibilidade';
COMMENT ON COLUMN evt_s1070.cod_susp IS 'Codigo de suspensao atribuido pelo empregador';

-- Indices para buscas frequentes
CREATE INDEX IF NOT EXISTS idx_evt_s1070_empresa ON evt_s1070(empresa_id);
CREATE INDEX IF NOT EXISTS idx_evt_s1070_nr_processo ON evt_s1070(nr_processo);
CREATE INDEX IF NOT EXISTS idx_evt_s1070_ind_suspensao ON evt_s1070(ind_suspensao);

-- RLS
ALTER TABLE evt_s1070 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios podem ver processos de suas empresas"
  ON evt_s1070 FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = evt_s1070.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios podem inserir processos em suas empresas"
  ON evt_s1070 FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = evt_s1070.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios podem atualizar processos de suas empresas"
  ON evt_s1070 FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = evt_s1070.empresa_id
      AND empresas.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = evt_s1070.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios podem deletar processos de suas empresas"
  ON evt_s1070 FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = evt_s1070.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

-- =============================================================================
-- TABELA: dados_empresa_auditoria (Informacoes Tributarias S-1000/S-1005)
-- Armazena dados necessarios para calculo de encargos patronais
-- =============================================================================
CREATE TABLE IF NOT EXISTS dados_empresa_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  classificacao_tributaria text NOT NULL,
  rat_original numeric(5,2) DEFAULT 2.00,
  fap numeric(5,4) DEFAULT 1.0000,
  rat_ajustado numeric(5,2) GENERATED ALWAYS AS (rat_original * fap) STORED,
  fpas text,
  ind_desoneracao boolean DEFAULT false,
  ind_coop integer,
  ind_constr integer,
  ind_opt_reg_eletron integer,
  info_complementar jsonb,
  ini_valid text,
  fim_valid text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT dados_empresa_classificacao_check CHECK (
    classificacao_tributaria IN (
      '01', '02', '03', '04', '06', '07', '08', '09', '10', '11',
      '13', '14', '21', '22', '60', '70', '80', '85', '99'
    )
  )
);

COMMENT ON TABLE dados_empresa_auditoria IS 'Dados tributarios da empresa extraidos de S-1000/S-1005 para calculo de encargos';
COMMENT ON COLUMN dados_empresa_auditoria.classificacao_tributaria IS 'Classificacao tributaria conforme tabela 08 eSocial';
COMMENT ON COLUMN dados_empresa_auditoria.rat_original IS 'RAT original (1%, 2% ou 3%) conforme CNAE';
COMMENT ON COLUMN dados_empresa_auditoria.fap IS 'Fator Acidentario de Prevencao (0.5 a 2.0)';
COMMENT ON COLUMN dados_empresa_auditoria.rat_ajustado IS 'RAT x FAP - Aliquota efetiva para SAT';
COMMENT ON COLUMN dados_empresa_auditoria.ind_desoneracao IS 'Indica se empresa esta na desoneracao da folha';

-- Indices
CREATE INDEX IF NOT EXISTS idx_dados_empresa_auditoria_empresa ON dados_empresa_auditoria(empresa_id);

-- Constraint de unicidade por empresa e vigencia
CREATE UNIQUE INDEX IF NOT EXISTS idx_dados_empresa_auditoria_unique 
  ON dados_empresa_auditoria(empresa_id, ini_valid) 
  WHERE fim_valid IS NULL;

-- RLS
ALTER TABLE dados_empresa_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios podem ver dados de auditoria de suas empresas"
  ON dados_empresa_auditoria FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = dados_empresa_auditoria.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios podem inserir dados de auditoria em suas empresas"
  ON dados_empresa_auditoria FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = dados_empresa_auditoria.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios podem atualizar dados de auditoria de suas empresas"
  ON dados_empresa_auditoria FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = dados_empresa_auditoria.empresa_id
      AND empresas.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = dados_empresa_auditoria.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios podem deletar dados de auditoria de suas empresas"
  ON dados_empresa_auditoria FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = dados_empresa_auditoria.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

-- =============================================================================
-- ALTERACOES: Tabela divergencias
-- Adiciona campos para classificacao de impacto financeiro
-- =============================================================================
DO $$
BEGIN
  -- Adiciona coluna tipo_impacto se nao existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'divergencias' AND column_name = 'tipo_impacto'
  ) THEN
    ALTER TABLE divergencias ADD COLUMN tipo_impacto text DEFAULT 'informativo';
    ALTER TABLE divergencias ADD CONSTRAINT divergencias_tipo_impacto_check 
      CHECK (tipo_impacto IN ('risco', 'oportunidade', 'informativo'));
  END IF;

  -- Adiciona coluna tributo_afetado se nao existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'divergencias' AND column_name = 'tributo_afetado'
  ) THEN
    ALTER TABLE divergencias ADD COLUMN tributo_afetado text;
    ALTER TABLE divergencias ADD CONSTRAINT divergencias_tributo_afetado_check 
      CHECK (tributo_afetado IS NULL OR tributo_afetado IN (
        'INSS_PATRONAL', 'INSS_SEGURADO', 'INSS_RAT', 'INSS_TERCEIROS',
        'FGTS', 'IRRF', 'CSLL', 'MULTIPLO'
      ));
  END IF;

  -- Adiciona coluna fundamento_legal se nao existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'divergencias' AND column_name = 'fundamento_legal'
  ) THEN
    ALTER TABLE divergencias ADD COLUMN fundamento_legal text;
  END IF;

  -- Adiciona coluna status_analise se nao existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'divergencias' AND column_name = 'status_analise'
  ) THEN
    ALTER TABLE divergencias ADD COLUMN status_analise text DEFAULT 'pendente';
    ALTER TABLE divergencias ADD CONSTRAINT divergencias_status_analise_check 
      CHECK (status_analise IN ('pendente', 'em_analise', 'confirmado', 'descartado', 'justificado'));
  END IF;

  -- Adiciona coluna processo_vinculado se nao existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'divergencias' AND column_name = 'processo_vinculado'
  ) THEN
    ALTER TABLE divergencias ADD COLUMN processo_vinculado uuid REFERENCES evt_s1070(id);
  END IF;

  -- Adiciona coluna natureza_rubrica se nao existir (para rastreabilidade)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'divergencias' AND column_name = 'natureza_rubrica'
  ) THEN
    ALTER TABLE divergencias ADD COLUMN natureza_rubrica text;
  END IF;

  -- Adiciona coluna competencia_inicio se nao existir (para analise multi-periodo)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'divergencias' AND column_name = 'competencia_inicio'
  ) THEN
    ALTER TABLE divergencias ADD COLUMN competencia_inicio text;
  END IF;

  -- Adiciona coluna competencia_fim se nao existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'divergencias' AND column_name = 'competencia_fim'
  ) THEN
    ALTER TABLE divergencias ADD COLUMN competencia_fim text;
  END IF;
END $$;

-- Indices adicionais para divergencias
CREATE INDEX IF NOT EXISTS idx_divergencias_tipo_impacto ON divergencias(tipo_impacto);
CREATE INDEX IF NOT EXISTS idx_divergencias_tributo_afetado ON divergencias(tributo_afetado);
CREATE INDEX IF NOT EXISTS idx_divergencias_status_analise ON divergencias(status_analise);
CREATE INDEX IF NOT EXISTS idx_divergencias_natureza_rubrica ON divergencias(natureza_rubrica);

-- =============================================================================
-- TABELA: rubrica_processo_vinculo (Vinculo entre rubricas e processos)
-- Para casos onde um processo justifica a parametrizacao de uma rubrica
-- =============================================================================
CREATE TABLE IF NOT EXISTS rubrica_processo_vinculo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  rubrica_id uuid NOT NULL REFERENCES rubricas(id) ON DELETE CASCADE,
  processo_id uuid NOT NULL REFERENCES evt_s1070(id) ON DELETE CASCADE,
  tributo_suspenso text NOT NULL,
  observacao text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT rubrica_processo_tributo_check CHECK (
    tributo_suspenso IN ('INSS', 'FGTS', 'IRRF', 'TODOS')
  )
);

COMMENT ON TABLE rubrica_processo_vinculo IS 'Vincula rubricas a processos judiciais que justificam sua parametrizacao';

CREATE UNIQUE INDEX IF NOT EXISTS idx_rubrica_processo_unique 
  ON rubrica_processo_vinculo(rubrica_id, processo_id, tributo_suspenso);

-- RLS
ALTER TABLE rubrica_processo_vinculo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios podem ver vinculos de suas empresas"
  ON rubrica_processo_vinculo FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = rubrica_processo_vinculo.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios podem inserir vinculos em suas empresas"
  ON rubrica_processo_vinculo FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = rubrica_processo_vinculo.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios podem deletar vinculos de suas empresas"
  ON rubrica_processo_vinculo FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = rubrica_processo_vinculo.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

-- =============================================================================
-- SEED: Dados iniciais para base_conhecimento_rubricas
-- Principais naturezas conforme tabela eSocial com incidencias legais
-- =============================================================================
INSERT INTO base_conhecimento_rubricas (natureza_rubrica, descricao_padrao, incid_inss_padrao, incid_irrf_padrao, incid_fgts_padrao, fundamentacao_legal) VALUES
  -- Salarios e Remuneracoes (1000-1099)
  ('1000', 'Salario, vencimento, soldo', '11', '11', '11', 'Art. 28, I, Lei 8.212/91; Art. 457, CLT'),
  ('1002', 'Salario por tarefa ou empreitada', '11', '11', '11', 'Art. 28, I, Lei 8.212/91'),
  ('1003', 'Salario in natura - Alimentacao', '11', '11', '11', 'Art. 458, CLT; Art. 28, I, Lei 8.212/91'),
  ('1004', 'Salario in natura - Habitacao', '11', '11', '11', 'Art. 458, CLT'),
  ('1005', 'Salario in natura - Vestuario', '11', '11', '11', 'Art. 458, CLT'),
  ('1006', 'Salario in natura - Outros', '11', '11', '11', 'Art. 458, CLT'),
  ('1007', 'Salario maternidade', '11', '11', '11', 'Art. 28, §2, Lei 8.212/91'),
  ('1008', 'Salario familia - Excedente', '11', '11', '11', 'Valor excedente ao legal'),
  ('1009', 'Quebra de caixa', '11', '11', '11', 'Sumula 247, TST'),
  
  -- Horas Extras e Adicionais (1100-1199)
  ('1101', 'Horas extras', '11', '11', '11', 'Art. 28, I, Lei 8.212/91'),
  ('1102', 'Adicional noturno', '11', '11', '11', 'Art. 28, I, Lei 8.212/91'),
  ('1103', 'Adicional de insalubridade', '11', '11', '11', 'Art. 28, I, Lei 8.212/91; Sumula 139, TST'),
  ('1104', 'Adicional de periculosidade', '11', '11', '11', 'Art. 28, I, Lei 8.212/91'),
  ('1105', 'Adicional de transferencia', '11', '11', '11', 'Art. 28, I, Lei 8.212/91; Art. 469, CLT'),
  ('1106', 'Adicional de funcao/cargo confianca', '11', '11', '11', 'Art. 28, I, Lei 8.212/91'),
  
  -- Gratificacoes (1200-1299)
  ('1201', 'Gratificacao por tempo de servico', '11', '11', '11', 'Art. 28, I, Lei 8.212/91'),
  ('1202', 'Gratificacao de produtividade', '11', '11', '11', 'Art. 28, I, Lei 8.212/91'),
  ('1203', 'Gratificacao de funcao', '11', '11', '11', 'Art. 28, I, Lei 8.212/91'),
  ('1204', 'Gratificacoes eventuais', '00', '11', '00', 'Art. 28, §9, a, Lei 8.212/91 - se eventual'),
  
  -- 13o Salario (1300-1399)
  ('1300', '13o salario - 1a parcela', '11', '00', '11', 'Art. 28, §7, Lei 8.212/91'),
  ('1301', '13o salario - 2a parcela ou unica', '11', '11', '11', 'Art. 28, §7, Lei 8.212/91'),
  ('1302', '13o salario - Complementacao', '11', '11', '11', 'Art. 28, §7, Lei 8.212/91'),
  
  -- Ferias (1400-1499)
  ('1400', 'Ferias - Gozo', '11', '11', '11', 'Art. 28, I, Lei 8.212/91'),
  ('1401', 'Ferias - Abono pecuniario (1/3 vendido)', '00', '00', '00', 'Art. 28, §9, e, 6, Lei 8.212/91'),
  ('1402', '1/3 constitucional de ferias - Gozo', '11', '11', '11', 'Art. 28, I, Lei 8.212/91'),
  ('1403', 'Ferias - Dobra (pagas em atraso)', '11', '11', '11', 'Art. 28, I, Lei 8.212/91'),
  ('1404', 'Ferias indenizadas', '00', '00', '00', 'Art. 28, §9, d, Lei 8.212/91'),
  ('1405', '1/3 constitucional - Ferias indenizadas', '00', '00', '00', 'Art. 28, §9, d, Lei 8.212/91'),
  
  -- Comissoes e Premios (1500-1599)
  ('1500', 'Comissoes', '11', '11', '11', 'Art. 28, I, Lei 8.212/91'),
  ('1501', 'Premios - Habituais', '11', '11', '11', 'Art. 28, I, Lei 8.212/91'),
  ('1502', 'Premios - Eventuais/PLR', '00', '11', '00', 'Lei 10.101/00; Art. 28, §9, j, Lei 8.212/91'),
  
  -- Verbas Indenizatorias e Nao Tributaveis (5000-5999)
  ('5001', 'Ajuda de custo - Transferencia', '00', '00', '00', 'Art. 28, §9, g, Lei 8.212/91'),
  ('5002', 'Auxilio-alimentacao - PAT', '00', '00', '00', 'Art. 28, §9, c, Lei 8.212/91'),
  ('5003', 'Auxilio-transporte - Vale transporte', '00', '00', '00', 'Art. 28, §9, f, Lei 8.212/91'),
  ('5004', 'Diarias para viagem - Ate 50% salario', '00', '00', '00', 'Art. 28, §9, h, Lei 8.212/91'),
  ('5005', 'Diarias para viagem - Acima 50% salario', '11', '11', '11', 'Art. 28, §8, a, Lei 8.212/91'),
  ('5006', 'Reembolso creche/babá', '00', '00', '00', 'Art. 28, §9, s, Lei 8.212/91'),
  ('5007', 'Salario familia legal', '00', '00', '00', 'Art. 28, §9, a, Lei 8.212/91'),
  ('5008', 'Auxilio-doenca (primeiros 15 dias)', '11', '11', '11', 'Art. 28, I, Lei 8.212/91'),
  ('5009', 'Complemento auxilio-doenca', '00', '00', '00', 'IN RFB 971/2009'),
  
  -- Verbas Rescisórias (6000-6099)
  ('6001', 'Aviso previo indenizado', '00', '00', '11', 'Art. 28, §9, e, 1, Lei 8.212/91'),
  ('6002', 'Multa FGTS rescisao', '00', '00', '00', 'Art. 28, §9, e, 3, Lei 8.212/91'),
  ('6003', 'Indenizacao adicional (Art. 9 Lei 7238)', '00', '00', '00', 'Art. 28, §9, e, 2, Lei 8.212/91'),
  ('6004', 'Indenizacao por tempo de servico', '00', '00', '00', 'Art. 28, §9, e, Lei 8.212/91'),
  ('6005', 'Saldo de salario rescisao', '11', '11', '11', 'Art. 28, I, Lei 8.212/91'),
  ('6006', '13o proporcional rescisao', '11', '11', '11', 'Art. 28, §7, Lei 8.212/91'),
  
  -- Descontos (9000-9999)
  ('9201', 'Desconto INSS segurado', '00', '00', '00', 'Desconto legal'),
  ('9202', 'Desconto IRRF', '00', '00', '00', 'Desconto legal'),
  ('9203', 'Desconto vale transporte', '00', '00', '00', 'Desconto legal - max 6%'),
  ('9204', 'Desconto vale alimentacao', '00', '00', '00', 'Desconto legal - max 20%'),
  ('9205', 'Desconto plano de saude', '00', '00', '00', 'Desconto autorizado'),
  ('9206', 'Desconto contribuicao sindical', '00', '00', '00', 'Art. 578, CLT'),
  ('9207', 'Desconto pensao alimenticia', '00', '00', '00', 'Ordem judicial'),
  ('9208', 'Desconto adiantamento salarial', '00', '00', '00', 'Compensacao'),
  ('9209', 'Desconto faltas/atrasos', '00', '00', '00', 'Art. 473, CLT'),
  ('9210', 'Desconto DSR sobre faltas', '00', '00', '00', 'Lei 605/49')
ON CONFLICT (natureza_rubrica) DO UPDATE SET
  descricao_padrao = EXCLUDED.descricao_padrao,
  incid_inss_padrao = EXCLUDED.incid_inss_padrao,
  incid_irrf_padrao = EXCLUDED.incid_irrf_padrao,
  incid_fgts_padrao = EXCLUDED.incid_fgts_padrao,
  fundamentacao_legal = EXCLUDED.fundamentacao_legal,
  updated_at = now();

-- =============================================================================
-- VIEW: vw_divergencias_consolidadas
-- Visao consolidada das divergencias com impacto financeiro
-- =============================================================================
CREATE OR REPLACE VIEW vw_divergencias_consolidadas AS
SELECT 
  d.empresa_id,
  d.tipo_impacto,
  d.tributo_afetado,
  d.status_analise,
  COUNT(*) as quantidade,
  SUM(ABS(d.diferenca)) as impacto_total,
  SUM(CASE WHEN d.tipo_impacto = 'risco' THEN ABS(d.diferenca) ELSE 0 END) as total_risco,
  SUM(CASE WHEN d.tipo_impacto = 'oportunidade' THEN ABS(d.diferenca) ELSE 0 END) as total_oportunidade
FROM divergencias d
GROUP BY d.empresa_id, d.tipo_impacto, d.tributo_afetado, d.status_analise;

-- =============================================================================
-- FUNCAO: fn_atualiza_updated_at
-- Trigger para atualizar updated_at automaticamente
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_atualiza_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS trg_base_conhecimento_updated ON base_conhecimento_rubricas;
CREATE TRIGGER trg_base_conhecimento_updated
  BEFORE UPDATE ON base_conhecimento_rubricas
  FOR EACH ROW EXECUTE FUNCTION fn_atualiza_updated_at();

DROP TRIGGER IF EXISTS trg_evt_s1070_updated ON evt_s1070;
CREATE TRIGGER trg_evt_s1070_updated
  BEFORE UPDATE ON evt_s1070
  FOR EACH ROW EXECUTE FUNCTION fn_atualiza_updated_at();

DROP TRIGGER IF EXISTS trg_dados_empresa_auditoria_updated ON dados_empresa_auditoria;
CREATE TRIGGER trg_dados_empresa_auditoria_updated
  BEFORE UPDATE ON dados_empresa_auditoria
  FOR EACH ROW EXECUTE FUNCTION fn_atualiza_updated_at();
