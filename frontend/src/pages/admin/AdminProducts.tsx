import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Loader } from '../../components/ui/Loader';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  categories: string[];
  commissionRate: number;
  createdAt: string;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [categories, setCategories] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'EUR',
    categories: '',
    commissionRate: '10',
  });

  useEffect(() => {
    loadProducts();
  }, [pagination.page]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await adminService.getProducts({ page: pagination.page, limit: pagination.limit });
      setProducts(response.data.data.products);
      setCategories(response.data.data.categories);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        commissionRate: parseFloat(formData.commissionRate),
        categories: formData.categories.split(',').map(c => c.trim()).filter(Boolean),
      };

      if (editingProduct) {
        await adminService.updateProduct(editingProduct._id, data);
      } else {
        await adminService.createProduct(data);
      }
      
      setShowModal(false);
      setEditingProduct(null);
      setFormData({ name: '', description: '', price: '', currency: 'EUR', categories: '', commissionRate: '10' });
      loadProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      currency: product.currency,
      categories: product.categories.join(', '),
      commissionRate: product.commissionRate.toString(),
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await adminService.deleteProduct(id);
      loadProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Product Management</h1>
          <p style={{ color: '#6B7280', margin: '8px 0 0' }}>Manage your product catalog and commissions</p>
        </div>
        <button onClick={() => { setEditingProduct(null); setFormData({ name: '', description: '', price: '', currency: 'EUR', categories: '', commissionRate: '10' }); setShowModal(true); }} className="btn btn-primary">
          Add Product
        </button>
      </div>

      {categories.length > 0 && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Categories</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {categories.map((cat) => (
              <span key={cat} style={{ padding: '4px 12px', background: '#F3F4F6', borderRadius: '16px', fontSize: '12px' }}>{cat}</span>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <Loader />
      ) : (
        <>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Product</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Price</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Categories</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Commission</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Added</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '600' }}>{product.name}</div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>{product.description.substring(0, 50)}...</div>
                    </td>
                    <td style={{ padding: '16px', fontWeight: '600' }}>
                      {product.currency} {product.price.toLocaleString()}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {product.categories.slice(0, 2).map((cat) => (
                          <span key={cat} style={{ padding: '2px 8px', background: '#E5E7EB', borderRadius: '4px', fontSize: '11px' }}>{cat}</span>
                        ))}
                        {product.categories.length > 2 && (
                          <span style={{ padding: '2px 8px', background: '#E5E7EB', borderRadius: '4px', fontSize: '11px' }}>+{product.categories.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ padding: '4px 8px', background: '#D1FAE5', borderRadius: '4px', fontSize: '12px', color: '#059669' }}>
                        {product.commissionRate}%
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: '#6B7280', fontSize: '14px' }}>
                      {new Date(product.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleEdit(product)} style={{ padding: '6px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(product._id)} style={{ padding: '6px 12px', border: '1px solid #FEE2E2', borderRadius: '6px', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', fontSize: '12px' }}>
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
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} products
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

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '500px', maxWidth: '90%' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '20px' }}>{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px', minHeight: '80px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Price</label>
                  <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Currency</label>
                  <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Commission %</label>
                  <input type="number" value={formData.commissionRate} onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })} required style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Categories (comma separated)</label>
                <input type="text" value={formData.categories} onChange={(e) => setFormData({ ...formData, categories: e.target.value })} placeholder="e.g., Electronics, Premium, New" style={{ width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', border: '1px solid #E5E7EB', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
