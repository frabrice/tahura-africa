import { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PortalUser } from '../../lib/auth';
import {
  Plus, X, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  Clock, Target, Trash2, Edit3, Save, FileText, Shield
} from 'lucide-react';

interface Policy {
  id: string;
  portal_user_id: string;
  title: string;
  description: string;
  focus_points: string[];
  priority: 'high' | 'medium' | 'low';
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

const PRIORITY_CONFIG = {
  high: { label: 'High', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertTriangle },
  medium: { label: 'Medium', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
  low: { label: 'Low', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', icon: Target },
};

const STATUS_CONFIG = {
  draft: { label: 'Draft', bg: 'bg-neutral-100', text: 'text-neutral-600' },
  active: { label: 'Active', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  archived: { label: 'Archived', bg: 'bg-neutral-100', text: 'text-neutral-400' },
};

export function PolicyPage() {
  const { user } = useAuth();
  const portalUser = user as PortalUser | null;
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'active' | 'archived'>('all');

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [formStatus, setFormStatus] = useState<'draft' | 'active' | 'archived'>('draft');
  const [formFocusPoints, setFormFocusPoints] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (portalUser?.id) loadPolicies();
  }, [portalUser?.id]);

  async function loadPolicies() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('government_policies')
        .select('*')
        .order('created_at', { ascending: false });

      setPolicies(data || []);
    } catch (err) {
      console.error('Error loading policies:', err);
    }
    setLoading(false);
  }

  function resetForm() {
    setFormTitle('');
    setFormDescription('');
    setFormPriority('medium');
    setFormStatus('draft');
    setFormFocusPoints(['']);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(policy: Policy) {
    setFormTitle(policy.title);
    setFormDescription(policy.description);
    setFormPriority(policy.priority);
    setFormStatus(policy.status);
    setFormFocusPoints(policy.focus_points.length > 0 ? policy.focus_points : ['']);
    setEditingId(policy.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!formTitle.trim() || !portalUser?.id) return;
    setSaving(true);

    const cleanFocusPoints = formFocusPoints.filter(p => p.trim());
    const payload = {
      portal_user_id: portalUser.id,
      title: formTitle.trim(),
      description: formDescription.trim(),
      focus_points: cleanFocusPoints,
      priority: formPriority,
      status: formStatus,
    };

    try {
      if (editingId) {
        await supabase
          .from('government_policies')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingId);
      } else {
        await supabase.from('government_policies').insert(payload);
      }

      resetForm();
      await loadPolicies();
    } catch (err) {
      console.error('Error saving policy:', err);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    try {
      await supabase.from('government_policies').delete().eq('id', id);
      setPolicies(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting policy:', err);
    }
  }

  const filtered = filterStatus === 'all' ? policies : policies.filter(p => p.status === filterStatus);

  const counts = {
    all: policies.length,
    draft: policies.filter(p => p.status === 'draft').length,
    active: policies.filter(p => p.status === 'active').length,
    archived: policies.filter(p => p.status === 'archived').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg font-medium text-neutral-900">Policy & Direction</h1>
          <p className="text-xs text-neutral-500 mt-1">Define tourism priorities and strategic directives</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Policy
          </button>
        )}
      </div>

      {showForm && (
        <Card className="p-6 mb-6 border-2 border-neutral-300">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-neutral-900">
              {editingId ? 'Edit Policy' : 'New Policy Directive'}
            </h2>
            <button onClick={resetForm} className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-neutral-500" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Title</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Sustainable Tourism Growth Strategy"
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Description</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Describe the policy objectives and rationale..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Focus Points</label>
              <div className="space-y-2">
                {formFocusPoints.map((point, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400 w-5 text-right">{idx + 1}.</span>
                    <input
                      type="text"
                      value={point}
                      onChange={(e) => {
                        const updated = [...formFocusPoints];
                        updated[idx] = e.target.value;
                        setFormFocusPoints(updated);
                      }}
                      placeholder="Key area of focus..."
                      className="flex-1 px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400"
                    />
                    {formFocusPoints.length > 1 && (
                      <button
                        onClick={() => setFormFocusPoints(formFocusPoints.filter((_, i) => i !== idx))}
                        className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setFormFocusPoints([...formFocusPoints, ''])}
                  className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors ml-7"
                >
                  + Add focus point
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Priority</label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as 'high' | 'medium' | 'low')}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 bg-white"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as 'draft' | 'active' | 'archived')}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 bg-white"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-xs font-medium text-neutral-600 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formTitle.trim() || saving}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : editingId ? 'Update Policy' : 'Create Policy'}
              </button>
            </div>
          </div>
        </Card>
      )}

      <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl mb-6 w-fit">
        {(['all', 'active', 'draft', 'archived'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilterStatus(tab)}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
              filterStatus === tab
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className={`ml-1.5 text-xs ${filterStatus === tab ? 'text-neutral-500' : 'text-neutral-400'}`}>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-500">No policies found</p>
          <p className="text-xs text-neutral-400 mt-1">
            {filterStatus === 'all'
              ? 'Create your first policy directive to get started'
              : `No ${filterStatus} policies`}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(policy => {
            const priorityConf = PRIORITY_CONFIG[policy.priority];
            const statusConf = STATUS_CONFIG[policy.status];
            const PriorityIcon = priorityConf.icon;
            const isExpanded = expandedId === policy.id;

            return (
              <Card key={policy.id} className="overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : policy.id)}
                  className="w-full p-5 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg ${priorityConf.bg} flex-shrink-0 mt-0.5`}>
                        <PriorityIcon className={`w-4 h-4 ${priorityConf.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-sm font-semibold text-neutral-900 truncate">{policy.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConf.bg} ${statusConf.text}`}>
                            {statusConf.label}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${priorityConf.bg} ${priorityConf.text} ${priorityConf.border}`}>
                            {priorityConf.label}
                          </span>
                        </div>
                        {policy.description && (
                          <p className="text-xs text-neutral-500 line-clamp-1">{policy.description}</p>
                        )}
                        <p className="text-xs text-neutral-400 mt-1">
                          Created {new Date(policy.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-neutral-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-400" />
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-neutral-100 pt-4">
                    {policy.description && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Description</h4>
                        <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{policy.description}</p>
                      </div>
                    )}

                    {policy.focus_points && policy.focus_points.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Focus Points</h4>
                        <div className="space-y-2">
                          {policy.focus_points.map((point, idx) => (
                            <div key={idx} className="flex items-start gap-2.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-neutral-700">{point}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); startEdit(policy); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(policy.id); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-5 mt-6 bg-neutral-50">
        <div className="flex items-center gap-3 mb-3">
          <Shield className="w-4 h-4 text-neutral-500" />
          <h3 className="text-sm font-medium text-neutral-900">About Policy Directives</h3>
        </div>
        <p className="text-xs text-neutral-600 leading-relaxed">
          Policy directives set strategic priorities for the national tourism ecosystem. Active policies
          inform platform operations, guide resource allocation, and shape reporting metrics. Draft
          policies are visible only to government administrators until activated.
        </p>
      </Card>
    </div>
  );
}
