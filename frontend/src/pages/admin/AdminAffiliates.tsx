import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Loader } from '../../components/ui/Loader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Affiliate {
  _id: string;
  name: string;
  email: string;
  resellerId: string;
  isActive: boolean;
  totalEarnings: number;
  totalSales: number;
  totalConversions: number;
  totalClicks: number;
  conversionRate: number;
  createdAt: string;
}

export default function AdminAffiliates() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAffiliates();
  }, []);

  const loadAffiliates = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAffiliateStats();
      setAffiliates(response.data.data.topAffiliates);
      setSummary(response.data.data.summary);
    } catch (error) {
      console.error('Failed to load affiliates:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  const chartData = affiliates.slice(0, 10).map(a => ({
    name: a.name.length > 10 ? a.name.substring(0, 10) + '...' : a.name,
    earnings: a.totalEarnings,
    conversions: a.totalConversions,
    rate: parseFloat(a.conversionRate?.toFixed(1) || '0')
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Affiliate Management</h1>
          <p style={{ color: '#6B7280', margin: '8px 0 0' }}>Track performance and manage all affiliates</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#6B7280', fontSize: '14px' }}>Total Affiliates</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#5030E2' }}>{summary.totalAffiliates}</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#6B7280', fontSize: '14px' }}>Active</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10B981' }}>{summary.activeAffiliates}</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#6B7280', fontSize: '14px' }}>Total Revenue</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3B82F6' }}>${summary.totalRevenue?.toLocaleString() || 0}</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#6B7280', fontSize: '14px' }}>Commission Paid</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#F59E0B' }}>${summary.totalCommission?.toLocaleString() || 0}</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#6B7280', fontSize: '14px' }}>Avg. Conversion</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#EC4899' }}>{summary.averageConversionRate}%</div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: '18px' }}>Top Performers</h3>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="earnings" fill="#5030E2" name="Earnings ($)" />
              <Bar dataKey="conversions" fill="#54D9C9" name="Conversions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #E5E7EB' }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>All Affiliates</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Affiliate</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Reseller ID</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Earnings</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Sales</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Clicks</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Conversions</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Conv. Rate</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {affiliates.map((affiliate) => (
              <tr key={affiliate._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', fontWeight: 'bold' }}>
                      {affiliate.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600' }}>{affiliate.name}</div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>{affiliate.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '13px' }}>{affiliate.resellerId}</td>
                <td style={{ padding: '16px', fontWeight: '600', color: '#10B981' }}>${affiliate.totalEarnings?.toLocaleString() || 0}</td>
                <td style={{ padding: '16px' }}>${affiliate.totalSales?.toLocaleString() || 0}</td>
                <td style={{ padding: '16px' }}>{affiliate.totalClicks || 0}</td>
                <td style={{ padding: '16px' }}>{affiliate.totalConversions || 0}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ padding: '4px 8px', background: Number(affiliate.conversionRate) > 5 ? '#D1FAE5' : '#FEF3C7', borderRadius: '4px', fontSize: '12px', color: Number(affiliate.conversionRate) > 5 ? '#059669' : '#D97706' }}>
                    {Number(Number(affiliate.conversionRate || 0).toFixed(1))}%
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: affiliate.isActive ? '#D1FAE5' : '#FEE2E2', color: affiliate.isActive ? '#059669' : '#DC2626' }}>
                    {affiliate.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
