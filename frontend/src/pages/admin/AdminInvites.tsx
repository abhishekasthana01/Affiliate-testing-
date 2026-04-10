import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Loader } from '../../components/ui/Loader';

type Invite = {
  _id: string;
  email: string;
  expiresAt: string;
  usedAt?: string | null;
  isSuperAdmin?: boolean;
  note?: string;
  createdAt: string;
};

export default function AdminInvites() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Invite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: '',
    expiresInMinutes: 60,
    isSuperAdmin: false,
    note: '',
  });

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await adminService.listAdminInvites();
      setItems(res.data?.data ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load invites (Superadmin only).');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    try {
      setCreating(true);
      setInviteUrl(null);
      const res = await adminService.createAdminInvite(form);
      setInviteUrl(res.data?.data?.inviteUrl ?? null);
      setForm({ email: '', expiresInMinutes: 60, isSuperAdmin: false, note: '' });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create invite');
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm('Revoke this invite?')) return;
    await adminService.revokeAdminInvite(id);
    await load();
  };

  if (loading) return <Loader />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 'bold', margin: 0 }}>Admin Invites</h1>
          <p style={{ color: '#6B7280', margin: '8px 0 0' }}>Superadmin can invite other admins securely.</p>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.8fr 1fr', gap: 12, alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Email</div>
            <input className="input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="newadmin@company.com" />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Expires (minutes)</div>
            <input className="input" type="number" min={15} max={1440} value={form.expiresInMinutes} onChange={(e) => setForm((f) => ({ ...f, expiresInMinutes: Number(e.target.value) }))} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: '#374151',
                fontWeight: 800,
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 12,
                background: 'rgba(25,25,25,0.02)',
              }}
            >
              <input
                type="checkbox"
                checked={form.isSuperAdmin}
                onChange={(e) => setForm((f) => ({ ...f, isSuperAdmin: e.target.checked }))}
              />
              Superadmin
            </label>
            <button
              className="btn btn-primary"
              style={{ padding: '12px 16px', borderRadius: 12 }}
              disabled={creating || !form.email.trim()}
              onClick={create}
            >
              {creating ? 'Creating…' : 'Create invite'}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Note (optional)</div>
          <input className="input" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="e.g. Finance admin" />
        </div>

        {inviteUrl && (
          <div style={{ marginTop: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 10, background: '#F9FAFB' }}>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>Invite link</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" value={inviteUrl} readOnly />
              <button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(inviteUrl)}>Copy</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              In production this is emailed; in dev it’s shown here and logged in backend console.
            </div>
          </div>
        )}
      </div>

      <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <th style={{ textAlign: 'left', padding: 16, fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Email</th>
              <th style={{ textAlign: 'left', padding: 16, fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Expires</th>
              <th style={{ textAlign: 'left', padding: 16, fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Status</th>
              <th style={{ textAlign: 'left', padding: 16, fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const expired = new Date(i.expiresAt).getTime() < Date.now();
              const used = Boolean(i.usedAt);
              const status = used ? 'used' : expired ? 'expired' : 'active';
              return (
                <tr key={i._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: 16 }}>
                    <div style={{ fontWeight: 800 }}>{i.email}</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>{i.isSuperAdmin ? 'superadmin invite' : 'admin invite'}{i.note ? ` • ${i.note}` : ''}</div>
                  </td>
                  <td style={{ padding: 16, color: '#6B7280', fontSize: 13 }}>{new Date(i.expiresAt).toLocaleString()}</td>
                  <td style={{ padding: 16 }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 800,
                      background: status === 'active' ? '#D1FAE5' : status === 'expired' ? '#FEF3C7' : '#F3F4F6',
                      color: status === 'active' ? '#059669' : status === 'expired' ? '#D97706' : '#6B7280',
                    }}>
                      {status}
                    </span>
                  </td>
                  <td style={{ padding: 16 }}>
                    <button className="btn btn-ghost" disabled={used} onClick={() => revoke(i._id)}>Revoke</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: '#6B7280' }}>No invites yet.</div>}
      </div>
    </div>
  );
}

