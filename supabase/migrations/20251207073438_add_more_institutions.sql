/*
  # Add More Institutions to IAL Demo

  1. Insert additional institutions
    - Divisional Secretariat Office
    - Public Transportation Authority
    - Health Services Department
  
  2. Initialize metrics for each new institution
*/

INSERT INTO entities (name, psc_score) VALUES
  ('Divisional Secretariat Office', 72),
  ('Public Transportation Authority', 68),
  ('Health Services Department', 78)
ON CONFLICT (name) DO NOTHING;

INSERT INTO entity_metrics (entity_id, metric_name, metric_value)
SELECT 
  e.id,
  m.metric_name,
  m.metric_value
FROM entities e
CROSS JOIN (
  VALUES 
    ('Query Resolution Time', 'Moderate (45%)'),
    ('Citizen Feedback Rating', 'Fair (62%)')
) AS m(metric_name, metric_value)
WHERE e.name IN ('Divisional Secretariat Office', 'Public Transportation Authority', 'Health Services Department')
  AND NOT EXISTS (
    SELECT 1 FROM entity_metrics 
    WHERE entity_metrics.entity_id = e.id 
    AND entity_metrics.metric_name = m.metric_name
  );