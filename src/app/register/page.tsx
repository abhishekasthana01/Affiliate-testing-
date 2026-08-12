'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Mail, ShieldCheck, ArrowLeft, Loader2, CheckCircle2, Smartphone } from 'lucide-react';
import { BeamLogo } from '@/components/ui/BeamLogo';

type Step = 'details' | 'otp' | 'success';

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const isInvite = searchParams.get('invite') === 'true';
  const [beamNumber, setBeamNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Step 1: Register the user
      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, beamNumber, role: 'AFFILIATE' }),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        setError(registerData.message || 'Registration failed');
        setLoading(false);
        return;
      }

      // Step 2: Send OTP
      const otpRes = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const otpData = await otpRes.json();

      if (otpRes.ok) {
        setStep('otp');
        setMessage('Account created! A verification code has been sent to your email.');
      } else {
        // Registration succeeded but OTP failed - still move to OTP step
        setStep('otp');
        setError(otpData.error || 'Failed to send code. Try resending.');
      }
    } catch (_e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setError('Please enter the full 6-digit code');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, code: otp }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStep('success');
        // Redirect after a short delay
        setTimeout(() => {
          const user = data.user;
          if (user.role === 'ADMIN') {
            router.push('/admin');
          } else {
            router.push('/affiliate');
          }
        }, 2000);
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (_e) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setMessage('A new verification code has been sent.');
      } else {
        setError('Failed to resend code. Please try again.');
      }
    } catch (_e) {
      setError('Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-beam-gradient-subtle p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <BeamLogo size="lg" showWordmark={true} />
          </div>
          <p className="text-sm text-muted-foreground font-medium tracking-beam">
            Affiliate Marketing Platform
          </p>
        </div>

        {/* Card */}
        <Card className="border-0 shadow-xl shadow-black/5 beam-shadow">
          {step === 'details' && (
            <>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">
                  {isInvite ? 'Accept Invitation' : 'Create your account'}
                </CardTitle>
                <CardDescription>
                  {isInvite 
                    ? 'Join the team and help manage the platform' 
                    : 'Join as an affiliate partner and start earning'}
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10"
                        required
                        autoFocus
                        autoComplete="name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                        autoComplete="email"
                        disabled={isInvite && !!searchParams.get('email')}
                      />
                    </div>
                  </div>
                  {!isInvite && (
                    <div className="space-y-2">
                      <Label htmlFor="beamNumber">Beam number</Label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="beamNumber"
                          type="tel"
                          placeholder="Beam Wallet number"
                          value={beamNumber}
                          onChange={(e) => setBeamNumber(e.target.value)}
                          className="pl-10"
                          autoComplete="tel"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex-col gap-4">
                  <Button
                    type="submit"
                    className="w-full bg-beam-pink-500 hover:bg-beam-pink-600 text-white"
                    size="lg"
                    disabled={loading || !name || !email}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </CardFooter>
              </form>
            </>
          )}

          {step === 'otp' && (
            <>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-beam-pink-100">
                  <ShieldCheck className="h-6 w-6 text-beam-pink-500" />
                </div>
                <CardTitle className="text-xl">Verify your email</CardTitle>
                <CardDescription>
                  Enter the 6-digit code sent to <span className="font-medium text-foreground">{email}</span>
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleVerifyOTP}>
                <CardContent className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  {message && (
                    <Alert>
                      <AlertDescription>{message}</AlertDescription>
                    </Alert>
                  )}
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(value) => setOtp(value)}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-3">
                  <Button
                    type="submit"
                    className="w-full bg-beam-pink-500 hover:bg-beam-pink-600 text-white"
                    size="lg"
                    disabled={loading || otp.length < 6}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="mr-2 h-4 w-4" />
                    )}
                    {loading ? 'Verifying...' : 'Verify & Continue'}
                  </Button>
                  <div className="flex items-center justify-between w-full">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStep('details');
                        setOtp('');
                        setError('');
                        setMessage('');
                      }}
                    >
                      <ArrowLeft className="mr-1 h-3 w-3" />
                      Back
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResendOTP}
                      disabled={loading}
                    >
                      Resend code
                    </Button>
                  </div>
                </CardFooter>
              </form>
            </>
          )}

          {step === 'success' && (
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-beam-teal-100">
                  <CheckCircle2 className="h-8 w-8 text-beam-teal-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Welcome aboard, {name}!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your account has been created. Redirecting to your dashboard...
                  </p>
                </div>
                <div className="flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-beam-pink-500" />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Footer */}
        {step !== 'success' && (
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-beam-pink-500 hover:text-beam-pink-600 hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  );
}
