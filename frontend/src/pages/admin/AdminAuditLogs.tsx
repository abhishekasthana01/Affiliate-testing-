import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Loader } from '../../components/ui/Loader';

interface AuditLog {
  _id: string;
  userId: { name: string; email: string; role: string } | null;
  action: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [filters, setFilters] = useState({ action: '' });
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, [pagination.page, filters]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params: any = { page: pagination.page, limit: pagination.limit };
      if (filters.action) params.action = filters.action;
      
      const response = await adminService.getAuditLogs(params);
      setLogs(response.data.data.logs);
      setActionTypes(response.data.data.actionTypes);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('DELETE') || action.includes('DELETED')) return '#EF4444';
    if (action.includes('CREATE') || action.includes('CREATED')) return '#10B981';
    if (action.includes('UPDATE') || action.includes('UPDATED')) return '#3B82F6';
    if (action.includes('USER')) return '#8B5CF6';
    if (action.includes('FRAUD')) return '#F59E0B';
    if (action.includes('PAYOUT')) return '#EC4899';
    return '#6B7280';
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Audit Logs</h1>
          <p style={{ color: '#6B7280', margin: '8px 0 0' }}>Track all administrative actions and system changes</p>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#6B7280' }}>Filter by Action:</span>
          <select
            value={filters.action}
            onChange={(e) => { setFilters({ ...filters, action: e.target.value }); setPagination({ ...pagination, page: 1 }); }}
            style={{ padding: '10px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
          >
            <option value="">All Actions</option>
            {actionTypes.map((type) => (
              <option key={type} value={type}>{formatAction(type)}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#F9FAFB', zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Timestamp</th>
                    <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>User</th>
                    <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Action</th>
                    <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>IP Address</th>
                    <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <>
                      <tr key={log._id} style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }} onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}>
                        <td style={{ padding: '16px', fontSize: '13px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '16px' }}>
                          {log.userId ? (
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '14px' }}>{log.userId.name}</div>
                              <div style={{ fontSize: '12px', color: '#6B7280' }}>{log.userId.email}</div>
                            </div>
                          ) : (
                            <span style={{ color: '#9CA3AF' }}>System</span>
                          )}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: getActionColor(log.action) + '20', color: getActionColor(log.action), fontWeight: '500' }}>
                            {formatAction(log.action)}
                          </span>
                        </td>
                        <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '12px', color: '#6B7280' }}>
                          {log.ipAddress || '-'}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ color: '#5030E2', fontSize: '13px' }}>
                            {expandedLog === log._id ? '▼ Hide' : '▶ Show'}
                          </span>
                        </td>
                      </tr>
                      {expandedLog === log._id && log.details && (
                        <tr style={{ background: '#F9FAFB' }}>
                          <td colSpan={5} style={{ padding: '16px' }}>
                            <div style={{ background: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                              <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {logs.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
                No audit logs found.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
            <div style={{ color: '#6B7280', fontSize: '14px' }}>
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} logs
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
