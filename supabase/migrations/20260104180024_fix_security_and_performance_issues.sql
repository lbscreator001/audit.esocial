/*
  # Security and Performance Fixes

  1. Missing Indexes on Foreign Keys
    - divergencias.item_remuneracao_id
    - divergencias.processo_vinculado
    - faixas_inss.empresa_id
    - faixas_irrf.empresa_id
    - itens_remuneracao.rubrica_id
    - remuneracoes.importacao_id
    - rubrica_processo_vinculo.empresa_id
    - rubrica_processo_vinculo.processo_id

  2. RLS Policy Optimization
    - Replace auth.uid() with (select auth.uid()) for better performance
    - Affects: empresas, rubricas, colaboradores, importacoes, remuneracoes, 
      itens_remuneracao, divergencias, apuracoes, evt_s1000, evt_s1070,
      dados_empresa_auditoria, rubrica_processo_vinculo

  3. Function Search Path Security
    - Fix mutable search_path in fn_atualiza_updated_at
    - Fix mutable search_path in update_updated_at_column

  4. Security Definer View
    - Review vw_divergencias_consolidadas security
*/

-- ============================================================
-- PART 1: CREATE MISSING INDEXES ON FOREIGN KEYS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_divergencias_item_remuneracao_id 
  ON divergencias(item_remuneracao_id);

CREATE INDEX IF NOT EXISTS idx_divergencias_processo_vinculado 
  ON divergencias(processo_vinculado);

CREATE INDEX IF NOT EXISTS idx_faixas_inss_empresa_id 
  ON faixas_inss(empresa_id);

CREATE INDEX IF NOT EXISTS idx_faixas_irrf_empresa_id 
  ON faixas_irrf(empresa_id);

CREATE INDEX IF NOT EXISTS idx_itens_remuneracao_rubrica_id 
  ON itens_remuneracao(rubrica_id);

CREATE INDEX IF NOT EXISTS idx_remuneracoes_importacao_id 
  ON remuneracoes(importacao_id);

CREATE INDEX IF NOT EXISTS idx_rubrica_processo_vinculo_empresa_id 
  ON rubrica_processo_vinculo(empresa_id);

CREATE INDEX IF NOT EXISTS idx_rubrica_processo_vinculo_processo_id 
  ON rubrica_processo_vinculo(processo_id);

-- ============================================================
-- PART 2: FIX RLS POLICIES - EMPRESAS
-- ============================================================

DROP POLICY IF EXISTS "Users can view own companies" ON empresas;
DROP POLICY IF EXISTS "Users can insert own companies" ON empresas;
DROP POLICY IF EXISTS "Users can update own companies" ON empresas;
DROP POLICY IF EXISTS "Users can delete own companies" ON empresas;

CREATE POLICY "Users can view own companies" ON empresas
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own companies" ON empresas
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own companies" ON empresas
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own companies" ON empresas
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================
-- PART 2: FIX RLS POLICIES - RUBRICAS
-- ============================================================

DROP POLICY IF EXISTS "Users can view rubrics of own companies" ON rubricas;
DROP POLICY IF EXISTS "Users can insert rubrics for own companies" ON rubricas;
DROP POLICY IF EXISTS "Users can update rubrics of own companies" ON rubricas;
DROP POLICY IF EXISTS "Users can delete rubrics of own companies" ON rubricas;

CREATE POLICY "Users can view rubrics of own companies" ON rubricas
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can insert rubrics for own companies" ON rubricas
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can update rubrics of own companies" ON rubricas
  FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())))
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can delete rubrics of own companies" ON rubricas
  FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

-- ============================================================
-- PART 2: FIX RLS POLICIES - COLABORADORES
-- ============================================================

DROP POLICY IF EXISTS "Users can view employees of own companies" ON colaboradores;
DROP POLICY IF EXISTS "Users can insert employees for own companies" ON colaboradores;
DROP POLICY IF EXISTS "Users can update employees of own companies" ON colaboradores;
DROP POLICY IF EXISTS "Users can delete employees of own companies" ON colaboradores;

CREATE POLICY "Users can view employees of own companies" ON colaboradores
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can insert employees for own companies" ON colaboradores
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can update employees of own companies" ON colaboradores
  FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())))
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can delete employees of own companies" ON colaboradores
  FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

-- ============================================================
-- PART 2: FIX RLS POLICIES - IMPORTACOES
-- ============================================================

DROP POLICY IF EXISTS "Users can view imports of own companies" ON importacoes;
DROP POLICY IF EXISTS "Users can insert imports for own companies" ON importacoes;
DROP POLICY IF EXISTS "Users can update imports of own companies" ON importacoes;
DROP POLICY IF EXISTS "Users can delete imports of own companies" ON importacoes;

CREATE POLICY "Users can view imports of own companies" ON importacoes
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can insert imports for own companies" ON importacoes
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can update imports of own companies" ON importacoes
  FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())))
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can delete imports of own companies" ON importacoes
  FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

-- ============================================================
-- PART 2: FIX RLS POLICIES - REMUNERACOES
-- ============================================================

DROP POLICY IF EXISTS "Users can view remunerations of own companies" ON remuneracoes;
DROP POLICY IF EXISTS "Users can insert remunerations for own companies" ON remuneracoes;
DROP POLICY IF EXISTS "Users can update remunerations of own companies" ON remuneracoes;
DROP POLICY IF EXISTS "Users can delete remunerations of own companies" ON remuneracoes;

CREATE POLICY "Users can view remunerations of own companies" ON remuneracoes
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can insert remunerations for own companies" ON remuneracoes
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can update remunerations of own companies" ON remuneracoes
  FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())))
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can delete remunerations of own companies" ON remuneracoes
  FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

-- ============================================================
-- PART 2: FIX RLS POLICIES - ITENS_REMUNERACAO
-- ============================================================

DROP POLICY IF EXISTS "Users can view remuneration items of own companies" ON itens_remuneracao;
DROP POLICY IF EXISTS "Users can insert remuneration items for own companies" ON itens_remuneracao;
DROP POLICY IF EXISTS "Users can update remuneration items of own companies" ON itens_remuneracao;
DROP POLICY IF EXISTS "Users can delete remuneration items of own companies" ON itens_remuneracao;

CREATE POLICY "Users can view remuneration items of own companies" ON itens_remuneracao
  FOR SELECT TO authenticated
  USING (remuneracao_id IN (
    SELECT r.id FROM remuneracoes r 
    JOIN empresas e ON r.empresa_id = e.id 
    WHERE e.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can insert remuneration items for own companies" ON itens_remuneracao
  FOR INSERT TO authenticated
  WITH CHECK (remuneracao_id IN (
    SELECT r.id FROM remuneracoes r 
    JOIN empresas e ON r.empresa_id = e.id 
    WHERE e.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can update remuneration items of own companies" ON itens_remuneracao
  FOR UPDATE TO authenticated
  USING (remuneracao_id IN (
    SELECT r.id FROM remuneracoes r 
    JOIN empresas e ON r.empresa_id = e.id 
    WHERE e.user_id = (select auth.uid())
  ))
  WITH CHECK (remuneracao_id IN (
    SELECT r.id FROM remuneracoes r 
    JOIN empresas e ON r.empresa_id = e.id 
    WHERE e.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can delete remuneration items of own companies" ON itens_remuneracao
  FOR DELETE TO authenticated
  USING (remuneracao_id IN (
    SELECT r.id FROM remuneracoes r 
    JOIN empresas e ON r.empresa_id = e.id 
    WHERE e.user_id = (select auth.uid())
  ));

-- ============================================================
-- PART 2: FIX RLS POLICIES - DIVERGENCIAS
-- ============================================================

DROP POLICY IF EXISTS "Users can view discrepancies of own companies" ON divergencias;
DROP POLICY IF EXISTS "Users can insert discrepancies for own companies" ON divergencias;
DROP POLICY IF EXISTS "Users can update discrepancies of own companies" ON divergencias;
DROP POLICY IF EXISTS "Users can delete discrepancies of own companies" ON divergencias;

CREATE POLICY "Users can view discrepancies of own companies" ON divergencias
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can insert discrepancies for own companies" ON divergencias
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can update discrepancies of own companies" ON divergencias
  FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())))
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can delete discrepancies of own companies" ON divergencias
  FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

-- ============================================================
-- PART 2: FIX RLS POLICIES - APURACOES
-- ============================================================

DROP POLICY IF EXISTS "Users can view calculations of own companies" ON apuracoes;
DROP POLICY IF EXISTS "Users can insert calculations for own companies" ON apuracoes;
DROP POLICY IF EXISTS "Users can update calculations of own companies" ON apuracoes;
DROP POLICY IF EXISTS "Users can delete calculations of own companies" ON apuracoes;

CREATE POLICY "Users can view calculations of own companies" ON apuracoes
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can insert calculations for own companies" ON apuracoes
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can update calculations of own companies" ON apuracoes
  FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())))
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can delete calculations of own companies" ON apuracoes
  FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

-- ============================================================
-- PART 2: FIX RLS POLICIES - EVT_S1000
-- ============================================================

DROP POLICY IF EXISTS "Users can view their company S-1000 events" ON evt_s1000;
DROP POLICY IF EXISTS "Users can insert S-1000 events for their companies" ON evt_s1000;
DROP POLICY IF EXISTS "Users can update S-1000 events for their companies" ON evt_s1000;
DROP POLICY IF EXISTS "Users can delete S-1000 events for their companies" ON evt_s1000;

CREATE POLICY "Users can view their company S-1000 events" ON evt_s1000
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can insert S-1000 events for their companies" ON evt_s1000
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can update S-1000 events for their companies" ON evt_s1000
  FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())))
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can delete S-1000 events for their companies" ON evt_s1000
  FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

-- ============================================================
-- PART 2: FIX RLS POLICIES - EVT_S1070
-- ============================================================

DROP POLICY IF EXISTS "Usuarios podem ver processos de suas empresas" ON evt_s1070;
DROP POLICY IF EXISTS "Usuarios podem inserir processos em suas empresas" ON evt_s1070;
DROP POLICY IF EXISTS "Usuarios podem atualizar processos de suas empresas" ON evt_s1070;
DROP POLICY IF EXISTS "Usuarios podem deletar processos de suas empresas" ON evt_s1070;

CREATE POLICY "Usuarios podem ver processos de suas empresas" ON evt_s1070
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Usuarios podem inserir processos em suas empresas" ON evt_s1070
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Usuarios podem atualizar processos de suas empresas" ON evt_s1070
  FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())))
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Usuarios podem deletar processos de suas empresas" ON evt_s1070
  FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

-- ============================================================
-- PART 2: FIX RLS POLICIES - DADOS_EMPRESA_AUDITORIA
-- ============================================================

DROP POLICY IF EXISTS "Usuarios podem ver dados de auditoria de suas empresas" ON dados_empresa_auditoria;
DROP POLICY IF EXISTS "Usuarios podem inserir dados de auditoria em suas empresas" ON dados_empresa_auditoria;
DROP POLICY IF EXISTS "Usuarios podem atualizar dados de auditoria de suas empresas" ON dados_empresa_auditoria;
DROP POLICY IF EXISTS "Usuarios podem deletar dados de auditoria de suas empresas" ON dados_empresa_auditoria;

CREATE POLICY "Usuarios podem ver dados de auditoria de suas empresas" ON dados_empresa_auditoria
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Usuarios podem inserir dados de auditoria em suas empresas" ON dados_empresa_auditoria
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Usuarios podem atualizar dados de auditoria de suas empresas" ON dados_empresa_auditoria
  FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())))
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Usuarios podem deletar dados de auditoria de suas empresas" ON dados_empresa_auditoria
  FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

-- ============================================================
-- PART 2: FIX RLS POLICIES - RUBRICA_PROCESSO_VINCULO
-- ============================================================

DROP POLICY IF EXISTS "Usuarios podem ver vinculos de suas empresas" ON rubrica_processo_vinculo;
DROP POLICY IF EXISTS "Usuarios podem inserir vinculos em suas empresas" ON rubrica_processo_vinculo;
DROP POLICY IF EXISTS "Usuarios podem deletar vinculos de suas empresas" ON rubrica_processo_vinculo;

CREATE POLICY "Usuarios podem ver vinculos de suas empresas" ON rubrica_processo_vinculo
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Usuarios podem inserir vinculos em suas empresas" ON rubrica_processo_vinculo
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

CREATE POLICY "Usuarios podem deletar vinculos de suas empresas" ON rubrica_processo_vinculo
  FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = (select auth.uid())));

-- ============================================================
-- PART 3: FIX FUNCTION SEARCH PATHS
-- ============================================================

CREATE OR REPLACE FUNCTION fn_atualiza_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- PART 4: FIX SECURITY DEFINER VIEW
-- ============================================================

DROP VIEW IF EXISTS vw_divergencias_consolidadas;

CREATE VIEW vw_divergencias_consolidadas
WITH (security_invoker = true)
AS
SELECT 
  d.empresa_id,
  d.tipo_impacto,
  d.tributo_afetado,
  d.natureza_rubrica,
  d.status_analise,
  d.severidade,
  COUNT(*) as quantidade,
  SUM(d.diferenca) as valor_total,
  MIN(d.competencia_inicio) as competencia_inicio,
  MAX(d.competencia_fim) as competencia_fim
FROM divergencias d
GROUP BY 
  d.empresa_id,
  d.tipo_impacto,
  d.tributo_afetado,
  d.natureza_rubrica,
  d.status_analise,
  d.severidade;