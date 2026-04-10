import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.tsx'
import Login from './pages/Login.tsx'
import Register from './pages/Register.tsx'
import ForgotPassword from './pages/ForgotPassword.tsx'
import ResetPassword from './pages/ResetPassword.tsx'
import Dashboard from './pages/Dashboard.tsx'
import Products from './pages/Products.tsx'
import { AppLayout } from './layouts/AppLayout'
import { PrivateRoute } from './routes/PrivateRoute'
import Transactions from './pages/Transactions.tsx'
import Payouts from './pages/Payouts.tsx'
import Profile from './pages/Profile.tsx'
import CustomerProduct from './pages/customer/CustomerProduct.tsx'
import PaymentPage from './pages/PaymentPage.tsx'
import PaymentSuccess from './pages/customer/PaymentSuccess.tsx'
import PaymentFailure from './pages/customer/PaymentFailure.tsx'
import Privacy from './pages/public/Privacy.tsx'
import Terms from './pages/public/Terms.tsx'
import DataDeletion from './pages/public/DataDeletion.tsx'
import { AdminLayout } from './layouts/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminProducts from './pages/admin/AdminProducts'
import AdminOrders from './pages/admin/AdminOrders'
import AdminAffiliates from './pages/admin/AdminAffiliates'
import AdminPayouts from './pages/admin/AdminPayouts'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminCampaigns from './pages/admin/AdminCampaigns'
import AdminFraud from './pages/admin/AdminFraud'
import AdminSettings from './pages/admin/AdminSettings'
import AdminAuditLogs from './pages/admin/AdminAuditLogs'
import AdminLogin from './pages/admin/AdminLogin'
import AdminSegments from './pages/admin/AdminSegments'
import AdminLeaderboard from './pages/admin/AdminLeaderboard'
import AdminInvites from './pages/admin/AdminInvites'
import Marketing from './pages/Marketing.tsx'
import Reports from './pages/Reports.tsx'
import AffiliateTools from './pages/AffiliateTools.tsx'
import { useAuth } from './contexts/AuthContext'
import AdminInviteAccept from './pages/admin/AdminInviteAccept'

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <AdminLayout>{children}</AdminLayout>;
}

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/data-deletion" element={<DataDeletion />} />

        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/products" element={<PrivateRoute><Products /></PrivateRoute>} />
        <Route path="/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
        <Route path="/payouts" element={<PrivateRoute><Payouts /></PrivateRoute>} />
        <Route path="/marketing" element={<PrivateRoute><Marketing /></PrivateRoute>} />
        <Route path="/affiliate-tools" element={<PrivateRoute><AffiliateTools /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
        <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
        <Route path="/admin/affiliates" element={<AdminRoute><AdminAffiliates /></AdminRoute>} />
        <Route path="/admin/payouts" element={<AdminRoute><AdminPayouts /></AdminRoute>} />
        <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
        <Route path="/admin/campaigns" element={<AdminRoute><AdminCampaigns /></AdminRoute>} />
        <Route path="/admin/segments" element={<AdminRoute><AdminSegments /></AdminRoute>} />
        <Route path="/admin/leaderboard" element={<AdminRoute><AdminLeaderboard /></AdminRoute>} />
        <Route path="/admin/invites" element={<AdminRoute><AdminInvites /></AdminRoute>} />
        <Route path="/admin/fraud" element={<AdminRoute><AdminFraud /></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
        <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogs /></AdminRoute>} />
        <Route path="/admin/invite" element={<AdminInviteAccept />} />

        <Route path="/customer/products/:id" element={<CustomerProduct />} />
        <Route path="/customer/checkout" element={<PaymentPage />} />
        <Route path="/customer/payment/success" element={<PaymentSuccess />} />
        <Route path="/customer/payment/failure" element={<PaymentFailure />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default App
