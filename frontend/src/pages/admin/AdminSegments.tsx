import { useEffect, useMemo, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Loader } from '../../components/ui/Loader';

type Segment = {
  _id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused';
  filters?: {
    roles?: string[];
    isActive?: boolean;
    createdAfter?: string;
    createdBefore?: string;
    resellerIds?: string[];
    emails?: string[];
  };
  createdAt: string;
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #E5E7EB',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

export default function AdminSegments() {
  const [items, setItems] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'paused',
    roles: ['reseller'],
    isActive: true,
    resellerIdsCsv: '',
    emailsCsv: '',
  });

  const preview = useMemo(() => {
    const resellerIds = draft.resellerIdsCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const emails = draft.emailsCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      name: draft.name,
      description: draft.description,
      status: draft.status,
      filters: {
        roles: draft.roles,
        isActive: draft.isActive,
        ...(resellerIds.length ? { resellerIds } : {}),
        ...(emails.length ? { emails } : {}),
      },
    };
  }, [draft]);

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await adminService.getSegments();
      setItems(res.data.data || []);
    } catch (e) {
      setError('Failed to load segments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    try {
      setSaving(true);
      await adminService.createSegment(preview);
      setOpen(false);
      setDraft({
        name: '',
        description: '',
        status: 'active',
        roles: ['reseller'],
        isActive: true,
        resellerIdsCsv: '',
        emailsCsv: '',
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (seg: Segment) => {
    await adminService.updateSegment(seg._id, { status: seg.status === 'active' ? 'paused' : 'active' });
    await load();
  };

  const remove = async (seg: Segment) => {
    if (!confirm(`Delete segment "${seg.name}"?`)) return;
    await adminService.deleteSegment(seg._id);
    await load();
  };

  if (loading) return <Loader />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 'bold', margin: 0 }}>Segments</h1>
          <p style={{ color: '#6B7280', margin: '8px 0 0' }}>Target users by filters for campaigns</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>+ New Segment</button>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <th style={{ textAlign: 'left', padding: 16, fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Name</th>
              <th style={{ textAlign: 'left', padding: 16, fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Status</th>
              <th style={{ textAlign: 'left', padding: 16, fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Filters</th>
              <th style={{ textAlign: 'left', padding: 16, fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Created</th>
              <th style={{ textAlign: 'left', padding: 16, fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: 16 }}>
                  <div style={{ fontWeight: 700 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{s.description || '-'}</div>
                </td>
                <td style={{ padding: 16 }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: 999,
                    fontSize: 12,
                    background: s.status === 'active' ? '#D1FAE5' : '#F3F4F6',
                    color: s.status === 'active' ? '#059669' : '#6B7280'
                  }}>
                    {s.status}
                  </span>
                </td>
                <td style={{ padding: 16, fontSize: 13, color: '#374151' }}>
                  <div>roles: {(s.filters?.roles || ['reseller']).join(', ')}</div>
                  <div>active: {String(s.filters?.isActive ?? true)}</div>
                  {(s.filters?.resellerIds?.length || 0) > 0 && <div>resellerIds: {s.filters?.resellerIds?.length}</div>}
                  {(s.filters?.emails?.length || 0) > 0 && <div>emails: {s.filters?.emails?.length}</div>}
                </td>
                <td style={{ padding: 16, fontSize: 13, color: '#6B7280' }}>{new Date(s.createdAt).toLocaleString()}</td>
                <td style={{ padding: 16 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => toggleStatus(s)}>
                      {s.status === 'active' ? 'Pause' : 'Activate'}
                    </button>
                    <button className="btn btn-secondary" onClick={() => remove(s)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: '#6B7280' }}>No segments yet.</div>
        )}
      </div>

      {open && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16,
        }}>
          <div style={{ width: '100%', maxWidth: 640, background: 'white', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Create Segment</div>
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>Close</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Name</div>
                <input style={inputStyle} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Status</div>
                <select style={inputStyle} value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as any }))}>
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Description</div>
                <input style={inputStyle} value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Role</div>
                <select
                  style={inputStyle}
                  value={draft.roles[0] || 'reseller'}
                  onChange={(e) => setDraft((d) => ({ ...d, roles: [e.target.value] }))}
                >
                  <option value="reseller">reseller</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                />
                <div style={{ fontSize: 14, color: '#374151' }}>Only active users</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Reseller IDs (CSV)</div>
                <input style={inputStyle} value={draft.resellerIdsCsv} onChange={(e) => setDraft((d) => ({ ...d, resellerIdsCsv: e.target.value }))} placeholder="e.g. ab12cd, ef34gh" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Emails (CSV)</div>
                <input style={inputStyle} value={draft.emailsCsv} onChange={(e) => setDraft((d) => ({ ...d, emailsCsv: e.target.value }))} placeholder="e.g. a@x.com, b@y.com" />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving || !draft.name.trim()} onClick={create}>
                {saving ? 'Saving...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

