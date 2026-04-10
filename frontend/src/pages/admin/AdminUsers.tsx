import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Loader } from '../../components/ui/Loader';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'reseller';
  resellerId?: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ role: '', status: '', search: '' });

  useEffect(() => {
    loadUsers();
  }, [pagination.page, filters]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params: any = { page: pagination.page, limit: pagination.limit };
      if (filters.role) params.role = filters.role;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      
      const response = await adminService.getUsers(params);
      setUsers(response.data.data.users);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await adminService.toggleUserStatus(userId);
      loadUsers();
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await adminService.deleteUser(userId);
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'reseller') => {
    try {
      await adminService.updateUser(userId, { role: newRole });
      loadUsers();
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>User Management</h1>
          <p style={{ color: '#6B7280', margin: '8px 0 0' }}>Manage all registered users and resellers</p>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{ flex: 1, minWidth: '200px', padding: '10px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
          />
          <select
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            style={{ padding: '10px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="reseller">Reseller</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            style={{ padding: '10px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="unverified">Unverified</option>
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
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>User</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Reseller ID</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Role</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Verified</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Joined</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', fontWeight: 'bold' }}>
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600' }}>{user.name}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '14px' }}>
                      {user.resellerId || '-'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user._id, e.target.value as 'admin' | 'reseller')}
                        style={{ padding: '4px 8px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12px' }}
                      >
                        <option value="reseller">Reseller</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: user.isActive ? '#D1FAE5' : '#FEE2E2', color: user.isActive ? '#059669' : '#DC2626' }}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {user.isVerified ? (
                        <span style={{ color: '#10B981' }}>✓</span>
                      ) : (
                        <span style={{ color: '#EF4444' }}>✗</span>
                      )}
                    </td>
                    <td style={{ padding: '16px', color: '#6B7280', fontSize: '14px' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleToggleStatus(user._id)}
                          style={{ padding: '6px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px' }}
                        >
                          {user.isActive ? 'Block' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(user._id)}
                          style={{ padding: '6px 12px', border: '1px solid #FEE2E2', borderRadius: '6px', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
            <div style={{ color: '#6B7280', fontSize: '14px' }}>
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                style={{ padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '6px', background: 'white', cursor: pagination.page === 1 ? 'not-allowed' : 'pointer', opacity: pagination.page === 1 ? 0.5 : 1 }}
              >
                Previous
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page >= pagination.pages}
                style={{ padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '6px', background: 'white', cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer', opacity: pagination.page >= pagination.pages ? 0.5 : 1 }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
