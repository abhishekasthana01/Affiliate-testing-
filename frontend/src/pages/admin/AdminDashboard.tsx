import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader } from '../../components/ui/Loader';

interface DashboardData {
  overview: {
    totalUsers: number;
    totalResellers: number;
    totalProducts: number;
    totalTransactions: number;
    pendingPayouts: number;
    totalRevenue: number;
  };
  recentTransactions: any[];
  recentUsers: any[];
  topAffiliates: any[];
  chartData: {
    revenue: any[];
    conversions: any;
    traffic: any[];
  };
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [response, lb] = await Promise.all([
        adminService.getDashboard(),
        adminService.getLeaderboard({ range: '30d', limit: 5 }),
      ]);
      setData(response.data.data);
      setLeaderboard(lb.data?.data?.leaderboard ?? []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  if (!data) return <div>Failed to load dashboard</div>;

  const stats = [
    { label: 'Total Users', value: data.overview.totalUsers, icon: '👥', color: '#5030E2' },
    { label: 'Resellers', value: data.overview.totalResellers, icon: '🤝', color: '#54D9C9' },
    { label: 'Products', value: data.overview.totalProducts, icon: '📦', color: '#FFA500' },
    { label: 'Transactions', value: data.overview.totalTransactions, icon: '🛒', color: '#3B82F6' },
    { label: 'Pending Payouts', value: data.overview.pendingPayouts, icon: '⏳', color: '#EF4444' },
    { label: 'Revenue', value: `$${data.overview.totalRevenue.toLocaleString()}`, icon: '💰', color: '#10B981' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Admin Dashboard</h1>
          <p style={{ color: '#6B7280', margin: '8px 0 0' }}>Overview of your platform</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/admin/users" className="btn btn-primary">Manage Users</Link>
          <Link to="/admin/products" className="btn btn-primary">Manage Products</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '32px' }}>{stat.icon}</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
            <div style={{ color: '#6B7280', fontSize: '14px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '18px' }}>Revenue Trend (30 Days)</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chartData.revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#5030E2" strokeWidth={2} />
                <Line type="monotone" dataKey="commission" stroke="#54D9C9" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '18px' }}>Conversion Stats</h3>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#5030E2' }}>
              {data.chartData.conversions.rate}%
            </div>
            <div style={{ color: '#6B7280' }}>Conversion Rate</div>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '24px' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.chartData.conversions.clicks}</div>
                <div style={{ color: '#6B7280', fontSize: '14px' }}>Clicks</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.chartData.conversions.conversions}</div>
                <div style={{ color: '#6B7280', fontSize: '14px' }}>Conversions</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Top Affiliates</h3>
            <Link to="/admin/affiliates" style={{ color: '#5030E2', fontSize: '14px' }}>View All</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.topAffiliates.map((affiliate: any, index: number) => (
              <div key={affiliate._id || index} style={{ display: 'flex', alignItems: 'center', padding: '12px', background: '#F9FAFB', borderRadius: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#5030E2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', fontWeight: 'bold' }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600' }}>{affiliate.name}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>{affiliate.resellerId}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '600', color: '#10B981' }}>${affiliate.totalEarnings?.toLocaleString() || 0}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>{affiliate.totalConversions || 0} sales</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Leaderboard (30d)</h3>
            <Link to="/admin/leaderboard" style={{ color: '#5030E2', fontSize: '14px' }}>View All</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {leaderboard.map((row: any, index: number) => (
              <div key={row._id} style={{ display: 'flex', alignItems: 'center', padding: '12px', background: '#F9FAFB', borderRadius: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#111827', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', fontWeight: 'bold' }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontFamily: 'monospace', fontSize: 13 }}>{row._id}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>{Number(row.conversions || 0)} conversions</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '800' }}>${Number(row.revenue || 0).toLocaleString()}</div>
                  <div style={{ fontSize: '12px', color: '#10B981' }}>${Number(row.commission || 0).toLocaleString()} commission</div>
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && <div style={{ color: '#6B7280' }}>No leaderboard data yet.</div>}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Recent Users</h3>
            <Link to="/admin/users" style={{ color: '#5030E2', fontSize: '14px' }}>View All</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.recentUsers.map((user: any) => (
              <div key={user._id} style={{ display: 'flex', alignItems: 'center', padding: '12px', background: '#F9FAFB', borderRadius: '8px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', fontWeight: 'bold' }}>
                  {user.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600' }}>{user.name}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>{user.email}</div>
                </div>
                <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', background: user.role === 'admin' ? '#5030E2' : '#54D9C9', color: 'white' }}>
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>Recent Transactions</h3>
          <Link to="/admin/orders" style={{ color: '#5030E2', fontSize: '14px' }}>View All</Link>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
              <th style={{ textAlign: 'left', padding: '12px', color: '#6B7280', fontSize: '12px' }}>Reseller</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#6B7280', fontSize: '12px' }}>Product</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#6B7280', fontSize: '12px' }}>Amount</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#6B7280', fontSize: '12px' }}>Commission</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#6B7280', fontSize: '12px' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#6B7280', fontSize: '12px' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {data.recentTransactions.map((tx: any) => (
              <tr key={tx._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '12px' }}>{tx.resellerId}</td>
                <td style={{ padding: '12px' }}>{tx.productDetails?.name || 'N/A'}</td>
                <td style={{ padding: '12px' }}>${tx.amount}</td>
                <td style={{ padding: '12px', color: '#10B981' }}>${tx.commissionAmount}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: tx.status === 'paid' ? '#D1FAE5' : tx.status === 'approved' ? '#DBEAFE' : tx.status === 'pending' ? '#FEF3C7' : '#FEE2E2', color: tx.status === 'paid' ? '#059669' : tx.status === 'approved' ? '#2563EB' : tx.status === 'pending' ? '#D97706' : '#DC2626' }}>
                    {tx.status}
                  </span>
                </td>
                <td style={{ padding: '12px', color: '#6B7280', fontSize: '14px' }}>{new Date(tx.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
