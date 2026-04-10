import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Loader } from '../../components/ui/Loader';

interface Transaction {
  _id: string;
  resellerId: string;
  amount: number;
  commissionAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  productDetails: { name: string };
  customerEmail: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  fraudScore: number;
  createdAt: string;
}

export default function AdminOrders() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [stats, setStats] = useState({ totalAmount: 0, totalCommission: 0, count: 0 });
  const [filters, setFilters] = useState({ status: '', riskLevel: '', search: '' });

  useEffect(() => {
    loadTransactions();
  }, [pagination.page, filters]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const params: any = { page: pagination.page, limit: pagination.limit };
      if (filters.status) params.status = filters.status;
      if (filters.riskLevel) params.riskLevel = filters.riskLevel;
      if (filters.search) params.search = filters.search;
      
      const response = await adminService.getTransactions(params);
      setTransactions(response.data.data.transactions);
      setStats(response.data.data.stats);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await adminService.updateTransaction(id, { status });
      loadTransactions();
    } catch (error) {
      console.error('Failed to update transaction:', error);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'high': return '#EF4444';
      case 'critical': return '#991B1B';
      default: return '#6B7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return { bg: '#D1FAE5', text: '#059669' };
      case 'approved': return { bg: '#DBEAFE', text: '#2563EB' };
      case 'pending': return { bg: '#FEF3C7', text: '#D97706' };
      case 'rejected': return { bg: '#FEE2E2', text: '#DC2626' };
      default: return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Order Management</h1>
          <p style={{ color: '#6B7280', margin: '8px 0 0' }}>Monitor and manage all affiliate transactions</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#6B7280', fontSize: '14px' }}>Total Revenue</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#5030E2' }}>${stats.totalAmount.toLocaleString()}</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#6B7280', fontSize: '14px' }}>Total Commission Paid</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10B981' }}>${stats.totalCommission.toLocaleString()}</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#6B7280', fontSize: '14px' }}>Total Transactions</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3B82F6' }}>{stats.count}</div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by reseller, email, or payment ID..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{ flex: 1, minWidth: '200px', padding: '10px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            style={{ padding: '10px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={filters.riskLevel}
            onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
            style={{ padding: '10px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
          >
            <option value="">All Risk Levels</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <button onClick={() => setPagination({ ...pagination, page: 1 })} className="btn btn-primary">
            Filter
          </button>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Reseller</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Product</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Commission</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Risk</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const statusColor = getStatusColor(tx.status);
                  return (
                    <tr key={tx._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '13px' }}>{tx.resellerId}</div>
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>{tx.customerEmail}</div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px' }}>{tx.productDetails?.name || 'N/A'}</td>
                      <td style={{ padding: '16px', fontWeight: '600' }}>${tx.amount.toLocaleString()}</td>
                      <td style={{ padding: '16px', fontWeight: '600', color: '#10B981' }}>${tx.commissionAmount.toLocaleString()}</td>
                      <td style={{ padding: '16px' }}>
                        <select
                          value={tx.status}
                          onChange={(e) => handleUpdateStatus(tx._id, e.target.value)}
                          style={{ padding: '4px 8px', border: 'none', borderRadius: '4px', fontSize: '12px', background: statusColor.bg, color: statusColor.text, cursor: 'pointer' }}
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="paid">Paid</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: getRiskColor(tx.riskLevel) + '20', color: getRiskColor(tx.riskLevel) }}>
                          {tx.riskLevel} ({tx.fraudScore})
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: '#6B7280', fontSize: '14px' }}>
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <button style={{ padding: '6px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px' }}>
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
            <div style={{ color: '#6B7280', fontSize: '14px' }}>
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} transactions
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })} disabled={pagination.page === 1} style={{ padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '6px', background: 'white', cursor: pagination.page === 1 ? 'not-allowed' : 'pointer', opacity: pagination.page === 1 ? 0.5 : 1 }}>
                Previous
              </button>
              <button onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })} disabled={pagination.page >= pagination.pages} style={{ padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '6px', background: 'white', cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer', opacity: pagination.page >= pagination.pages ? 0.5 : 1 }}>
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
