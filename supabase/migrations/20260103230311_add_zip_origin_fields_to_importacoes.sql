/*
  # Add ZIP origin fields to importacoes table

  1. New Columns
    - `arquivo_origem_zip` (text, nullable) - Name of the source ZIP file when XML was extracted from a ZIP
    - `caminho_no_zip` (text, nullable) - Full path of the XML file inside the ZIP archive

  2. Changes
    - Adds nullable columns to track ZIP file origin
    - No data migration needed as existing records will have NULL values

  3. Notes
    - These fields help users identify which XMLs came from batch ZIP imports
    - NULL values indicate direct XML file uploads
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'importacoes' AND column_name = 'arquivo_origem_zip'
  ) THEN
    ALTER TABLE importacoes ADD COLUMN arquivo_origem_zip text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'importacoes' AND column_name = 'caminho_no_zip'
  ) THEN
    ALTER TABLE importacoes ADD COLUMN caminho_no_zip text DEFAULT NULL;
  END IF;
END $$;

COMMENT ON COLUMN importacoes.arquivo_origem_zip IS 'Name of the source ZIP file when XML was extracted from a ZIP archive';
COMMENT ON COLUMN importacoes.caminho_no_zip IS 'Full path of the XML file inside the ZIP archive';
