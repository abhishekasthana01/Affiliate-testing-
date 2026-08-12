'use client';

import React, { useState, useEffect } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Clock,
  CheckCircle2,
  Ban,
  Download,
  Search,
  TrendingUp,
  ArrowUpRight,
  ShoppingCart,
  Receipt,
  CreditCard,
  ReceiptText,
  CircleDollarSign,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Transaction {
  id: string;
  customerName: string;
  customerEmail: string;
  amountCents: number;
  commissionCents: number;
  commissionRate: number;
  status: string;
  description: string | null;
  paymentMethod: string | null;
  invoiceId: string | null;
  paidAt: string | null;
  referralName: string;
  referralStatus: string;
  createdAt: string;
}

interface Summary {
  totalTransactions: number;
  totalSalesCents: number;
  totalCommissionCents: number;
  completedCount: number;
  completedSalesCents: number;
  pendingCount: number;
  pendingSalesCents: number;
  refundedCount: number;
  refundedSalesCents: number;
  averageOrderCents: number;
}

export default function TransactionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currencySymbol, setCurrencySymbol] = useState('€');

  useEffect(() => {
    if (!authLoading && user) fetchTransactions();
  }, [authLoading, user]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/affiliate/transactions');
      const data = await res.json();

      if (data.success) {
        setTransactions(data.transactions || []);
        setSummary(data.summary || null);
        setCurrencySymbol(data.currencySymbol || '€');
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) =>
    `${currencySymbol}${(cents / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-IE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString('en-IE', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatRate = (rate: number) => `${(rate * 100).toFixed(0)}%`;

  const getStatusBadge = (status: string) => {
    const map: Record<
      string,
      {
        icon: React.ElementType;
        label: string;
        color: string;
      }
    > = {
      COMPLETED: {
        icon: CheckCircle2,
        label: 'Completed',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      },
      PENDING: {
        icon: Clock,
        label: 'Pending',
        color: 'text-amber-700 bg-amber-50 border-amber-200',
      },
      REFUNDED: {
        icon: Ban,
        label: 'Refunded',
        color: 'text-red-700 bg-red-50 border-red-200',
      },
    };
    const item = map[status] || { icon: Clock, label: status, color: '' };
    const Icon = item.icon;
    return (
      <Badge variant="outline" className={`gap-1 text-xs font-medium ${item.color}`}>
        <Icon className="h-3 w-3" />
        {item.label}
      </Badge>
    );
  };

  const filtered = transactions.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.invoiceId?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    const headers = [
      'Date',
      'Customer',
      'Email',
      'Sale Amount',
      'Commission Rate',
      'Commission',
      'Status',
      'Payment Method',
      'Invoice ID',
      'Description',
    ];
    const rows = filtered.map((t) => [
      formatDate(t.createdAt),
      `"${t.customerName}"`,
      t.customerEmail,
      (t.amountCents / 100).toFixed(2),
      formatRate(t.commissionRate),
      (t.commissionCents / 100).toFixed(2),
      t.status,
      t.paymentMethod || '',
      t.invoiceId || '',
      `"${t.description || ''}"`,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Transaction History
            </h1>
            <p className="text-muted-foreground">
              Complete record of every sale and payment from your referrals
            </p>
          </div>
          {filtered.length > 0 && (
            <Button variant="outline" onClick={exportCSV} className="gap-1.5">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {formatCurrency(summary?.totalSalesCents || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total Sales
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <CircleDollarSign className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(summary?.totalCommissionCents || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total Commission
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                    <Receipt className="h-4 w-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {summary?.totalTransactions || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Transactions
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {formatCurrency(summary?.averageOrderCents || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Avg. Order Value
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Status Breakdown */}
        {summary && summary.totalTransactions > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="bg-emerald-50/50 border-emerald-100">
              <CardContent className="flex items-center gap-3 p-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    {summary.completedCount} Completed
                  </p>
                  <p className="text-xs text-emerald-600">
                    {formatCurrency(summary.completedSalesCents)} in sales
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50/50 border-amber-100">
              <CardContent className="flex items-center gap-3 p-4">
                <Clock className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {summary.pendingCount} Pending
                  </p>
                  <p className="text-xs text-amber-600">
                    {formatCurrency(summary.pendingSalesCents)} awaiting
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-red-50/50 border-red-100">
              <CardContent className="flex items-center gap-3 p-4">
                <Ban className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    {summary.refundedCount} Refunded
                  </p>
                  <p className="text-xs text-red-600">
                    {formatCurrency(summary.refundedSalesCents)} returned
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer, invoice, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Transactions</CardTitle>
            <CardDescription>
              {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
              {statusFilter !== 'ALL' ? ` · ${statusFilter}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Sale</TableHead>
                      <TableHead className="text-center">Rate</TableHead>
                      <TableHead className="text-right">Your Commission</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((t) => (
                      <TableRow key={t.id} className="group">
                        <TableCell className="whitespace-nowrap">
                          <div>
                            <p className="text-sm">{formatDate(t.createdAt)}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatTime(t.createdAt)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{t.customerName}</p>
                            <p className="text-xs text-muted-foreground">
                              {t.customerEmail}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {t.description || '—'}
                          </p>
                          {t.invoiceId && (
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              INV: {t.invoiceId}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap">
                          {formatCurrency(t.amountCents)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="text-xs font-mono">
                                {formatRate(t.commissionRate)}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                {formatCurrency(t.amountCents)} × {formatRate(t.commissionRate)} = {formatCurrency(t.commissionCents)}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <span className="font-semibold text-emerald-600">
                            {formatCurrency(t.commissionCents)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {t.paymentMethod && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">{t.paymentMethod}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {t.paidAt ? formatDate(t.paidAt) : '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(t.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ReceiptText className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="font-medium">
                  {searchQuery || statusFilter !== 'ALL'
                    ? 'No matching transactions'
                    : 'No transactions yet'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                  {searchQuery || statusFilter !== 'ALL'
                    ? 'Try adjusting your search or filters'
                    : 'When customers make purchases through your referral links, their transactions will appear here with full details.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
