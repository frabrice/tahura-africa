import { supabase } from './supabase';

export type ActiveGateway = 'flutterwave' | 'legacy';

// Reads the Ops-flippable "Use Flutterwave as Primary Gateway" toggle
// (system_rules id '10'). Defaults to 'flutterwave' if the row is missing or
// unreachable, matching the migration's default-on seed value.
export async function getActiveGateway(): Promise<ActiveGateway> {
  const { data } = await supabase
    .from('system_rules')
    .select('enabled')
    .eq('id', '10')
    .maybeSingle();

  if (data && data.enabled === false) return 'legacy';
  return 'flutterwave';
}
