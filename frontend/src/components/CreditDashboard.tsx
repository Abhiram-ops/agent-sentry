'use client';

import { useState } from 'react';
import type { CreditTransaction, Tier } from '@/lib/db';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface CreditPackageOption {
  id: number;
  name: string;
  credits: number;
  priceUsd: number;
}

// IDs match the seed order in migrations/001_credits_schema.sql.
const CREDIT_PACKAGES: CreditPackageOption[] = [
  { id: 1, name: 'Starter', credits: 10, priceUsd: 5 },
  { id: 2, name: 'Growth', credits: 40, priceUsd: 15 },
  { id: 3, name: 'Scale', credits: 150, priceUsd: 50 },
];

interface CreditDashboardProps {
  apiKey: string;
  email: string;
  creditsBalance: number;
  tier: Tier;
  activationCode: string | null;
  isCliActivated: boolean;
  transactions: CreditTransaction[];
  onLogout: () => void;
  onUpgraded: () => void;
}

function formatAction(action: string): string {
  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function CreditDashboard({
  apiKey,
  email,
  creditsBalance,
  tier,
  activationCode,
  isCliActivated,
  transactions,
  onLogout,
  onUpgraded,
}: CreditDashboardProps) {
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [upgradeInput, setUpgradeInput] = useState('');
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpgradeError('');
    setUpgrading(true);
    const value = upgradeInput.trim();
    // Stripe ids start with cs_/pi_/ch_; anything else is treated as a dev code.
    const isStripeId = /^(cs_|pi_|ch_)/.test(value);
    try {
      const res = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(
          isStripeId ? { stripe_transaction_id: value } : { dev_approval_code: value },
        ),
      });
      const data = await res.json();
      if (res.ok) {
        onUpgraded();
        return;
      }
      setUpgradeError(data.error ?? 'Upgrade failed.');
    } catch {
      setUpgradeError('Network error — please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  const handleBuy = async (packageId: number) => {
    setError('');
    setBuyingId(packageId);
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ package_id: packageId }),
      });
      const data = await res.json();

      if (res.ok && data.checkout_url) {
        window.location.assign(data.checkout_url);
        return;
      }

      setError(data.error ?? 'Failed to start checkout.');
      setBuyingId(null);
    } catch {
      setError('Network error — please try again.');
      setBuyingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="card p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Signed in as</p>
          <p className="text-lg font-semibold text-white">{email}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>Credit balance</p>
            <p className="text-2xl font-bold gradient-text">{creditsBalance.toFixed(2)}</p>
          </div>
          <Badge variant={tier === 'pro' ? 'green' : 'neutral'} dot={tier === 'pro'}>
            {tier === 'pro' ? 'Pro' : 'Free'}
          </Badge>
          <Button variant="outline" size="sm" onClick={onLogout}>Log out</Button>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-lg font-bold text-white">CLI activation</h2>
          <Badge variant={isCliActivated ? 'green' : 'yellow'} dot={isCliActivated}>
            {isCliActivated ? 'Activated' : 'Not activated'}
          </Badge>
        </div>
        <p className="text-sm mb-3" style={{ color: 'var(--text-3)' }}>
          Activate the CLI on your machine with:
        </p>
        <div className="rounded-lg p-4 font-mono text-sm" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--text-3)' }}>$ </span>
          <span style={{ color: 'var(--green)' }}>
            agentsentry activate {activationCode ?? 'AS-FREE-XXXX-XXXX-XXXX-XXXX'}
          </span>
        </div>
      </div>

      {error && (
        <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>
      )}

      {tier === 'free' && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-white mb-2">Upgrade to Pro</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
            Pro unlocks all cloud scanners (AWS, Azure, GCP, GitHub, K8s) and blast-radius
            analysis. Enter your Stripe transaction ID or a dev approval code.
          </p>
          <form onSubmit={handleUpgrade} className="flex flex-wrap gap-3">
            <input
              type="text"
              required
              value={upgradeInput}
              onChange={e => setUpgradeInput(e.target.value)}
              placeholder="cs_… / pi_… or approval code"
              className="flex-1 min-w-[220px] rounded-lg px-4 py-3 text-sm outline-none font-mono"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
              }}
            />
            <Button type="submit" disabled={upgrading}>
              {upgrading ? 'Upgrading…' : 'Upgrade'}
            </Button>
          </form>
          {upgradeError && (
            <p className="text-sm mt-3" style={{ color: 'var(--red)' }}>{upgradeError}</p>
          )}
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-white mb-4">Buy credits</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {CREDIT_PACKAGES.map(pkg => (
            <div key={pkg.id} className="card p-6 flex flex-col gap-4">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>{pkg.name}</p>
                <p className="text-3xl font-bold text-white mt-1">${pkg.priceUsd}</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{pkg.credits} credits</p>
              </div>
              <Button
                onClick={() => handleBuy(pkg.id)}
                disabled={buyingId !== null}
                fullWidth
              >
                {buyingId === pkg.id ? 'Redirecting…' : 'Buy now'}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-4">Transaction history</h2>
        <div className="card overflow-hidden">
          {transactions.length === 0 ? (
            <p className="p-6 text-sm" style={{ color: 'var(--text-3)' }}>
              No transactions yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left p-4 font-medium" style={{ color: 'var(--text-3)' }}>Action</th>
                  <th className="text-right p-4 font-medium" style={{ color: 'var(--text-3)' }}>Credits</th>
                  <th className="text-right p-4 font-medium" style={{ color: 'var(--text-3)' }}>Cost</th>
                  <th className="text-right p-4 font-medium" style={{ color: 'var(--text-3)' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                    <td className="p-4 text-white">{formatAction(tx.action)}</td>
                    <td
                      className="p-4 text-right font-mono"
                      style={{ color: tx.credits_amount >= 0 ? 'var(--green)' : 'var(--red)' }}
                    >
                      {tx.credits_amount >= 0 ? '+' : ''}{tx.credits_amount.toFixed(2)}
                    </td>
                    <td className="p-4 text-right" style={{ color: 'var(--text-2)' }}>
                      {tx.cost_usd !== null ? `$${tx.cost_usd.toFixed(2)}` : '—'}
                    </td>
                    <td className="p-4 text-right" style={{ color: 'var(--text-3)' }}>
                      {formatDate(tx.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
