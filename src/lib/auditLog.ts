import { supabase } from './supabase';
import { PortalUser } from './auth';

interface LogAdminActionParams {
  actor: PortalUser | null;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
}

// Fire-and-forget, like sendEmail — a logging failure should never block the
// admin action it's describing.
export async function logAdminAction({ actor, action, targetType, targetId, details }: LogAdminActionParams): Promise<void> {
  try {
    await supabase.from('admin_audit_log').insert({
      actor_id: actor?.id || null,
      actor_name: actor?.name || actor?.email || 'System',
      action,
      target_type: targetType || null,
      target_id: targetId || null,
      details: details || {},
    });
  } catch (_) {
    // non-blocking
  }
}
