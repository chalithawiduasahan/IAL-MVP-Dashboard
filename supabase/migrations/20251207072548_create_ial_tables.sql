/*
  # Create Incentive Alignment Ledger Tables

  1. New Tables
    - `entities`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Entity name like "Municipal Council"
      - `psc_score` (integer) - Public Service Commitment Score
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `entity_metrics`
      - `id` (uuid, primary key)
      - `entity_id` (uuid, foreign key)
      - `metric_name` (text) - e.g., "Query Resolution Time"
      - `metric_value` (text) - e.g., "Low (20%)"
      - `created_at` (timestamp)
    
    - `friction_reports`
      - `id` (uuid, primary key)
      - `entity_id` (uuid, foreign key)
      - `service_task` (text) - Service or task description
      - `friction_type` (text) - Type of friction
      - `time_wasted_hours` (numeric) - Hours wasted
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on all tables
    - Public read access for viewing entities and metrics
    - Public insert access for submitting friction reports
*/

CREATE TABLE IF NOT EXISTS entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  psc_score integer NOT NULL DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entity_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid REFERENCES entities(id) ON DELETE CASCADE NOT NULL,
  metric_name text NOT NULL,
  metric_value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS friction_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid REFERENCES entities(id) ON DELETE CASCADE NOT NULL,
  service_task text NOT NULL,
  friction_type text NOT NULL,
  time_wasted_hours numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE friction_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view entities"
  ON entities FOR SELECT
  USING (true);

CREATE POLICY "Public can view entity metrics"
  ON entity_metrics FOR SELECT
  USING (true);

CREATE POLICY "Public can view friction reports"
  ON friction_reports FOR SELECT
  USING (true);

CREATE POLICY "Public can submit friction reports"
  ON friction_reports FOR INSERT
  WITH CHECK (true);

INSERT INTO entities (name, psc_score) VALUES
  ('Municipal Council', 65),
  ('Local Utility Co.', 75)
ON CONFLICT (name) DO NOTHING;

INSERT INTO entity_metrics (entity_id, metric_name, metric_value)
SELECT 
  e.id,
  m.metric_name,
  m.metric_value
FROM entities e
CROSS JOIN (
  VALUES 
    ('Query Resolution Time', 'Low (20%)'),
    ('Citizen Feedback Rating', 'Poor (50%)')
) AS m(metric_name, metric_value)
WHERE e.name = 'Municipal Council'
ON CONFLICT DO NOTHING;