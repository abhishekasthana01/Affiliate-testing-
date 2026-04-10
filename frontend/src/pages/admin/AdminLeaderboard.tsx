import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Loader } from '../../components/ui/Loader';

export default function AdminLeaderboard() {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await adminService.getLeaderboard({ range, limit: 20 });
      setData(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [range]);

  if (loading) return <Loader />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 'bold', margin: 0 }}>Leaderboard</h1>
          <p style={{ color: '#6B7280', margin: '8px 0 0' }}>Top affiliates by revenue</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['7d', '30d', '90d'] as const).map((r) => (
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

      <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <th style={{ textAlign: 'left', padding: 16, fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Rank</th>
              <th style={{ textAlign: 'left', padding: 16, fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Reseller</th>
              <th style={{ textAlign: 'left', padding: 16, fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Revenue</th>
              <th style={{ textAlign: 'left', padding: 16, fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Commission</th>
              <th style={{ textAlign: 'left', padding: 16, fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Conversions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.leaderboard || []).map((row: any, idx: number) => (
              <tr key={row._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: 16, fontWeight: 800 }}>{idx + 1}</td>
                <td style={{ padding: 16, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace' }}>
                  {row._id}
                </td>
                <td style={{ padding: 16, fontWeight: 800 }}>${Number(row.revenue || 0).toLocaleString()}</td>
                <td style={{ padding: 16, color: '#10B981', fontWeight: 700 }}>${Number(row.commission || 0).toLocaleString()}</td>
                <td style={{ padding: 16 }}>{Number(row.conversions || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!data?.leaderboard || data.leaderboard.length === 0) && (
          <div style={{ padding: 48, textAlign: 'center', color: '#6B7280' }}>No data yet.</div>
        )}
      </div>
    </div>
  );
}

