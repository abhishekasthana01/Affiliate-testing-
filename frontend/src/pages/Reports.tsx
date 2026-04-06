import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PrivateRoute } from '../routes/PrivateRoute';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export default function Reports() {
  const [dateRange, setDateRange] = useState('30d');

  // Mock data
  const data = [
    { name: 'Week 1', clicks: 4000, conversions: 240 },
    { name: 'Week 2', clicks: 3000, conversions: 139 },
    { name: 'Week 3', clicks: 2000, conversions: 980 },
    { name: 'Week 4', clicks: 2780, conversions: 390 },
  ];

  return (
    <PrivateRoute>
      <div className="stack">
        <div className="row-between">
          <h1 className="title-xl">Advanced Reports</h1>
          <div className="row">
            <select 
              className="input" 
              style={{ width: 'auto' }}
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last Quarter</option>
            </select>
            <Button variant="secondary" onClick={() => alert('Exporting CSV...')}>Export CSV</Button>
            <Button variant="secondary" onClick={() => alert('Exporting PDF...')}>Export PDF</Button>
          </div>
        </div>

        <div className="grid-3">
          <Card>
            <div className="title-sm">Engagement Rate</div>
            <div className="title-xl">4.2%</div>
            <div className="text-muted">+0.4% vs last period</div>
          </Card>
          <Card>
            <div className="title-sm">Avg. Order Value</div>
            <div className="title-xl">€1,250</div>
            <div className="text-muted">-2% vs last period</div>
          </Card>
          <Card>
            <div className="title-sm">Total Revenue Generated</div>
            <div className="title-xl">€45,200</div>
            <div className="text-muted">+12% vs last period</div>
          </Card>
        </div>

        <Card>
          <div className="title-lg" style={{ marginBottom: 16 }}>Performance Comparison</div>
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="clicks" fill="#8884d8" name="Clicks" />
                <Bar dataKey="conversions" fill="#82ca9d" name="Conversions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="title-lg" style={{ marginBottom: 16 }}>Detailed Breakdown</div>
          <table style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: 12 }}>Source</th>
                <th style={{ padding: 12 }}>Clicks</th>
                <th style={{ padding: 12 }}>Conversions</th>
                <th style={{ padding: 12 }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: 12 }}>Social Media</td>
                <td style={{ padding: 12 }}>5,200</td>
                <td style={{ padding: 12 }}>120</td>
                <td style={{ padding: 12 }}>€24,000</td>
              </tr>
              <tr>
                <td style={{ padding: 12 }}>Email</td>
                <td style={{ padding: 12 }}>3,100</td>
                <td style={{ padding: 12 }}>350</td>
                <td style={{ padding: 12 }}>€62,000</td>
              </tr>
              <tr>
                <td style={{ padding: 12 }}>Direct</td>
                <td style={{ padding: 12 }}>1,200</td>
                <td style={{ padding: 12 }}>80</td>
                <td style={{ padding: 12 }}>₹14,500</td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>
    </PrivateRoute>
  );
}
