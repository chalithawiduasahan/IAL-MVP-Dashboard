import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Entity {
  id: string;
  name: string;
  psc_score: number;
  created_at: string;
  updated_at: string;
}

export interface EntityMetric {
  id: string;
  entity_id: string;
  metric_name: string;
  metric_value: string;
  created_at: string;
}

export interface FrictionReport {
  entity_id: string;
  service_task: string;
  friction_type: string;
  time_wasted_hours: number;
  description: string;
}
