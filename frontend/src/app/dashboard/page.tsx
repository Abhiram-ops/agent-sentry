'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NavbarWeb3 as Navbar } from '@/components/layout/NavbarWeb3';
import Footer from '@/components/layout/Footer';
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

type View = 'loading' | 'dashboard';

export default function DashboardPage() {
  const router = useRouter();
  const [view, setView] = useState<View>('loading');
  const [apiKey, setApiKey] = useState('');
  const [data, setData] = useState<CreditsResponse | null>(null);

  const loadDashboard = async (key: string) => {
    try {
      const res = await fetch('/api/user/credits', {
        headers: { Authorization: `Bearer ${key}` },
      });

      if (!res.ok) {
        localStorage.removeItem(STORAGE_KEY);
        router.replace('/login');
        return;
      }

      const json = (await res.json()) as CreditsResponse;
      setApiKey(key);
      setData(json);
      localStorage.setItem(STORAGE_KEY, key);
      setView('dashboard');
    } catch {
      router.replace('/login');
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
      router.replace('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey('');
    setData(null);
    router.replace('/login');
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
        </div>
      </main>
      <Footer />
    </div>
  );
}
