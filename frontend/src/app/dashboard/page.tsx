'use client';

import { useEffect, useState } from 'react';
import { NavbarWeb3 as Navbar } from '@/components/layout/NavbarWeb3';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import type { CreditTransaction, Tier } from '@/lib/db';
import CreditDashboard from '@/components/CreditDashboard';

const STORAGE_KEY = 'agentsentry_api_key';

interface CreditsResponse {
  credits_balance: number;
  email: string;
  created_at: string;
  tier: Tier;
  activation_code: string | null;
  is_cli_activated: boolean;
  transactions: CreditTransaction[];
}

type View = 'loading' | 'login' | 'signup' | 'dashboard';

export default function DashboardPage() {
  const [view, setView] = useState<View>('loading');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [data, setData] = useState<CreditsResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [signupKey, setSignupKey] = useState('');

  const loadDashboard = async (key: string) => {
    try {
      const res = await fetch('/api/user/credits', {
        headers: { Authorization: `Bearer ${key}` },
      });

      if (!res.ok) {
        localStorage.removeItem(STORAGE_KEY);
        setView('login');
        return;
      }

      const json = (await res.json()) as CreditsResponse;
      setApiKey(key);
      setData(json);
      localStorage.setItem(STORAGE_KEY, key);
      setView('dashboard');
    } catch {
      setErrorMsg('Network error — please try again.');
      setView('login');
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      // loadDashboard only updates state from inside its fetch callback,
      // not synchronously during this effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadDashboard(stored);
    } else {
      setView('login');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    const key = apiKeyInput.trim();
    if (!key) {
      setErrorMsg('Enter your API key.');
      setSubmitting(false);
      return;
    }
    await loadDashboard(key);
    setSubmitting(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim() }),
      });
      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json.error ?? 'Something went wrong.');
        setSubmitting(false);
        return;
      }

      setSignupKey(json.api_key);
      await loadDashboard(json.api_key);
    } catch {
      setErrorMsg('Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey('');
    setData(null);
    setSignupKey('');
    setApiKeyInput('');
    setEmailInput('');
    setView('login');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#030303', color: '#fff' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '120px 24px 80px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', width: '100%' }}>
          <div className="mb-10">
            <p className="font-mono text-xs uppercase tracking-[0.2em] mb-3" style={{ color: '#00ff88' }}>
              Dashboard
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Credits &amp; usage</h1>
          </div>

          {view === 'loading' && (
            <p style={{ color: 'var(--text-3)' }}>Loading…</p>
          )}

          {view === 'dashboard' && data && (
            <CreditDashboard
              apiKey={apiKey}
              email={data.email}
              creditsBalance={data.credits_balance}
              tier={data.tier}
              activationCode={data.activation_code}
              isCliActivated={data.is_cli_activated}
              transactions={data.transactions}
              onLogout={handleLogout}
              onUpgraded={() => { void loadDashboard(apiKey); }}
            />
          )}

          {(view === 'login' || view === 'signup') && (
            <div className="max-w-md">
              {signupKey && (
                <div className="card p-4 mb-6" style={{ borderColor: 'rgba(0,255,136,0.3)' }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#00ff88' }}>Account created!</p>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-2)' }}>
                    Save this API key — you&apos;ll need it to sign back in:
                  </p>
                  <p className="font-mono text-xs break-all" style={{ color: '#00ff88' }}>{signupKey}</p>
                </div>
              )}

              <div className="card p-6">
                {view === 'login' ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-2)' }}>
                        API key
                      </label>
                      <input
                        type="text"
                        required
                        value={apiKeyInput}
                        onChange={e => setApiKeyInput(e.target.value)}
                        placeholder="Paste your API key"
                        className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all font-mono"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff',
                        }}
                      />
                    </div>

                    {errorMsg && <p className="text-sm" style={{ color: 'var(--red)' }}>{errorMsg}</p>}

                    <Button type="submit" disabled={submitting} fullWidth>
                      {submitting ? 'Checking…' : 'View dashboard'}
                    </Button>

                    <p className="text-center text-xs" style={{ color: 'var(--text-3)' }}>
                      Don&apos;t have a key?{' '}
                      <button
                        type="button"
                        onClick={() => { setView('signup'); setErrorMsg(''); }}
                        className="underline"
                        style={{ color: '#00ff88' }}
                      >
                        Create an account
                      </button>
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-2)' }}>
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={emailInput}
                        onChange={e => setEmailInput(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff',
                        }}
                      />
                    </div>

                    {errorMsg && <p className="text-sm" style={{ color: 'var(--red)' }}>{errorMsg}</p>}

                    <Button type="submit" disabled={submitting} fullWidth>
                      {submitting ? 'Creating…' : 'Get my API key'}
                    </Button>

                    <p className="text-center text-xs" style={{ color: 'var(--text-3)' }}>
                      Already have a key?{' '}
                      <button
                        type="button"
                        onClick={() => { setView('login'); setErrorMsg(''); }}
                        className="underline"
                        style={{ color: '#00ff88' }}
                      >
                        Sign in
                      </button>
                    </p>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
