import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Loader } from '../../components/ui/Loader';

interface Transaction {
  _id: string;
  resellerId: string;
  amount: number;
  fraudScore: number;
  riskLevel: string;
  riskFactors: string[];
  customerEmail: string;
  productDetails: { name: string };
  status: string;
  createdAt: string;
}

export default function AdminFraud() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFraudData();
  }, []);

  const loadFraudData = async () => {
    try {
      setLoading(true);
      const response = await adminService.getFraudAnalysis();
      setData(response.data.data);
    } catch (error) {
      console.error('Failed to load fraud data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    const notes = prompt('Add review notes:');
    try {
      await adminService.reviewFraudTransaction({ id, action, notes });
      loadFraudData();
    } catch (error) {
      console.error('Failed to review transaction:', error);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return '#991B1B';
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  if (loading) return <Loader />;

  const fraudSummary = data?.fraudSummary || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Fraud Detection</h1>
          <p style={{ color: '#6B7280', margin: '8px 0 0' }}>Monitor and review flagged transactions</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#FEE2E2', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#991B1B', fontSize: '14px' }}>Critical Risk</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#DC2626' }}>
            {fraudSummary.find((f: any) => f._id === 'critical')?.count || 0}
          </div>
        </div>
        <div style={{ background: '#FFEDD5', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#9A3412', fontSize: '14px' }}>High Risk</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#EA580C' }}>
            {fraudSummary.find((f: any) => f._id === 'high')?.count || 0}
          </div>
        </div>
        <div style={{ background: '#FEF3C7', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#92400E', fontSize: '14px' }}>Medium Risk</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#D97706' }}>
            {fraudSummary.find((f: any) => f._id === 'medium')?.count || 0}
          </div>
        </div>
        <div style={{ background: '#D1FAE5', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#065F46', fontSize: '14px' }}>Low Risk</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#059669' }}>
            {fraudSummary.find((f: any) => f._id === 'low')?.count || 0}
          </div>
        </div>
      </div>

      {data?.suspiciousPatterns?.length > 0 && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#DC2626' }}>⚠️ Suspicious Patterns</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {data.suspiciousPatterns.map((pattern: any, index: number) => (
              <div key={index} style={{ padding: '16px', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                  {pattern._id}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span>Flagged: <strong>{pattern.count}</strong></span>
                  <span>Score: <strong style={{ color: '#DC2626' }}>{pattern.avgFraudScore.toFixed(0)}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #E5E7EB' }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>High Risk Transactions</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Reseller</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Product</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Amount</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Score</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Risk Level</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Factors</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Date</th>
              <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.highRiskTransactions?.map((tx: Transaction) => (
              <tr key={tx._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '13px' }}>{tx.resellerId}</td>
                <td style={{ padding: '16px', fontSize: '14px' }}>{tx.productDetails?.name || 'N/A'}</td>
                <td style={{ padding: '16px', fontWeight: '600' }}>${tx.amount.toLocaleString()}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ padding: '4px 8px', background: getRiskColor(tx.riskLevel) + '20', color: getRiskColor(tx.riskLevel), borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                    {tx.fraudScore}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{ padding: '4px 8px', background: getRiskColor(tx.riskLevel) + '20', color: getRiskColor(tx.riskLevel), borderRadius: '4px', fontSize: '12px', textTransform: 'uppercase' }}>
                    {tx.riskLevel}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {tx.riskFactors?.slice(0, 2).map((factor, i) => (
                      <span key={i} style={{ padding: '2px 6px', background: '#FEE2E2', color: '#991B1B', borderRadius: '4px', fontSize: '11px' }}>
                        {factor}
                      </span>
                    ))}
                    {tx.riskFactors?.length > 2 && (
                      <span style={{ padding: '2px 6px', background: '#FEE2E2', color: '#991B1B', borderRadius: '4px', fontSize: '11px' }}>
                        +{tx.riskFactors.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '16px', color: '#6B7280', fontSize: '14px' }}>
                  {new Date(tx.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleReview(tx._id, 'approve')}
                      style={{ padding: '6px 12px', border: '1px solid #D1FAE5', borderRadius: '6px', background: '#D1FAE5', color: '#059669', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(tx._id, 'reject')}
                      style={{ padding: '6px 12px', border: '1px solid #FEE2E2', borderRadius: '6px', background: '#FEE2E2', color: '#DC2626', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!data?.highRiskTransactions || data.highRiskTransactions.length === 0) && (
          <div style={{ padding: '48px', textAlign: 'center', color: '#10B981' }}>
            ✓ No high-risk transactions found. All clear!
          </div>
        )}
      </div>
    </div>
  );
}
