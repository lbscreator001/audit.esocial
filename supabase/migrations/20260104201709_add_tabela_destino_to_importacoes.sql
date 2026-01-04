/*
  # Add tabela_destino column to importacoes

  1. Changes
    - Add `tabela_destino` column to `importacoes` table
      - Stores the SQL table name where the event data was saved
      - Examples: 'evt_s1010', 'evt_s1200', 'rubricas' (legacy)
    - Add index for performance on filtered queries
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'importacoes' AND column_name = 'tabela_destino'
  ) THEN
    ALTER TABLE importacoes ADD COLUMN tabela_destino text;
  END IF;
END $$;

COMMENT ON COLUMN importacoes.tabela_destino IS 'Nome da tabela SQL de destino onde os dados foram armazenados (ex: evt_s1010, evt_s1200)';

CREATE INDEX IF NOT EXISTS idx_importacoes_tabela_destino ON importacoes(tabela_destino);