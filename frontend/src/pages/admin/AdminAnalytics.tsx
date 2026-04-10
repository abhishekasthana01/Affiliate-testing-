import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Loader } from '../../components/ui/Loader';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function AdminAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');
  const [funnel, setFunnel] = useState<any>(null);
  const [realtime, setRealtime] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, [range]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [response, funnelResp, rtResp] = await Promise.all([
        adminService.getAnalytics({ range }),
        adminService.getFunnelAnalytics({ range }),
        adminService.getRealtimeAnalytics({ minutes: 10 }),
      ]);
      setData(response.data.data);
      setFunnel(funnelResp.data.data);
      setRealtime(rtResp.data.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  const COLORS = ['#5030E2', '#54D9C9', '#F59E0B', '#EF4444'];

  const fraudPieData = data?.fraudStats?.map((f: any) => ({
    name: f._id,
    value: f.count
  })) || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Analytics Dashboard</h1>
          <p style={{ color: '#6B7280', margin: '8px 0 0' }}>Detailed insights into platform performance</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['7d', '30d', '90d'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: '8px 16px',
                border: '1px solid',
                borderColor: range === r ? '#5030E2' : '#E5E7EB',
                borderRadius: '6px',
                background: range === r ? '#5030E2' : 'white',
                color: range === r ? 'white' : '#6B7280',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '18px' }}>Revenue Trend</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.revenueTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#5030E2" strokeWidth={2} name="Revenue ($)" />
                <Line type="monotone" dataKey="commission" stroke="#54D9C9" strokeWidth={2} name="Commission ($)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '18px' }}>Fraud Distribution</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fraudPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(((percent ?? 0) * 100)).toFixed(0)}%)`}
                >
                  {fraudPieData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '18px' }}>New Affiliates</h3>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.affiliatePerformance || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="newAffiliates" fill="#5030E2" name="New Affiliates" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '18px' }}>Top Products</h3>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.productPerformance || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="_id" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#54D9C9" name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: '18px' }}>Traffic Sources</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          {data?.trafficSources?.map((source: any, index: number) => (
            <div key={source._id} style={{ padding: '16px', background: '#F9FAFB', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: COLORS[index % COLORS.length] }}>{source.clicks}</div>
              <div style={{ color: '#6B7280', fontSize: '14px', textTransform: 'capitalize' }}>{source._id || 'Direct'}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '18px' }}>Conversion Funnel (Sessions)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(funnel?.steps || []).map((s: any, idx: number) => (
              <div key={s.step || idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#F9FAFB', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{String(s.step).replace('_', ' ')}</div>
                <div style={{ fontWeight: 700 }}>{Number(s.sessions || 0).toLocaleString()}</div>
              </div>
            ))}
            {(!funnel?.steps || funnel.steps.length === 0) && <div style={{ color: '#6B7280' }}>No funnel data yet.</div>}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '18px' }}>Real-time (Last 10 min)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '14px', background: '#F9FAFB', borderRadius: '8px' }}>
              <div style={{ color: '#6B7280', fontSize: '12px' }}>Conversions</div>
              <div style={{ fontSize: '22px', fontWeight: 800 }}>{Number(realtime?.conversions || 0).toLocaleString()}</div>
            </div>
            {(realtime?.events || []).slice(0, 5).map((e: any) => (
              <div key={e._id} style={{ padding: '14px', background: '#F9FAFB', borderRadius: '8px' }}>
                <div style={{ color: '#6B7280', fontSize: '12px' }}>{e._id}</div>
                <div style={{ fontSize: '22px', fontWeight: 800 }}>{Number(e.count || 0).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
