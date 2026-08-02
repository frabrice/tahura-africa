import { useState } from 'react';
import { X, Flag, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sendEmail } from '../lib/sendEmail';

interface FlagContentModalProps {
  targetType: 'listing' | 'attraction';
  targetId: string;
  targetTitle: string;
  ownerPortalUserId: string;
  flaggedBy: string;
  onClose: () => void;
  onFlagged: () => void;
}

const severityOptions = [
  { value: 'minor', label: 'Minor Issue', desc: 'Small inaccuracy or formatting problem' },
  { value: 'major', label: 'Major Issue', desc: 'Significant misleading content or safety concern' },
  { value: 'policy_violation', label: 'Policy Violation', desc: 'Violates platform terms or guidelines' },
] as const;

export function FlagContentModal({
  targetType,
  targetId,
  targetTitle,
  ownerPortalUserId,
  flaggedBy,
  onClose,
  onFlagged,
}: FlagContentModalProps) {
  const [reason, setReason] = useState('');
  const [severity, setSeverity] = useState<'minor' | 'major' | 'policy_violation'>('minor');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!reason.trim()) {
      setError('Please provide a reason for flagging.');
      return;
    }
    setSubmitting(true);
    setError('');

    const { data: flagData, error: flagErr } = await supabase
      .from('content_flags')
      .insert({
        target_type: targetType,
        target_id: targetId,
        flagged_by: flaggedBy,
        reason: reason.trim(),
        severity,
        status: 'active',
      })
      .select('id')
      .maybeSingle();

    if (flagErr) {
      setError('Failed to create flag. Please try again.');
      setSubmitting(false);
      return;
    }

    const table = targetType === 'listing' ? 'partner_listings' : 'institution_profiles';
    await supabase.from(table).update({ is_flagged: true }).eq('id', targetId);

    const typeLabel = targetType === 'listing' ? 'listing' : 'attraction';
    await supabase.from('notifications').insert({
      recipient_portal_user_id: ownerPortalUserId,
      type: `${targetType}_flagged`,
      title: `Your ${typeLabel} "${targetTitle}" has been flagged`,
      message: `Reason: ${reason.trim()}\n\nSeverity: ${severity.replace('_', ' ')}\n\nPlease review and address this issue. You can view or edit your ${typeLabel} from the notification actions below.`,
      metadata: {
        target_type: targetType,
        target_id: targetId,
        flag_id: flagData?.id,
        target_title: targetTitle,
      },
    });

    supabase.from('portal_users').select('email, name').eq('id', ownerPortalUserId).maybeSingle().then(({ data: owner }) => {
      if (owner?.email) {
        sendEmail({
          template: 'content_flagged',
          recipient_email: owner.email,
          recipient_name: owner.name || '',
          data: {
            target_type: targetType,
            target_title: targetTitle,
            reason: reason.trim(),
            severity,
          },
        });
      }
    });

    setSubmitting(false);
    onFlagged();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
              <Flag className="w-4.5 h-4.5 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Flag Content</h3>
              <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-[280px]">{targetTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100 transition-colors">
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-2">Severity Level</label>
            <div className="space-y-2">
              {severityOptions.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    severity === opt.value
                      ? 'border-red-300 bg-red-50/50'
                      : 'border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="severity"
                    value={opt.value}
                    checked={severity === opt.value}
                    onChange={() => setSeverity(opt.value)}
                    className="mt-0.5 accent-red-600"
                  />
                  <div>
                    <div className="text-xs font-medium text-neutral-900">{opt.label}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-2">
              Reason & Details <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Describe the issue and what the owner needs to fix..."
              rows={4}
              className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none placeholder:text-neutral-400"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="text-xs text-red-700">{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-neutral-200 bg-neutral-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-700 border border-neutral-300 rounded-lg hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !reason.trim()}
            className="px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Flag className="w-3.5 h-3.5" />
            )}
            Flag {targetType === 'listing' ? 'Listing' : 'Attraction'}
          </button>
        </div>
      </div>
    </div>
  );
}
