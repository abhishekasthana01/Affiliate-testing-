import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Loader } from '../../components/ui/Loader';

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await adminService.getSettings();
      setFormData(response.data.data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await adminService.updateSettings(formData);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>System Settings</h1>
          <p style={{ color: '#6B7280', margin: '8px 0 0' }}>Configure platform-wide settings and preferences</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '18px' }}>Commission Settings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Default Commission Rate (%)</label>
              <input
                type="number"
                value={formData.commissionRate}
                onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) })}
                style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
              />
              <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>The percentage affiliates earn from each sale</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Platform Fee (%)</label>
              <input
                type="number"
                value={formData.platformFee}
                onChange={(e) => setFormData({ ...formData, platformFee: parseFloat(e.target.value) })}
                style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
              />
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '18px' }}>Payout Settings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Minimum Payout Amount ($)</label>
              <input
                type="number"
                value={formData.minPayoutAmount}
                onChange={(e) => setFormData({ ...formData, minPayoutAmount: parseFloat(e.target.value) })}
                style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
              />
              <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Minimum amount required for a payout request</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Enabled Payment Methods</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['beam_wallet', 'bank_transfer', 'paypal'].map((method) => (
                  <label key={method} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={formData.payoutMethods?.includes(method)}
                      onChange={(e) => {
                        const methods = e.target.checked
                          ? [...(formData.payoutMethods || []), method]
                          : (formData.payoutMethods || []).filter((m: string) => m !== method);
                        setFormData({ ...formData, payoutMethods: methods });
                      }}
                    />
                    <span style={{ textTransform: 'capitalize' }}>{method.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '18px' }}>Fraud Detection Thresholds</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#10B981' }}>Low Risk</label>
              <input
                type="number"
                value={formData.fraudThresholds?.low}
                onChange={(e) => setFormData({ ...formData, fraudThresholds: { ...formData.fraudThresholds, low: parseInt(e.target.value) } })}
                style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#F59E0B' }}>Medium Risk</label>
              <input
                type="number"
                value={formData.fraudThresholds?.medium}
                onChange={(e) => setFormData({ ...formData, fraudThresholds: { ...formData.fraudThresholds, medium: parseInt(e.target.value) } })}
                style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#EF4444' }}>High Risk</label>
              <input
                type="number"
                value={formData.fraudThresholds?.high}
                onChange={(e) => setFormData({ ...formData, fraudThresholds: { ...formData.fraudThresholds, high: parseInt(e.target.value) } })}
                style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#991B1B' }}>Critical Risk</label>
              <input
                type="number"
                value={formData.fraudThresholds?.critical}
                onChange={(e) => setFormData({ ...formData, fraudThresholds: { ...formData.fraudThresholds, critical: parseInt(e.target.value) } })}
                style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
              />
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '12px' }}>
            Transactions with fraud scores at or above these thresholds will be flagged accordingly
          </p>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '18px' }}>Email Settings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>From Name</label>
              <input
                type="text"
                value={formData.emailSettings?.fromName}
                onChange={(e) => setFormData({ ...formData, emailSettings: { ...formData.emailSettings, fromName: e.target.value } })}
                style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>From Email</label>
              <input
                type="email"
                value={formData.emailSettings?.fromEmail}
                onChange={(e) => setFormData({ ...formData, emailSettings: { ...formData.emailSettings, fromEmail: e.target.value } })}
                style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '14px' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
