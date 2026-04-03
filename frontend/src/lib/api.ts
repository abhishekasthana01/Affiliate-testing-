import axios from 'axios';
import { STORAGE_KEYS, storage } from './storage';

const baseURL = import.meta.env.VITE_API_URL || '';
const DEV_MOCK_API = String(import.meta.env.VITE_DEV_MOCK_API || '').toLowerCase() === 'true';

export const api = axios.create({ 
  baseURL,
  withCredentials: true 
});

api.interceptors.request.use((config) => {
  const token = storage.get<string>(STORAGE_KEYS.token);
  const resellerId = storage.get<string>(STORAGE_KEYS.resellerId);
  // Ensure header mutation stays compatible with Axios v1 types
  const headers: any = config.headers ?? {};
  if (token) {
    if (typeof headers.set === 'function') {
      headers.set('Authorization', `Bearer ${token}`);
    } else {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  if (resellerId) {
    if (typeof headers.set === 'function') {
      headers.set('X-Reseller-Id', resellerId);
    } else {
      headers['X-Reseller-Id'] = resellerId;
    }
  }
  config.headers = headers;
  return config;
});

// Dev-only mock responses for when backend is unavailable
if (DEV_MOCK_API) {
  const ok = (config: any, data: any) => ({ data: { data }, status: 200, statusText: 'OK', headers: {}, config });
  const mockDashboard = () => {
    const today = new Date();
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    return {
      totals: { earnings: 52340, clicks: 1384, conversions: 124 },
      trend: days.map((date, i) => ({ date, earnings: 1000 + i * 500, clicks: 150 + i * 20, conversions: 10 + i * 3 })),
      transactions: [],
      payouts: [],
    };
  };
  const mockProducts = () => ([
    { id: 'bluetooth-terminal', name: 'Beam Bluetooth Terminal for Physical Stores', price: 175, description: 'Portable Bluetooth payment device for BEAM in-store.', currency: 'EUR' },
    { id: 'p1', name: 'Beam Premium', price: 499, description: 'Premium wallet subscription with perks.' },
    { id: 'p2', name: 'Beam Gift Card', price: 1000, description: 'Digital gift card redeemable across partners.' },
    { id: 'p3', name: 'Beam Plus', price: 799, description: 'Extended features for power users.' },
  ]);
  const mockCustomerProduct = (id: string | undefined) => {
    if (id === 'bluetooth-terminal' || id === '1') {
      return {
        id: 'bluetooth-terminal',
        name: 'Beam Bluetooth Terminal for Physical Stores',
        price: 175,
        currency: 'EUR',
        description: 'The Beam Bluetooth Terminal is an advanced, portable payment device that allows businesses to accept BEAM payments wirelessly and at a distance.',
        categories: ['Beam for businesses', 'For Physical Stores'],
        longDescription:
          'The Beam Bluetooth Terminal is an advanced, portable payment device that allows businesses to accept BEAM payments wirelessly and at a distance. This sleek, lightweight terminal connects seamlessly to your smartphone or tablet via Bluetooth, enabling secure, contactless transactions on the go. Ideal for dynamic retail environments, restaurants, or service providers, the Beam Bluetooth Terminal offers unparalleled convenience, empowering businesses to process payments anytime, anywhere with speed and ease.',
        related: [
          { id: 'beam-wallet-nfc', name: 'Beam Wallet NFC', price: 75, currency: 'EUR' },
          { id: 'beam-wallet-online', name: 'Beam Wallet for Online Stores', price: 75, currency: 'EUR' },
        ],
      };
    }
    return {
      id: id || 'p1',
      name: 'Beam Premium',
      price: 499,
      description: 'Premium wallet subscription with perks tailored for customers.',
    };
  };
  const mockTxns = () => ([
    { id: 't1', date: new Date().toISOString(), amount: 299, status: 'approved' },
    { id: 't2', date: new Date(Date.now() - 86400000).toISOString(), amount: 129, status: 'pending' },
    { id: 't3', date: new Date(Date.now() - 2*86400000).toISOString(), amount: 459, status: 'rejected' },
  ]);
  const mockPayouts = () => ([
    { id: 'po1', date: new Date().toISOString(), amount: 2500, status: 'paid' },
    { id: 'po2', date: new Date(Date.now() - 7*86400000).toISOString(), amount: 1800, status: 'processing' },
  ]);
  const mockProfile = () => ({ id: 'dev-user', name: 'Dev User', email: 'dev@local.test' });
  const mockSettings = () => ({ notifications: true });
  const mockCheckoutStart = (productId: string | undefined) => ({
    status: 'success',
    redirectUrl: undefined,
    productId,
  });

  api.interceptors.response.use(undefined, (error) => {
    const url: string = error?.config?.url || '';
    const cfg = error?.config || {};
    try {
      if (url.includes('/reseller/dashboard')) return Promise.resolve(ok(cfg, mockDashboard()));
      if (url.includes('/catalog/products')) return Promise.resolve(ok(cfg, mockProducts()));
      if (url.includes('/customer/products/')) {
        const match = url.match(/\/customer\/products\/(\w+)/);
        const id = match?.[1];
        return Promise.resolve(ok(cfg, mockCustomerProduct(id)));
      }
      if (url.includes('/checkout/start') && (cfg.method?.toLowerCase() === 'post')) {
        const pid = cfg.data?.productId || (typeof cfg.data === 'string' ? JSON.parse(cfg.data).productId : undefined);
        return Promise.resolve(ok(cfg, mockCheckoutStart(pid)));
      }
      if (url.includes('/reseller/transactions')) return Promise.resolve(ok(cfg, mockTxns()));
      if (url.includes('/reseller/payouts')) return Promise.resolve(ok(cfg, mockPayouts()));
      if (url.includes('/reseller/me') && cfg.method?.toLowerCase() === 'get') return Promise.resolve(ok(cfg, mockProfile()));
      if (url.includes('/reseller/settings') && cfg.method?.toLowerCase() === 'get') return Promise.resolve(ok(cfg, mockSettings()));
      if (url.includes('/reseller/me') && cfg.method?.toLowerCase() === 'put') return Promise.resolve(ok(cfg, { ok: true }));
      if (url.includes('/reseller/settings') && cfg.method?.toLowerCase() === 'put') return Promise.resolve(ok(cfg, { ok: true }));
    } catch {
      // fallthrough to original error
    }
    return Promise.reject(error);
  });
}

export type ApiResponse<T> = {
  data: T;
  message?: string;
};