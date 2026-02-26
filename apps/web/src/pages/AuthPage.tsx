import React from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { ApiHttpError } from '@/lib/api';

type Tab = 'signin' | 'signup';

export function AuthPage() {
  const [tab, setTab] = React.useState<Tab>('signin');
  const [email, setEmail] = React.useState('');
  const [name, setName] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [totpCode, setTotpCode] = React.useState('');
  const [error, setError] = React.useState('');

  const { login, register, loginWith2fa, clearPending2fa, isLoading, requires2fa } = useAuthStore();

  const resetForm = () => {
    setEmail('');
    setName('');
    setPassword('');
    setTotpCode('');
    setError('');
  };

  const switchTab = (next: Tab) => {
    resetForm();
    clearPending2fa();
    setTab(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (tab === 'signin') {
        await login(email, password);
      } else {
        await register(email, name, password);
      }
    } catch (err) {
      if (err instanceof ApiHttpError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  const handle2faSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await loginWith2fa(totpCode);
    } catch (err) {
      if (err instanceof ApiHttpError) {
        setError(err.message);
      } else {
        setError('Invalid 2FA code');
      }
    }
  };

  if (requires2fa) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary px-4">
        <div className="w-full max-w-[400px] rounded-lg bg-sidebar p-8">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-text-primary">
              <span className="mr-2 text-accent-blue">♪</span>
              AMA-MIDI
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Two-Factor Authentication
            </p>
          </div>

          <p className="mb-4 text-center text-sm text-text-secondary">
            Enter the 6-digit code from your authenticator app.
          </p>

          <form onSubmit={handle2faSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="totp-code" className="mb-1 block text-sm text-text-secondary">
                Authentication Code
              </label>
              <input
                id="totp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full text-center text-2xl tracking-[0.5em]"
              />
            </div>

            {error && <p className="text-sm text-accent-red">{error}</p>}

            <button type="submit" disabled={isLoading || totpCode.length !== 6} className="btn-primary mt-2 w-full">
              {isLoading ? 'Verifying…' : 'Verify'}
            </button>

            <button
              type="button"
              onClick={() => { clearPending2fa(); resetForm(); }}
              className="btn-ghost w-full text-sm"
            >
              Back to Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4">
      <div className="w-full max-w-[400px] rounded-lg bg-sidebar p-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-text-primary">
            <span className="mr-2 text-accent-blue">♪</span>
            AMA-MIDI
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Enterprise MIDI Editor &amp; Collaboration Suite
          </p>
        </div>

        <div className="mb-6 flex rounded-md border border-border-subtle">
          <button
            type="button"
            onClick={() => switchTab('signin')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === 'signin'
                ? 'bg-accent-blue text-white'
                : 'text-text-secondary hover:text-text-primary'
            } rounded-l-md`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchTab('signup')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === 'signup'
                ? 'bg-accent-blue text-white'
                : 'text-text-secondary hover:text-text-primary'
            } rounded-r-md`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-text-secondary">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {tab === 'signup' && (
            <div>
              <label htmlFor="name" className="mb-1 block text-sm text-text-secondary">
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-text-secondary">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-accent-red">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary mt-2 w-full"
          >
            {isLoading
              ? tab === 'signin' ? 'Signing in…' : 'Creating account…'
              : tab === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  );
}
