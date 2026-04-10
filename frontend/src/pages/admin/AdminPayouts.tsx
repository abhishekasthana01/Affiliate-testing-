import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Loader } from '../../components/ui/Loader';

interface Payout {
  _id: string;
  resellerId: string;
  amount: number;
  currency: string;
  status: 'requested' | 'processing' | 'paid' | 'rejected';
  method: string;
  destination: string;
  notes: string;
  createdAt: string;
  processedAt: string;
}

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [stats, setStats] = useState<any[]>([]);
  const [filters, setFilters] = useState({ status: '', method: '' });

  useEffect(() => {
    loadPayouts();
  }, [pagination.page, filters]);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      const params: any = { page: pagination.page, limit: pagination.limit };
      if (filters.status) params.status = filters.status;
      if (filters.method) params.method = filters.method;
      
      const response = await adminService.getPayouts(params);
      setPayouts(response.data.data.payouts);
      setStats(response.data.data.stats);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Failed to load payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (id: string, status: 'processing' | 'paid' | 'rejected') => {
    const notes = prompt('Add notes (optional):');
    try {
      await adminService.processPayout(id, { status, notes });
      loadPayouts();
    } catch (error) {
      console.error('Failed to process payout:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return { bg: '#D1FAE5', text: '#059669' };
      case 'processing': return { bg: '#DBEAFE', text: '#2563EB' };
      case 'requested': return { bg: '#FEF3C7', text: '#D97706' };
      case 'rejected': return { bg: '#FEE2E2', text: '#DC2626' };
      default: return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'beam_wallet': return 'Beam Wallet';
      case 'bank_transfer': return 'Bank Transfer';
      case 'paypal': return 'PayPal';
      default: return method;
    }
  };

  const statsByStatus = {
    requested: stats.find(s => s._id === 'requested')?.total || 0,
    processing: stats.find(s => s._id === 'processing')?.total || 0,
    paid: stats.find(s => s._id === 'paid')?.total || 0,
    rejected: stats.find(s => s._id === 'rejected')?.total || 0,
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Payout Management</h1>
          <p style={{ color: '#6B7280', margin: '8px 0 0' }}>Process and manage affiliate payout requests</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#FEF3C7', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#92400E', fontSize: '14px' }}>Pending</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#D97706' }}>${statsByStatus.requested.toLocaleString()}</div>
        </div>
        <div style={{ background: '#DBEAFE', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#1E40AF', fontSize: '14px' }}>Processing</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2563EB' }}>${statsByStatus.processing.toLocaleString()}</div>
        </div>
        <div style={{ background: '#D1FAE5', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#065F46', fontSize: '14px' }}>Paid</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#059669' }}>${statsByStatus.paid.toLocaleString()}</div>
        </div>
        <div style={{ background: '#FEE2E2', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#991B1B', fontSize: '14px' }}>Rejected</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#DC2626' }}>${statsByStatus.rejected.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            style={{ padding: '10px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
          >
            <option value="">All Status</option>
            <option value="requested">Requested</option>
            <option value="processing">Processing</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={filters.method}
            onChange={(e) => setFilters({ ...filters, method: e.target.value })}
            style={{ padding: '10px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
          >
            <option value="">All Methods</option>
            <option value="beam_wallet">Beam Wallet</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="paypal">PayPal</option>
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
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Reseller ID</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Method</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Destination</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Requested</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => {
                  const statusColor = getStatusColor(payout.status);
                  return (
                    <tr key={payout._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '13px' }}>{payout.resellerId}</td>
                      <td style={{ padding: '16px', fontWeight: '600', fontSize: '16px' }}>
                        {payout.currency} {payout.amount.toLocaleString()}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ padding: '4px 8px', background: '#F3F4F6', borderRadius: '4px', fontSize: '12px' }}>
                          {getMethodLabel(payout.method)}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '13px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {payout.destination || '-'}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: statusColor.bg, color: statusColor.text }}>
                          {payout.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: '#6B7280', fontSize: '14px' }}>
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px' }}>
                        {payout.status === 'requested' && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleProcess(payout._id, 'processing')}
                              style={{ padding: '6px 12px', border: '1px solid #D1FAE5', borderRadius: '6px', background: '#D1FAE5', color: '#059669', cursor: 'pointer', fontSize: '12px' }}
                            >
                              Process
                            </button>
                            <button
                              onClick={() => handleProcess(payout._id, 'rejected')}
                              style={{ padding: '6px 12px', border: '1px solid #FEE2E2', borderRadius: '6px', background: '#FEE2E2', color: '#DC2626', cursor: 'pointer', fontSize: '12px' }}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {payout.status === 'processing' && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleProcess(payout._id, 'paid')}
                              style={{ padding: '6px 12px', border: '1px solid #D1FAE5', borderRadius: '6px', background: '#D1FAE5', color: '#059669', cursor: 'pointer', fontSize: '12px' }}
                            >
                              Mark Paid
                            </button>
                            <button
                              onClick={() => handleProcess(payout._id, 'rejected')}
                              style={{ padding: '6px 12px', border: '1px solid #FEE2E2', borderRadius: '6px', background: '#FEE2E2', color: '#DC2626', cursor: 'pointer', fontSize: '12px' }}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {payout.status === 'paid' && (
                          <span style={{ color: '#10B981', fontSize: '14px' }}>Completed</span>
                        )}
                        {payout.status === 'rejected' && (
                          <span style={{ color: '#EF4444', fontSize: '14px' }}>Rejected</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
            <div style={{ color: '#6B7280', fontSize: '14px' }}>
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} payouts
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
