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
  Euro,
  Clock,
  CheckCircle2,
  Ban,
  Wallet,
  Download,
  Search,
  TrendingUp,
  ArrowRight,
  Info,
  Loader2,
  CircleDollarSign,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Commission {
  id: string;
  saleAmountCents: number;
  commissionRate: number;
  commissionAmountCents: number;
  status: string;
  maturesAt: string | null;
  approvedAt: string | null;
  customerName: string;
  customerEmail: string;
  eventType: string;
  payoutId: string | null;
  payoutStatus: string | null;
  createdAt: string;
}

interface Summary {
  totalCommissions: number;
  totalEarnedCents: number;
  pendingCents: number;
  approvedCents: number;
  paidCents: number;
  currentBalanceCents: number;
}

export default function CommissionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currencySymbol, setCurrencySymbol] = useState('€');

  useEffect(() => {
    if (!authLoading && user) fetchCommissions();
  }, [authLoading, user]);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/affiliate/commissions');
      const data = await res.json();

      if (data.success) {
        setCommissions(data.commissions || []);
        setSummary(data.summary || null);
        setCurrencySymbol(data.currencySymbol || '€');
      }
    } catch (error) {
      console.error('Failed to fetch commissions:', error);
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

  const formatRate = (rate: number) => `${(rate * 100).toFixed(0)}%`;

  const getStatusBadge = (status: string) => {
    const map: Record<
      string,
      {
        variant: 'default' | 'secondary' | 'destructive' | 'outline';
        icon: React.ElementType;
        label: string;
        color: string;
      }
    > = {
      PENDING: {
        variant: 'secondary',
        icon: Clock,
        label: 'Maturing',
        color: 'text-amber-600 bg-amber-50 border-amber-200',
      },
      APPROVED: {
        variant: 'default',
        icon: CheckCircle2,
        label: 'Approved',
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      },
      PAID: {
        variant: 'default',
        icon: Wallet,
        label: 'Paid',
        color: 'text-blue-600 bg-blue-50 border-blue-200',
      },
      REFUNDED: {
        variant: 'destructive',
        icon: Ban,
        label: 'Refunded',
        color: 'text-red-600 bg-red-50 border-red-200',
      },
    };
    const item = map[status] || {
      variant: 'outline' as const,
      icon: Clock,
      label: status,
      color: '',
    };
    const Icon = item.icon;
    return (
      <Badge
        variant="outline"
        className={`gap-1 text-xs font-medium ${item.color}`}
      >
        <Icon className="h-3 w-3" />
        {item.label}
      </Badge>
    );
  };

  const filtered = commissions.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    const headers = [
      'Date',
      'Customer',
      'Sale Amount',
      'Rate',
      'Commission',
      'Status',
      'Matures At',
      'Payout Status',
    ];
    const rows = filtered.map((c) => [
      formatDate(c.createdAt),
      `"${c.customerName}"`,
      (c.saleAmountCents / 100).toFixed(2),
      formatRate(c.commissionRate),
      (c.commissionAmountCents / 100).toFixed(2),
      c.status,
      c.maturesAt ? formatDate(c.maturesAt) : '—',
      c.payoutStatus || '—',
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-${new Date().toISOString().slice(0, 10)}.csv`;
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
            <h1 className="text-2xl font-bold tracking-tight">Commissions</h1>
            <p className="text-muted-foreground">
              Transparent breakdown of every commission earned
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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {formatCurrency(summary?.totalEarnedCents || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total Earned
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">
                      {formatCurrency(summary?.pendingCents || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Maturing
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(summary?.approvedCents || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <Wallet className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(summary?.paidCents || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Paid Out</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* How commission works */}
        <Card className="bg-gradient-to-r from-beam-teal-50 to-beam-purple-50 border-beam-teal-100">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-beam-teal-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-beam-charcoal-800">
                  How Commission Calculation Works
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-beam-charcoal-600">
                  <span className="bg-white/80 px-2 py-1 rounded-md border font-medium">
                    Sale Amount
                  </span>
                  <span className="text-muted-foreground">×</span>
                  <span className="bg-white/80 px-2 py-1 rounded-md border font-medium">
                    Commission Rate
                  </span>
                  <span className="text-muted-foreground">=</span>
                  <span className="bg-beam-teal-100 px-2 py-1 rounded-md border border-beam-teal-200 font-bold text-beam-teal-700">
                    Your Commission
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />
                  <span className="bg-amber-100 px-2 py-1 rounded-md border border-amber-200 font-medium text-amber-700">
                    Hold Period
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />
                  <span className="bg-emerald-100 px-2 py-1 rounded-md border border-emerald-200 font-medium text-emerald-700">
                    Available for Payout
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer..."
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
              <SelectItem value="PENDING">Maturing</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Commission Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Commission History</CardTitle>
            <CardDescription>
              {filtered.length} commission{filtered.length !== 1 ? 's' : ''}
              {statusFilter !== 'ALL' ? ` · ${statusFilter}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Sale</TableHead>
                    <TableHead className="text-center">Rate</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Matures</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(c.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">
                            {c.customerName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.customerEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                        {c.saleAmountCents > 0
                          ? formatCurrency(c.saleAmountCents)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge
                              variant="outline"
                              className="text-xs font-mono"
                            >
                              {formatRate(c.commissionRate)}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              {c.saleAmountCents > 0
                                ? `${formatCurrency(c.saleAmountCents)} × ${formatRate(c.commissionRate)} = ${formatCurrency(c.commissionAmountCents)}`
                                : 'Commission rate applied to sale amount'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600 whitespace-nowrap">
                        {formatCurrency(c.commissionAmountCents)}
                      </TableCell>
                      <TableCell>{getStatusBadge(c.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {c.status === 'PENDING' && c.maturesAt
                          ? formatDate(c.maturesAt)
                          : c.approvedAt
                            ? `✓ ${formatDate(c.approvedAt)}`
                            : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CircleDollarSign className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="font-medium">
                  {searchQuery || statusFilter !== 'ALL'
                    ? 'No matching commissions'
                    : 'No commissions yet'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                  {searchQuery || statusFilter !== 'ALL'
                    ? 'Try adjusting your filters'
                    : 'When customers convert through your referral links, your commissions will appear here with full calculation transparency.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
