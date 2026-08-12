'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trophy, Star, Lock, Zap, Target, TrendingUp, Users, MousePointerClick, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface Level { level: number; name: string; minXP: number; icon: string; color: string; perks: string[]; }
interface Achievement { id: string; name: string; description: string; icon: string; category: string; xpReward: number; }
interface XPBreakdown { referrals: number; conversions: number; revenue: number; streak: number; achievements: number; total: number; }

export default function LevelsPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) fetchData();
  }, [authLoading, user]);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/affiliate/gamification');
      const json = await res.json();
      if (json.success) setData(json);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (authLoading || loading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-48" /><Skeleton className="h-96" /></div>;
  }

  if (!data) return <p className="text-muted-foreground">Failed to load gamification data.</p>;

  const { xp, level, achievements, allLevels }: { xp: XPBreakdown; level: any; achievements: any; allLevels: Level[] } = data;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Levels & Achievements</h1>
          <p className="text-muted-foreground">Track your progress, unlock rewards, and climb the ranks</p>
        </div>

        {/* Level Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden">
            <div className={`bg-gradient-to-r ${level.current.color} p-6 text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-5xl">{level.current.icon}</div>
                  <div>
                    <p className="text-sm font-medium text-white/70">Level {level.current.level}</p>
                    <h2 className="text-2xl font-bold">{level.current.name}</h2>
                    <p className="text-sm text-white/80 mt-0.5">{xp.total.toLocaleString()} XP earned</p>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-sm text-white/70">Achievements</p>
                  <p className="text-3xl font-bold">{achievements.totalUnlocked}/{achievements.totalAchievements}</p>
                </div>
              </div>

              {level.next && (
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs text-white/70 mb-1.5">
                    <span>{level.current.name}</span>
                    <span>{level.xpToNext.toLocaleString()} XP to {level.next.name} {level.next.icon}</span>
                  </div>
                  <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-white rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${level.progressPercent}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="text-xs text-white/60 mt-1 text-right">{level.progressPercent}%</p>
                </div>
              )}
            </div>

            <CardContent className="p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your Perks</p>
              <div className="flex flex-wrap gap-2">
                {level.current.perks.map((perk: string) => (
                  <Badge key={perk} variant="secondary" className="text-xs gap-1">
                    <Star className="h-3 w-3" />{perk}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* XP Breakdown */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Referrals', value: xp.referrals, icon: Users, desc: '10 XP each' },
            { label: 'Conversions', value: xp.conversions, icon: Target, desc: '25 XP each' },
            { label: 'Revenue', value: xp.revenue, icon: TrendingUp, desc: '1 XP per €10' },
            { label: 'Streak', value: xp.streak, icon: Calendar, desc: '15 XP/month' },
            { label: 'Achievements', value: xp.achievements, icon: Trophy, desc: 'Bonus XP' },
          ].map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                  <p className="text-xl font-bold">{item.value.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">XP</span></p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" />Achievements</CardTitle>
            <CardDescription>{achievements.totalUnlocked} of {achievements.totalAchievements} unlocked</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="referrals" className="text-xs">Referrals</TabsTrigger>
                <TabsTrigger value="sales" className="text-xs">Sales</TabsTrigger>
                <TabsTrigger value="milestones" className="text-xs">Milestones</TabsTrigger>
                <TabsTrigger value="engagement" className="text-xs">Engagement</TabsTrigger>
              </TabsList>

              {['all', 'referrals', 'sales', 'milestones', 'engagement'].map(tab => (
                <TabsContent key={tab} value={tab}>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Unlocked */}
                    {achievements.unlocked
                      .filter((a: Achievement) => tab === 'all' || a.category === tab)
                      .map((a: Achievement, i: number) => (
                        <motion.div key={a.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.03 * i }}>
                          <div className="flex items-start gap-3 p-3 rounded-xl border bg-gradient-to-br from-amber-50/50 to-yellow-50/30 border-amber-200">
                            <div className="text-2xl">{a.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-semibold truncate">{a.name}</p>
                                <Badge className="bg-amber-100 text-amber-700 border-0 text-[9px] px-1.5 shrink-0">+{a.xpReward} XP</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    {/* Locked */}
                    {achievements.locked
                      .filter((a: Achievement) => tab === 'all' || a.category === tab)
                      .map((a: Achievement) => (
                        <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl border border-dashed border-gray-200 opacity-50">
                          <div className="text-2xl grayscale">{a.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold truncate text-muted-foreground">{a.name}</p>
                              <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                          </div>
                        </div>
                      ))}
                    {achievements.unlocked.filter((a: Achievement) => tab === 'all' || a.category === tab).length === 0 &&
                     achievements.locked.filter((a: Achievement) => tab === 'all' || a.category === tab).length === 0 && (
                      <p className="text-sm text-muted-foreground col-span-full text-center py-8">No achievements in this category</p>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Level Roadmap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" />Level Roadmap</CardTitle>
            <CardDescription>Your journey through the ranks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allLevels.map((lvl: Level, i: number) => {
                const isCurrentOrPast = xp.total >= lvl.minXP;
                const isCurrent = lvl.level === level.current.level;
                return (
                  <div key={lvl.level}
                    className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                      isCurrent ? 'border-beam-pink-300 bg-beam-pink-50/50 ring-1 ring-beam-pink-200' :
                      isCurrentOrPast ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 opacity-60'
                    }`}>
                    <div className="text-3xl">{lvl.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">Level {lvl.level}: {lvl.name}</p>
                        {isCurrent && <Badge className="bg-beam-pink-100 text-beam-pink-700 border-0 text-[9px]">Current</Badge>}
                        {isCurrentOrPast && !isCurrent && <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-200">✓ Reached</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{lvl.minXP.toLocaleString()} XP required</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {lvl.perks.map(p => <span key={p} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{p}</span>)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
