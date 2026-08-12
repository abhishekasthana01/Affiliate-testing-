import Link from 'next/link';
import { ArrowRight, BadgeCheck, Link2, Wallet, BarChart3 } from 'lucide-react';
import { BeamLogo } from '@/components/ui/BeamLogo';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const steps = [
    { title: 'Create a free account', body: 'No initial investment, inventory, or technical setup.' },
    { title: 'Get your Reseller ID', body: 'Beam generates your unique tracking identity automatically.' },
    { title: 'Share Beam links', body: 'Use WhatsApp, social groups, email, or your community.' },
    { title: 'Earn on confirmed sales', body: 'Validated payments release commission to your Beam Wallet.' },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-beam-teal-50/30 to-beam-pink-50/40">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <BeamLogo size="md" showWordmark />
        <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          Sign in
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div className="flex flex-col justify-center">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-medium text-beam-teal-700 shadow-sm">
            <BadgeCheck className="h-3.5 w-3.5" />
            Legitimate Beam Wallet reseller income
          </div>
          <h1 className="max-w-3xl text-4xl font-bold tracking-normal text-gray-950 sm:text-5xl lg:text-6xl">
            Start earning online by sharing Beam Wallet services
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            A simple reseller platform for people who want to work from home, monetize their network,
            and earn commissions from real validated payments.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-beam-pink-500 hover:bg-beam-pink-600">
              <Link href="/register">
                I Want to Start Winning
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
        </div>

        <div className="grid content-center gap-3">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-lg border bg-white/85 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-beam-pink-100 text-sm font-bold text-beam-pink-600">
                  {index + 1}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-950">{step.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.body}</p>
                </div>
              </div>
            </div>
          ))}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Links', icon: Link2 },
              { label: 'Payments', icon: Wallet },
              { label: 'Analytics', icon: BarChart3 },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 rounded-lg border bg-white/80 p-3 text-sm font-medium">
                <item.icon className="h-4 w-4 text-beam-teal-600" />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
