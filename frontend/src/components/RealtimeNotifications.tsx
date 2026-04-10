import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getRealtimeSocket } from '../services/realtimeClient';

type Notification = {
  _id: string;
  title: string;
  message: string;
  type: string;
  readAt?: string | null;
  createdAt: string;
};

export function RealtimeNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(true);

  const load = async () => {
    const res = await api.get('/notifications');
    setItems(res.data?.data ?? []);
  };

  useEffect(() => {
    load().catch(() => {});
    const s = getRealtimeSocket();
    const onNotification = (payload: any) => {
      const n = payload?.notification;
      if (!n?._id) return;
      setItems((prev) => [n, ...prev].slice(0, 100));
    };
    s.on('notification', onNotification);
    return () => {
      s.off('notification', onNotification);
    };
  }, []);

  const unread = items.filter((n) => !n.readAt).length;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open notifications"
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: 999,
          borderRadius: 999,
          padding: '12px 14px',
          border: '1px solid var(--border)',
          background: 'white',
          boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontWeight: 800,
          color: 'var(--text)',
        }}
      >
        <span aria-hidden="true">🔔</span>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>
          {unread} unread
        </span>
      </button>
    );
  }

  return (
    <div style={{ position: 'fixed', right: 16, bottom: 16, width: 360, zIndex: 999 }}>
      <div style={{
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 800 }}>Notifications</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{unread} unread</div>
            <button
              onClick={() => setOpen(false)}
              className="btn btn-ghost"
              style={{ padding: '6px 10px', borderRadius: 10, fontWeight: 900 }}
              aria-label="Close notifications"
              type="button"
            >
              ✕
            </button>
          </div>
        </div>
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {items.slice(0, 8).map((n) => (
            <div key={n._id} style={{ padding: 12, borderBottom: '1px solid var(--border)', background: n.readAt ? 'white' : '#F9FAFB' }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{n.title}</div>
              <div style={{ fontSize: 13, color: '#374151', marginTop: 2 }}>{n.message}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{new Date(n.createdAt).toLocaleString()}</div>
            </div>
          ))}
          {items.length === 0 && <div style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>No notifications yet.</div>}
        </div>
      </div>
    </div>
  );
}

