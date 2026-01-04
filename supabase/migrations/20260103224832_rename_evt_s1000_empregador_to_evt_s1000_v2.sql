/*
  # Rename evt_s1000_empregador table to evt_s1000

  1. Changes
    - Rename table from `evt_s1000_empregador` to `evt_s1000`
    - Recreate RLS policies with new table name (4 policies preserved: SELECT, INSERT, UPDATE, DELETE)

  2. Security
    - All existing RLS policies are preserved with new table name
    - No changes to security rules or access patterns

  3. Important Notes
    - This is a safe rename operation that preserves all data
    - Existing indexes and constraints are automatically updated
    - Foreign key references are automatically updated
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'evt_s1000_empregador' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE evt_s1000_empregador RENAME TO evt_s1000;
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can view their company S-1000 events" ON evt_s1000;
DROP POLICY IF EXISTS "Users can insert S-1000 events for their companies" ON evt_s1000;
DROP POLICY IF EXISTS "Users can update S-1000 events for their companies" ON evt_s1000;
DROP POLICY IF EXISTS "Users can delete S-1000 events for their companies" ON evt_s1000;

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