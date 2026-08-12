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
  Link2,
  Copy,
  Check,
  Search,
  ExternalLink,
  Share2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getProductImages } from '@/lib/product-images';
import { ProductImageGallery } from '@/components/product-image-gallery';

interface ProductLink {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  url: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  images?: string[];
  category: string | null;
  trackingLink: string;
  directLink: string;
  referralCode: string;
  resellerId: string;
}

export default function AffiliateLinksPage() {
  const { user, loading: authLoading } = useAuth();
  const [links, setLinks] = useState<ProductLink[]>([]);
  const [filteredLinks, setFilteredLinks] = useState<ProductLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      fetchLinks();
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (searchQuery) {
      setFilteredLinks(
        links.filter(
          (l) =>
            l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.category?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredLinks(links);
    }
  }, [links, searchQuery]);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/affiliate/links');
      const data = await res.json();

      if (data.success) {
        setLinks(data.links);
      }
    } catch (error) {
      console.error('Failed to fetch links:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
  };

  const formatPrice = (cents: number, currency = 'EUR') =>
    `${CURRENCY_SYMBOLS[currency] || currency}${(cents / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Affiliate Links</h2>
        <p className="text-muted-foreground">
          Your unique tracking links for every product — copy & share to earn commissions
        </p>
      </div>

      {/* Stats Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-gradient-to-br from-beam-purple-600 via-indigo-600 to-beam-teal-600 text-white border-0 shadow-lg overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6bTAtMzBWMEgydjRoMzR6TTIgMzBoMzR2NEgydi00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
          <CardContent className="flex items-center justify-between p-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner">
                <Link2 className="h-7 w-7" />
              </div>
              <div>
                <p className="text-lg font-bold tracking-tight">
                  {links.length} Product{links.length !== 1 ? 's' : ''} Available
                </p>
                <p className="text-sm text-white/80">
                  Each link is uniquely tied to your reseller ID — share them anywhere to track referrals
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-right">
              <div>
                <p className="text-xs text-white/60 uppercase tracking-wider">Your Reseller ID</p>
                <p className="text-lg font-bold font-mono">{links[0]?.resellerId || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search */}
      {links.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Product Link Cards */}
      {filteredLinks.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredLinks.map((link, i) => {
            const images = getProductImages(link);

            return (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
            >
              <Card className="group hover:shadow-lg transition-all duration-300 hover:border-beam-purple-200 overflow-hidden">
                <div className="border-b bg-muted/30 p-3 pb-0">
                  <ProductImageGallery images={images} name={link.name} variant="card" />
                </div>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">{link.name}</CardTitle>
                      {link.description && (
                        <CardDescription className="text-xs line-clamp-2 mt-1">
                          {link.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {link.category && (
                        <Badge variant="secondary" className="text-[10px]">
                          {link.category}
                        </Badge>
                      )}
                      {link.priceCents > 0 && (
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          {formatPrice(link.priceCents, link.currency)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Tracking Link */}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                      Tracking Link
                    </p>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={link.trackingLink}
                        className="font-mono text-xs h-9 bg-muted/50"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-3 shrink-0"
                        onClick={() =>
                          copyToClipboard(link.trackingLink, `tracking-${link.id}`)
                        }
                      >
                        {copiedId === `tracking-${link.id}` ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Direct Link */}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                      Direct Link <span className="normal-case">(with ?ref param)</span>
                    </p>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={link.directLink}
                        className="font-mono text-xs h-9 bg-muted/50"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-3 shrink-0"
                        onClick={() =>
                          copyToClipboard(link.directLink, `direct-${link.id}`)
                        }
                      >
                        {copiedId === `direct-${link.id}` ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 gap-1 text-muted-foreground hover:text-primary"
                      onClick={() => window.open(link.url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Product
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 gap-1 text-muted-foreground hover:text-primary"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: link.name,
                            url: link.trackingLink,
                          });
                        } else {
                          copyToClipboard(link.trackingLink, `share-${link.id}`);
                        }
                      }}
                    >
                      <Share2 className="h-3 w-3" />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
              <Link2 className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">
              {searchQuery ? 'No matching products' : 'No products available yet'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {searchQuery
                ? 'Try a different search term'
                : 'Once the admin adds products, your unique tracking links will appear here automatically.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      {links.length > 0 && (
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-sm">How Affiliate Links Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  step: '1',
                  title: 'Copy your link',
                  desc: 'Each product has a unique tracking link tied to your reseller ID',
                },
                {
                  step: '2',
                  title: 'Share anywhere',
                  desc: 'Post on social media, email, blog — anywhere your audience is',
                },
                {
                  step: '3',
                  title: 'Earn commissions',
                  desc: 'When someone clicks & converts, you earn a commission automatically',
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-beam-purple-500 text-white text-sm font-bold">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
