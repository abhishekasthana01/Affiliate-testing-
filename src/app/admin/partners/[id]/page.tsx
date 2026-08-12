'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Users,
  Wallet,
  Euro,
  CreditCard,
  Copy,
  ExternalLink,
  Loader2,
  MousePointerClick,
  Target,
  TrendingUp,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Ban,
  Percent,
} from 'lucide-react';

interface Partner {
  id: string;
  name: string;
  email: string;
  resellerId: string;
  referralCode: string;
  partnerGroup?: string;
  commissionRate: number;
  commissionRateOverride: number | null;
  status: string;
  totalClicks: number;
  totalLeads: number;
  totalRevenue: number;
  createdAt: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  status: string;
  totalPaid: number;
  createdAt: string;
}

interface Commission {
  id: string;
  transactionId: string;
  customerName: string;
  amountCents: number;
  rate: number;
  status: 'PENDING' | 'PAID' | 'COMPLETED' | 'REFUNDED' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  paidAt?: string;
}

interface Payout {
  id: string;
  amountCents: number;
  commissionCount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  method?: string;
  payoutDetails?: any;
  createdAt: string;
  processedAt?: string;
}

export default function PartnerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const partnerId = params.id as string;

  const [partner, setPartner] = useState<Partner | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedCommissions, setSelectedCommissions] = useState<string[]>([]);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<string>('Stripe');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [editingPayout, setEditingPayout] = useState<Payout | null>(null);
  const [newStatus, setNewStatus] = useState<'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'>('PENDING');
  const [commissionInput, setCommissionInput] = useState('');
  const [commissionSaving, setCommissionSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/login');
      return;
    }
    if (user && partnerId) {
      fetchPartnerData();
      fetchCustomers();
      fetchCommissions();
      fetchPayouts();
    }
  }, [authLoading, user, partnerId]);

  const fetchPartnerData = async () => {
    try {
      const res = await fetch('/api/admin/affiliates');
      if (res.ok) {
        const data = await res.json();
        const affiliate = data.affiliates?.find((a: any) => a.id === partnerId);
        if (affiliate) {
          setPartner({
            id: affiliate.id,
            name: affiliate.user?.name || '',
            email: affiliate.user?.email || '',
            resellerId: affiliate.resellerId || '',
            referralCode: affiliate.referralCode,
            partnerGroup: affiliate.partnerGroup?.name || 'Default',
            commissionRate: affiliate.commissionRate || 0.20,
            commissionRateOverride: affiliate.commissionRateOverride,
            status: affiliate.status || affiliate.user?.status || 'ACTIVE',
            totalClicks: affiliate.totalClicks || 0,
            totalLeads: affiliate.totalLeads || 0,
            totalRevenue: (affiliate.totalRevenueCents || 0) / 100,
            createdAt: affiliate.createdAt,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching partner:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/admin/referrals');
      if (res.ok) {
        const data = await res.json();
        const partnerCustomers = data.referrals
          ?.filter((r: any) => r.affiliate?.id === partnerId)
          .map((r: any) => ({
            id: r.id,
            name: r.leadName,
            email: r.leadEmail,
            status: r.status,
            totalPaid: r.estimatedValue || 0,
            createdAt: r.createdAt,
          })) || [];
        setCustomers(partnerCustomers);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchCommissions = async () => {
    try {
      const res = await fetch(`/api/admin/commissions?affiliateId=${partnerId}`);
      if (res.ok) {
        const data = await res.json();
        const comms = data.commissions?.map((comm: any) => ({
          id: comm.id,
          transactionId: comm.id, // Use ID as fallback for UI
          customerName: comm.customerName,
          amountCents: comm.amountCents,
          rate: comm.rate,
          status: comm.status,
          createdAt: comm.createdAt,
          paidAt: comm.paidAt,
        })) || [];
        setCommissions(comms);
      }
    } catch (error) {
      console.error('Error fetching commissions:', error);
    }
  };

  const fetchPayouts = async () => {
    try {
      const res = await fetch(`/api/admin/payouts?affiliateId=${partnerId}`);
      if (res.ok) {
        const data = await res.json();
        setPayouts(data.payouts || []);
      }
    } catch (error) {
      console.error('Error fetching payouts:', error);
    }
  };

  const handleCreatePayout = async () => {
    if (selectedCommissions.length === 0) {
      alert('Please select at least one commission to create a payout');
      return;
    }
    setPayoutLoading(true);
    try {
      const res = await fetch('/api/admin/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          affiliateId: partnerId, 
          commissionIds: selectedCommissions,
          method: payoutMethod
        }),
      });
      if (res.ok) {
        alert('Payout created successfully!');
        setShowPayoutModal(false);
        setSelectedCommissions([]);
        fetchCommissions();
        fetchPayouts();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error || 'Failed to create payout'}`);
      }
    } catch (error) {
      console.error('Error creating payout:', error);
      alert('Failed to create payout');
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleUpdatePayoutStatus = async () => {
    if (!editingPayout) return;
    setPayoutLoading(true);
    try {
      const res = await fetch('/api/admin/payouts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingPayout.id, status: newStatus }),
      });
      if (res.ok) {
        alert('Payout status updated successfully!');
        setShowStatusModal(false);
        setEditingPayout(null);
        fetchPayouts();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error || 'Failed to update payout status'}`);
      }
    } catch (error) {
      console.error('Error updating payout status:', error);
      alert('Failed to update payout status');
    } finally {
      setPayoutLoading(false);
    }
  };

  const openCommissionModal = () => {
    setCommissionInput(partner ? String((partner.commissionRate * 100).toFixed(2).replace(/\.00$/, '')) : '');
    setShowCommissionModal(true);
  };

  const handleSaveCommissionRate = async () => {
    if (!partner) return;
    const ratePercent = Number(commissionInput);
    if (!Number.isFinite(ratePercent) || ratePercent <= 0 || ratePercent > 100) {
      toast.error('Enter a commission percent between 0 and 100');
      return;
    }

    setCommissionSaving(true);
    try {
      const res = await fetch(`/api/admin/affiliates/${partner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionRateOverride: ratePercent }),
      });

      if (res.ok) {
        toast.success('Commission rate updated');
        setShowCommissionModal(false);
        await fetchPartnerData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update commission rate');
      }
    } catch (_error) {
      toast.error('Failed to update commission rate');
    } finally {
      setCommissionSaving(false);
    }
  };

  const handleResetCommissionRate = async () => {
    if (!partner) return;
    setCommissionSaving(true);
    try {
      const res = await fetch(`/api/admin/affiliates/${partner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionRateOverride: null }),
      });

      if (res.ok) {
        toast.success('Commission rate reset to partner group');
        setShowCommissionModal(false);
        await fetchPartnerData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to reset commission rate');
      }
    } catch (_error) {
      toast.error('Failed to reset commission rate');
    } finally {
      setCommissionSaving(false);
    }
  };

  const openStatusModal = (payout: Payout) => {
    setEditingPayout(payout);
    setNewStatus(payout.status);
    setShowStatusModal(true);
  };

  const toggleCommissionSelection = (commissionId: string) => {
    setSelectedCommissions((prev) =>
      prev.includes(commissionId) ? prev.filter((id) => id !== commissionId) : [...prev, commissionId]
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const formatCurrency = (cents: number) =>
    `\u20AC${(cents / 100).toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-IE', { year: 'numeric', month: 'short', day: 'numeric' });

  const unpaidCommissions = commissions.filter((c) => c.status === 'PENDING' || c.status === 'APPROVED');
  const pendingAmount = unpaidCommissions.reduce((sum, c) => sum + c.amountCents, 0);
  const pendingCommissions = commissions.filter((c) => c.status === 'PENDING');
  const approvedCommissions = commissions.filter((c) => c.status === 'APPROVED');
  const approvedAmount = approvedCommissions.reduce((sum, c) => sum + c.amountCents, 0);
  const paidCommissions = commissions.filter((c) => c.status === 'PAID');
  const paidAmount = paidCommissions.reduce((sum, c) => sum + c.amountCents, 0);

  const handleApproveCommission = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/commissions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      if (res.ok) {
        toast.success('Commission approved');
        fetchCommissions();
        fetchPartnerData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to approve commission');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };


  const getStatusBadge = (status: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
      COMPLETED: { variant: 'default', icon: CheckCircle2 },
      PAID: { variant: 'default', icon: CheckCircle2 },
      ACTIVE: { variant: 'default', icon: CheckCircle2 },
      APPROVED: { variant: 'default', icon: CheckCircle2 },
      PENDING: { variant: 'secondary', icon: Clock },
      PROCESSING: { variant: 'secondary', icon: Loader2 },
      FAILED: { variant: 'destructive', icon: AlertCircle },
      REFUNDED: { variant: 'destructive', icon: Ban },
      REJECTED: { variant: 'destructive', icon: Ban },
    };
    const { variant, icon: Icon } = map[status] || { variant: 'outline' as const, icon: Clock };
    return (
      <Badge variant={variant} className="gap-1 text-xs">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  if (authLoading || loading) {
    return <DetailSkeleton />;
  }

  if (!partner) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <Users className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-xl font-bold">Partner not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">This partner may have been removed</p>
        <Button className="mt-6" onClick={() => router.push('/admin/partners')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Partners
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.push('/admin/partners')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Partners
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                {(partner.name || 'P').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{partner.name}</h1>
              <p className="text-sm text-muted-foreground">{partner.email}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge 
                  className="bg-indigo-600 text-white font-mono text-xs gap-1.5 cursor-pointer hover:bg-indigo-700 transition-colors"
                  onClick={() => copyToClipboard(partner.id, 'Affiliate ID')}
                >
                  <Copy className="h-3 w-3" />
                  {partner.id}
                </Badge>
                <Badge className="bg-beam-pink-500 text-white font-mono text-xs gap-1 hover:bg-beam-pink-600">
                  {partner.resellerId}
                </Badge>
                <Badge 
                  variant="outline" 
                  className="font-mono text-xs gap-1.5 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => copyToClipboard(partner.referralCode, 'Referral Code')}
                >
                  <Copy className="h-3 w-3" />
                  {partner.referralCode}
                </Badge>
                {partner.partnerGroup && (
                  <Badge variant="secondary" className="text-xs">
                    {partner.partnerGroup}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {(partner.commissionRate * 100).toFixed(0)}% commission
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openCommissionModal} className="gap-1.5">
            <Percent className="h-4 w-4" />
            Commission Rate
          </Button>
          <Button
            onClick={() => setShowPayoutModal(true)}
            disabled={approvedCommissions.length === 0}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Create Payout
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customers.length}</p>
                <p className="text-xs text-muted-foreground">Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(pendingAmount)}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(paidAmount)}</p>
                <p className="text-xs text-muted-foreground">Paid Out</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                <CreditCard className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{payouts.length}</p>
                <p className="text-xs text-muted-foreground">Payouts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customers">Customers ({customers.length})</TabsTrigger>
          <TabsTrigger value="commissions">Commissions ({commissions.length})</TabsTrigger>
          <TabsTrigger value="payouts">Payouts ({payouts.length})</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Partner Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Affiliate ID', value: partner.id, mono: true },
                  { label: 'Reseller ID', value: partner.resellerId, mono: true, highlight: true },
                  { label: 'Name', value: partner.name },
                  { label: 'Email', value: partner.email },
                  { label: 'Referral Code', value: partner.referralCode, mono: true },
                  { label: 'Partner Group', value: partner.partnerGroup || 'Default' },
                  { label: 'Commission Rate', value: `${(partner.commissionRate * 100).toFixed(0)}%${partner.commissionRateOverride !== null ? ' custom' : ''}` },
                  { label: 'Partner Since', value: formatDate(partner.createdAt) },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className={`text-sm font-medium ${item.mono ? 'font-mono' : ''} ${(item as any).highlight ? 'text-beam-pink-600 font-semibold' : ''}`}>{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-lg bg-muted">
                      <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="mt-2 text-xl font-bold">{partner.totalClicks}</p>
                    <p className="text-xs text-muted-foreground">Clicks</p>
                  </div>
                  <div className="text-center">
                    <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-lg bg-muted">
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="mt-2 text-xl font-bold">{partner.totalLeads}</p>
                    <p className="text-xs text-muted-foreground">Leads</p>
                  </div>
                  <div className="text-center">
                    <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-lg bg-muted">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </div>
                    <p className="mt-2 text-xl font-bold text-emerald-600">
                      {formatCurrency(partner.totalRevenue * 100)}
                    </p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Commissions</span>
                    <span className="text-sm font-bold">{commissions.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending Amount</span>
                    <span className="text-sm font-bold text-amber-600">{formatCurrency(pendingAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Paid Amount</span>
                    <span className="text-sm font-bold text-emerald-600">{formatCurrency(paidAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Customers */}
        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Referred Customers</CardTitle>
              <CardDescription>{customers.length} customer{customers.length !== 1 ? 's' : ''} referred</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {customers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total Paid</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-20">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell className="text-muted-foreground">{customer.email}</TableCell>
                        <TableCell>{getStatusBadge(customer.status)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(customer.totalPaid * 100)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{formatDate(customer.createdAt)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/customers/${customer.id}`)}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No customers yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commissions */}
        <TabsContent value="commissions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Commission History</CardTitle>
                <CardDescription>
                  Pending: {formatCurrency(pendingAmount)} · Approved: {formatCurrency(approvedAmount)} · Paid: {formatCurrency(paidAmount)}
                </CardDescription>
              </div>
              {approvedCommissions.length > 0 && (
                <Button size="sm" onClick={() => setShowPayoutModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Create Payout
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {commissions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map((comm) => (
                      <TableRow key={comm.id}>
                        <TableCell className="text-muted-foreground text-sm">{formatDate(comm.createdAt)}</TableCell>
                        <TableCell className="font-medium">{comm.customerName}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{formatCurrency(comm.amountCents)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{(comm.rate * 100).toFixed(0)}%</TableCell>
                        <TableCell>{getStatusBadge(comm.status)}</TableCell>
                        <TableCell className="text-right">
                          {comm.status === 'PENDING' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                              onClick={() => handleApproveCommission(comm.id)}
                            >
                              Approve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Euro className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No commissions yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payouts */}
        <TabsContent value="payouts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Payout History</CardTitle>
                <CardDescription>{payouts.length} payout{payouts.length !== 1 ? 's' : ''}</CardDescription>
              </div>
              {approvedCommissions.length > 0 && (
                <Button size="sm" onClick={() => setShowPayoutModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Create Payout
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {payouts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Commissions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Processed</TableHead>
                      <TableHead className="w-24">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell className="text-muted-foreground text-sm">{formatDate(payout.createdAt)}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600">{formatCurrency(payout.amountCents)}</TableCell>
                        <TableCell className="text-right">{payout.commissionCount}</TableCell>
                        <TableCell>{getStatusBadge(payout.status)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{payout.method || 'Stripe'}</span>
                            {payout.payoutDetails?.paymentEmail && (
                              <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]" title={payout.payoutDetails.paymentEmail}>
                                {payout.payoutDetails.paymentEmail}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {payout.processedAt ? formatDate(payout.processedAt) : '\u2014'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => openStatusModal(payout)}>
                            Update
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Wallet className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No payouts yet</p>
                  {approvedCommissions.length > 0 && (
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowPayoutModal(true)}>
                      Create First Payout
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Payout Dialog */}
      <Dialog open={showPayoutModal} onOpenChange={(open) => {
        setShowPayoutModal(open);
        if (!open) setSelectedCommissions([]);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Payout</DialogTitle>
            <DialogDescription>Select commissions to include in this payout</DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-muted/50 p-4 mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Total Payout</span>
              <Badge variant="outline" className="text-[10px] bg-primary/5">{selectedCommissions.length} Commissions</Badge>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(commissions.filter(c => selectedCommissions.includes(c.id)).reduce((sum, c) => sum + c.amountCents, 0))}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Payment Method</Label>
              <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Stripe">Stripe (Recommended)</SelectItem>
                  <SelectItem value="Beam Wallet">Beam Wallet</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="PayPal">PayPal</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The payout will be recorded as {payoutMethod}.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold block mb-2">Selected Commissions</Label>
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                {approvedCommissions.map((comm) => (
                  <div
                    key={comm.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${
                      selectedCommissions.includes(comm.id)
                        ? 'border-primary/50 bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleCommissionSelection(comm.id)}
                  >
                    <Checkbox
                      checked={selectedCommissions.includes(comm.id)}
                      onCheckedChange={() => toggleCommissionSelection(comm.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{comm.customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(comm.createdAt)} · {(comm.rate * 100).toFixed(0)}%
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-primary shrink-0">
                      {formatCurrency(comm.amountCents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPayoutModal(false); setSelectedCommissions([]); }}>
              Cancel
            </Button>
            <Button onClick={handleCreatePayout} disabled={payoutLoading || selectedCommissions.length === 0}>
              {payoutLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Payout ({selectedCommissions.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commission Rate Dialog */}
      <Dialog open={showCommissionModal} onOpenChange={setShowCommissionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Commission Rate</DialogTitle>
            <DialogDescription>
              This custom rate applies only to {partner.name}. Future commissions will use this percent.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Current Rate</p>
              <p className="text-2xl font-bold">{(partner.commissionRate * 100).toFixed(2).replace(/\.00$/, '')}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {partner.commissionRateOverride !== null ? 'Custom partner rate' : `Inherited from ${partner.partnerGroup || 'Default'}`}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="commissionRate">Commission Percent</Label>
              <div className="relative">
                <Input
                  id="commissionRate"
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={commissionInput}
                  onChange={(e) => setCommissionInput(e.target.value)}
                  className="pr-10"
                />
                <Percent className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="outline"
              onClick={handleResetCommissionRate}
              disabled={commissionSaving || partner.commissionRateOverride === null}
            >
              Use Group Rate
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCommissionModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCommissionRate} disabled={commissionSaving}>
                {commissionSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Rate
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={showStatusModal} onOpenChange={(open) => {
        setShowStatusModal(open);
        if (!open) setEditingPayout(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Payout Status</DialogTitle>
            <DialogDescription>Change the processing status of this payout</DialogDescription>
          </DialogHeader>

          {editingPayout && (
            <>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Payout Amount</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(editingPayout.amountCents)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {editingPayout.commissionCount} commissions · Created {formatDate(editingPayout.createdAt)}
                </p>
              </div>

              <div className="space-y-2">
                <Label>New Status</Label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as typeof newStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending \u2014 Awaiting processing</SelectItem>
                    <SelectItem value="PROCESSING">Processing \u2014 Payment in progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed \u2014 Payment successful</SelectItem>
                    <SelectItem value="FAILED">Failed \u2014 Payment failed</SelectItem>
                  </SelectContent>
                </Select>
                {editingPayout.method === 'Stripe' && newStatus !== 'COMPLETED' && (
                  <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                    <p className="text-xs text-indigo-700 font-medium flex items-center gap-1.5 mb-2">
                      <ExternalLink className="h-3 w-3" />
                      Stripe Payout Instructions
                    </p>
                    <p className="text-[11px] text-indigo-600 mb-2">
                      Perform the transfer to <strong>{editingPayout.payoutDetails?.paymentEmail || 'affiliate'}</strong> in your Stripe dashboard, then mark this as Completed.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      onClick={() => window.open('https://dashboard.stripe.com/payouts', '_blank')}
                    >
                      Open Stripe Dashboard
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {newStatus === 'COMPLETED' && 'Affiliate will be notified of payment completion'}
                  {newStatus === 'PROCESSING' && 'Payout is being processed'}
                  {newStatus === 'FAILED' && 'Payment failed, may need manual intervention'}
                  {newStatus === 'PENDING' && 'Payout is waiting to be processed'}
                </p>
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowStatusModal(false); setEditingPayout(null); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePayoutStatus} disabled={payoutLoading}>
              {payoutLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div>
          <Skeleton className="h-7 w-48 mb-1" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div>
                  <Skeleton className="h-7 w-20 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-10 w-96" />
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
