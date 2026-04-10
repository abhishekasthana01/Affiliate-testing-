import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Loader } from '../../components/ui/Loader';

interface Campaign {
  _id: string;
  name: string;
  subject: string;
  status: 'Draft' | 'Scheduled' | 'Sending' | 'Sent' | 'Failed';
  scheduledAt: string;
  sentAt: string;
  recipientsCount: number;
  segmentId?: any;
  recipients?: string[];
  stats: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
  };
  createdAt: string;
}

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [segments, setSegments] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshingSegments, setRefreshingSegments] = useState(false);
  const [draft, setDraft] = useState({
    name: '',
    subject: '',
    content: '',
    scheduledAt: '',
    segmentId: '',
    recipientsCsv: '',
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    if (!open) return;
    refreshSegments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const refreshSegments = async () => {
    try {
      setRefreshingSegments(true);
      const segRes = await adminService.getSegments();
      setSegments(segRes.data.data || []);
    } catch (e) {
      // keep existing segments list if refresh fails
    } finally {
      setRefreshingSegments(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const [response, segRes] = await Promise.all([
        adminService.getCampaigns(),
        adminService.getSegments(),
      ]);
      setCampaigns(response.data.data);
      setSegments(segRes.data.data || []);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await adminService.updateCampaign({ id, status });
      loadCampaigns();
    } catch (error) {
      console.error('Failed to update campaign:', error);
    }
  };

  const createCampaign = async () => {
    try {
      setSaving(true);
      const recipients = draft.recipientsCsv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await adminService.createCampaign({
        name: draft.name,
        subject: draft.subject,
        content: draft.content,
        scheduledAt: draft.scheduledAt ? new Date(draft.scheduledAt).toISOString() : undefined,
        segmentId: draft.segmentId || null,
        recipients: recipients.length ? recipients : undefined,
      });
      setOpen(false);
      setDraft({ name: '', subject: '', content: '', scheduledAt: '', segmentId: '', recipientsCsv: '' });
      await loadCampaigns();
    } catch (error) {
      console.error('Failed to create campaign:', error);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Sent': return { bg: '#D1FAE5', text: '#059669' };
      case 'Sending': return { bg: '#DBEAFE', text: '#2563EB' };
      case 'Scheduled': return { bg: '#FEF3C7', text: '#D97706' };
      case 'Draft': return { bg: '#F3F4F6', text: '#6B7280' };
      case 'Failed': return { bg: '#FEE2E2', text: '#DC2626' };
      default: return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Email Campaigns</h1>
          <p style={{ color: '#6B7280', margin: '8px 0 0' }}>Manage and monitor email marketing campaigns</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>Create Campaign</button>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Campaign</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Sent</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Opened</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Clicked</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Bounced</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Date</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => {
              const statusColor = getStatusColor(campaign.status);
              const openRate = campaign.stats.sent > 0 ? ((campaign.stats.opened / campaign.stats.sent) * 100).toFixed(1) : '0';
              const clickRate = campaign.stats.sent > 0 ? ((campaign.stats.clicked / campaign.stats.sent) * 100).toFixed(1) : '0';
              
              return (
                <tr key={campaign._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: '600' }}>{campaign.name}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>{campaign.subject}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: 4 }}>
                      Target: {campaign.recipients?.length ? `Recipients (${campaign.recipients.length})` : campaign.segmentId?.name ? `Segment: ${campaign.segmentId.name}` : '—'}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: statusColor.bg, color: statusColor.text }}>
                      {campaign.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>{campaign.stats.sent.toLocaleString()}</td>
                  <td style={{ padding: '16px' }}>
                    <div>{campaign.stats.opened.toLocaleString()}</div>
                    <div style={{ fontSize: '11px', color: '#10B981' }}>{openRate}%</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div>{campaign.stats.clicked.toLocaleString()}</div>
                    <div style={{ fontSize: '11px', color: '#3B82F6' }}>{clickRate}%</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ color: campaign.stats.bounced > 0 ? '#EF4444' : '#6B7280' }}>
                      {campaign.stats.bounced}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: '#6B7280', fontSize: '14px' }}>
                    {campaign.sentAt ? new Date(campaign.sentAt).toLocaleDateString() : campaign.scheduledAt ? `Scheduled: ${new Date(campaign.scheduledAt).toLocaleDateString()}` : '-'}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {campaign.status === 'Draft' && (
                        <button onClick={() => handleUpdateStatus(campaign._id, 'Scheduled')} style={{ padding: '6px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px' }}>
                          Schedule
                        </button>
                      )}
                      {campaign.status === 'Scheduled' && (
                        <button onClick={() => handleUpdateStatus(campaign._id, 'Sending')} style={{ padding: '6px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px' }}>
                          Send Now
                        </button>
                      )}
                      <button style={{ padding: '6px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px' }}>
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {campaigns.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
            No campaigns found. Create your first campaign to get started.
          </div>
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
          <div style={{ width: '100%', maxWidth: 720, background: 'white', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Create Campaign</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={refreshSegments} disabled={refreshingSegments}>
                  {refreshingSegments ? 'Refreshing...' : 'Refresh segments'}
                </button>
                <button className="btn btn-ghost" onClick={() => setOpen(false)}>Close</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Name</div>
                <input className="input" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Schedule (optional)</div>
                <input className="input" type="datetime-local" value={draft.scheduledAt} onChange={(e) => setDraft((d) => ({ ...d, scheduledAt: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Subject</div>
                <input className="input" value={draft.subject} onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Content (HTML or text)</div>
                <textarea className="input" style={{ minHeight: 160 }} value={draft.content} onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Segment (optional)</div>
                <select className="input" value={draft.segmentId} onChange={(e) => setDraft((d) => ({ ...d, segmentId: e.target.value }))}>
                  <option value="">—</option>
                  {segments.map((s: any) => (
                    <option key={s._id} value={s._id}>{s.name} ({s.status})</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Recipients (CSV, overrides segment)</div>
                <input className="input" value={draft.recipientsCsv} onChange={(e) => setDraft((d) => ({ ...d, recipientsCsv: e.target.value }))} placeholder="a@x.com, b@y.com" />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving || !draft.name.trim() || !draft.subject.trim() || !draft.content.trim()} onClick={createCampaign}>
                {saving ? 'Saving...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
