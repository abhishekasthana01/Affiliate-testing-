import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PrivateRoute } from '../routes/PrivateRoute';

export default function Marketing() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'create' | 'templates'>('campaigns');

  return (
    <PrivateRoute>
      <div className="stack">
        <div className="row-between">
          <h1 className="title-xl">Email Marketing</h1>
          <Button variant="primary" onClick={() => setActiveTab('create')}>
            + New Campaign
          </Button>
        </div>

        {/* Tabs */}
        <div className="row" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          <button 
            className={`btn-ghost ${activeTab === 'campaigns' ? 'active' : ''}`}
            style={{ 
              border: 0, 
              borderBottom: activeTab === 'campaigns' ? '2px solid var(--primary)' : '2px solid transparent', 
              borderRadius: 0,
              background: 'transparent',
              color: activeTab === 'campaigns' ? 'var(--primary)' : 'var(--muted)',
              fontWeight: activeTab === 'campaigns' ? 700 : 400
            }}
            onClick={() => setActiveTab('campaigns')}
          >
            Campaigns
          </button>
          <button 
            className={`btn-ghost ${activeTab === 'templates' ? 'active' : ''}`}
            style={{ 
              border: 0, 
              borderBottom: activeTab === 'templates' ? '2px solid var(--primary)' : '2px solid transparent', 
              borderRadius: 0,
              background: 'transparent',
              color: activeTab === 'templates' ? 'var(--primary)' : 'var(--muted)',
              fontWeight: activeTab === 'templates' ? 700 : 400
            }}
            onClick={() => setActiveTab('templates')}
          >
            Templates
          </button>
        </div>

        {activeTab === 'campaigns' && <CampaignList />}
        {activeTab === 'create' && <CreateCampaign onCancel={() => setActiveTab('campaigns')} />}
        {activeTab === 'templates' && <TemplateGallery />}
      </div>
    </PrivateRoute>
  );
}

function CampaignList() {
  // Mock data
  const campaigns = [
    { id: 1, name: 'Summer Sale', status: 'Sent', sent: 1200, openRate: '24%', clickRate: '4%' },
    { id: 2, name: 'Welcome Series', status: 'Active', sent: 450, openRate: '65%', clickRate: '12%' },
  ];

  return (
    <Card>
      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={{ padding: 12 }}>Name</th>
            <th style={{ padding: 12 }}>Status</th>
            <th style={{ padding: 12 }}>Sent</th>
            <th style={{ padding: 12 }}>Open Rate</th>
            <th style={{ padding: 12 }}>Click Rate</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map(c => (
            <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: 12, fontWeight: 600 }}>{c.name}</td>
              <td style={{ padding: 12 }}><span style={{ background: c.status === 'Active' ? '#dcfce7' : '#f1f5f9', color: c.status === 'Active' ? '#166534' : '#475569', padding: '4px 8px', borderRadius: 12, fontSize: 12 }}>{c.status}</span></td>
              <td style={{ padding: 12 }}>{c.sent}</td>
              <td style={{ padding: 12 }}>{c.openRate}</td>
              <td style={{ padding: 12 }}>{c.clickRate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function CreateCampaign({ onCancel }: { onCancel: () => void }) {
  return (
    <Card>
      <div className="stack-sm">
        <h2 className="title-lg">Create Campaign</h2>
        <div className="form-group">
          <label className="label">Campaign Name</label>
          <Input placeholder="e.g., Black Friday Sale" />
        </div>
        <div className="form-group">
          <label className="label">Subject Line</label>
          <Input placeholder="Don't miss out!" />
        </div>
        <div className="form-group">
          <label className="label">Content (Template Builder)</label>
          <div style={{ height: 200, border: '1px dashed var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', background: '#f8fafc' }}>
            Drag & Drop Editor Placeholder
          </div>
        </div>
        <div className="row">
          <Button variant="primary">Schedule Campaign</Button>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </Card>
  );
}

function TemplateGallery() {
  return (
    <div className="grid-3">
      {[1, 2, 3].map(i => (
        <Card key={i} style={{ cursor: 'pointer', border: '1px solid var(--border)' }}>
          <div style={{ height: 120, background: '#f1f5f9', marginBottom: 12, borderRadius: 4 }}></div>
          <div className="title-sm">Template {i}</div>
        </Card>
      ))}
    </div>
  );
}
