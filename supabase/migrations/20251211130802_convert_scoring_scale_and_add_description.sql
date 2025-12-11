/*
  # Convert PSC Score Scale from /100 to /10 and Add Description Field

  1. Changes to `entities` table
    - Convert `psc_score` from integer to numeric to support decimals (e.g., 7.2)
    - Migrate existing scores by dividing by 10

  2. Changes to `friction_reports` table
    - Add `description` field for storing user's brief description of friction

  3. Notes
    - Scores will now be out of 10 with one decimal place
    - Previous scores (65, 75) become 6.5, 7.5
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'entities' AND column_name = 'psc_score' AND data_type = 'numeric'
  ) THEN
    ALTER TABLE entities ALTER COLUMN psc_score TYPE numeric(4,1);
    UPDATE entities SET psc_score = ROUND(psc_score::numeric / 10, 1);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'friction_reports' AND column_name = 'description'
  ) THEN
    ALTER TABLE friction_reports ADD COLUMN description text DEFAULT '';
  END IF;
END $$;
