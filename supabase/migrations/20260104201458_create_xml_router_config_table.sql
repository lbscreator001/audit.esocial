/*
  # Create XML Router Configuration Table

  1. New Tables
    - `xml_router_config`
      - `id` (uuid, primary key)
      - `tag_xml` (text, unique) - Tag XML que identifica o evento (ex: evtTabRubr, evtTabRubrica)
      - `codigo_evento` (text) - Código do evento eSocial (ex: S-1010, S-1200)
      - `tabela_destino` (text) - Nome da tabela SQL de destino (ex: evt_s1010)
      - `ativo` (boolean) - Indica se a rota está ativa
      - `ordem_prioridade` (integer) - Ordem de prioridade na busca
      - `descricao` (text) - Descrição do evento
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `xml_router_config` table
    - Add policies for authenticated users to read configuration
    - Only authenticated users can view and modify routes
  
  3. Initial Data
    - Insert S-1010 routes for evtTabRubr and evtTabRubrica
*/

CREATE TABLE IF NOT EXISTS xml_router_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_xml text NOT NULL UNIQUE,
  codigo_evento text NOT NULL,
  tabela_destino text NOT NULL,
  ativo boolean DEFAULT true,
  ordem_prioridade integer DEFAULT 0,
  descricao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add comments
COMMENT ON TABLE xml_router_config IS 'Configuração de roteamento de eventos eSocial para tabelas de destino';
COMMENT ON COLUMN xml_router_config.tag_xml IS 'Tag XML que identifica o tipo de evento (ex: evtTabRubr, evtAdmissao)';
COMMENT ON COLUMN xml_router_config.codigo_evento IS 'Código do evento eSocial (ex: S-1010, S-2200)';
COMMENT ON COLUMN xml_router_config.tabela_destino IS 'Nome da tabela SQL onde o evento será armazenado';
COMMENT ON COLUMN xml_router_config.ativo IS 'Indica se esta rota está ativa e deve ser usada';
COMMENT ON COLUMN xml_router_config.ordem_prioridade IS 'Ordem de prioridade (maior = mais prioritário)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_xml_router_tag_xml ON xml_router_config(tag_xml);
CREATE INDEX IF NOT EXISTS idx_xml_router_codigo_evento ON xml_router_config(codigo_evento);
CREATE INDEX IF NOT EXISTS idx_xml_router_ativo ON xml_router_config(ativo);
CREATE INDEX IF NOT EXISTS idx_xml_router_prioridade ON xml_router_config(ordem_prioridade DESC);

-- Create trigger for updated_at
CREATE TRIGGER trigger_xml_router_config_updated_at
  BEFORE UPDATE ON xml_router_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE xml_router_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view router config"
  ON xml_router_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert router config"
  ON xml_router_config
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update router config"
  ON xml_router_config
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete router config"
  ON xml_router_config
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert initial data for S-1010 event
INSERT INTO xml_router_config (tag_xml, codigo_evento, tabela_destino, ativo, ordem_prioridade, descricao)
VALUES 
  ('evtTabRubr', 'S-1010', 'evt_s1010', true, 100, 'Tabela de Rubricas da Folha de Pagamento'),
  ('evtTabRubrica', 'S-1010', 'evt_s1010', true, 99, 'Tabela de Rubricas da Folha de Pagamento (variação)')
ON CONFLICT (tag_xml) DO NOTHING;