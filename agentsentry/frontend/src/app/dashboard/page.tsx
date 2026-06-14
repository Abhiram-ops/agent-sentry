'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { NavbarWeb3 as Navbar } from '@/components/layout/NavbarWeb3';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { CreditTransaction, Tier } from '@/lib/db';
import { Copy, Check, Mail, KeyRound, RefreshCw, Zap } from 'lucide-react';

const PRO_BENEFITS = [
  'All cloud scanners — AWS, Azure, GCP, GitHub, and Kubernetes',
  'AI-agent framework detection — LangChain, CrewAI, and AutoGen',
  'Blast-radius mapping with lateral-movement attack graphs',
  'CISA KEV enrichment and JSON exports for CI pipelines',
  'Automated scheduled scans (Automation add-on, $9/mo) — recurring local scans that email you when new NHIs, zombie credentials, or rotation-due keys are found',
];

interface Profile {
  email: string;
  api_key: string;
  api_key_preview: string;
  credits_balance: number;
  tier: Tier;
  activation_code: string | null;
  is_cli_activated: boolean;
  created_at: string;
}

const CREDIT_PACKAGES = [
  { id: 1, name: 'Starter', credits: 10, priceUsd: 5 },
  { id: 2, name: 'Growth', credits: 40, priceUsd: 15 },
  { id: 3, name: 'Scale', credits: 150, priceUsd: 50 },
];

function formatAction(action: string): string {
  return action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function Banner({ kind, children }: { kind: 'success' | 'error'; children: React.ReactNode }) {
  return <div className={`dash-banner ${kind}`}>{children}</div>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  // Profile actions
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);
  const [buyingId, setBuyingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/user/profile', { cache: 'no-store' });
      if (!res.ok) {
        router.replace('/login');
        return;
      }
      const p = (await res.json()) as Profile;
      setProfile(p);

      const txRes = await fetch('/api/user/transactions?limit=10', { cache: 'no-store' });
      if (txRes.ok) {
        const json = (await txRes.json()) as { transactions: CreditTransaction[] };
        setTransactions(json.transactions);
      }
    } catch {
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  // Surface redirect flags from the email-change + checkout flows.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('email_updated') === '1') {
      setBanner({ kind: 'success', text: 'Your email address has been updated.' });
    } else if (params.get('email_error') === '1') {
      setBanner({ kind: 'error', text: 'That email-change link was invalid or expired.' });
    } else if (params.get('checkout') === 'success') {
      setBanner({ kind: 'success', text: 'Payment received — your credits will appear shortly.' });
    } else if (params.get('checkout') === 'cancelled') {
      setBanner({ kind: 'error', text: 'Checkout was cancelled.' });
    }
    if (params.toString()) {
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

  async function handleCopyKey() {
    if (!profile) return;
    try {
      await navigator.clipboard.writeText(profile.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  }

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    router.replace('/');
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    const value = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setBanner({ kind: 'error', text: 'Enter a valid email address.' });
      return;
    }
    setEmailBusy(true);
    setBanner(null);
    try {
      const res = await fetch('/api/user/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_email: value }),
      });
      const json = await res.json();
      if (res.ok) {
        setBanner({ kind: 'success', text: json.message ?? `Confirmation sent to ${value}` });
        setChangingEmail(false);
        setNewEmail('');
      } else {
        setBanner({ kind: 'error', text: json.error ?? 'Could not start email change.' });
      }
    } catch {
      setBanner({ kind: 'error', text: 'Network error — please try again.' });
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleRegenerate() {
    if (!confirm('Regenerate your API key? Your current key will stop working immediately.')) return;
    setRegenBusy(true);
    setBanner(null);
    try {
      const res = await fetch('/api/user/regenerate-api-key', { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        setProfile(p => (p ? { ...p, api_key: json.api_key, api_key_preview: json.api_key_preview } : p));
        setBanner({ kind: 'success', text: 'New API key generated and emailed to you.' });
      } else {
        setBanner({ kind: 'error', text: json.error ?? 'Could not regenerate key.' });
      }
    } catch {
      setBanner({ kind: 'error', text: 'Network error — please try again.' });
    } finally {
      setRegenBusy(false);
    }
  }

  async function handleBuy(packageId: number) {
    if (!profile) return;
    setBuyingId(packageId);
    setBanner(null);
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${profile.api_key}` },
        body: JSON.stringify({ package_id: packageId }),
      });
      const json = await res.json();
      if (res.ok && json.checkout_url) {
        window.location.assign(json.checkout_url);
        return;
      }
      setBanner({ kind: 'error', text: json.error ?? 'Failed to start checkout.' });
      setBuyingId(null);
    } catch {
      setBanner({ kind: 'error', text: 'Network error — please try again.' });
      setBuyingId(null);
    }
  }

  return (
    <div className="auth-shell">
      <Navbar />
      <main style={{ flex: 1, padding: '140px 24px 80px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', width: '100%' }}>
          <div style={{ marginBottom: 32 }}>
            <p className="dash-label" style={{ color: 'var(--accent)', marginBottom: 10 }}>Dashboard</p>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 700, color: 'var(--text)' }}>Your account</h1>
          </div>

          {loading && <p style={{ color: 'var(--text-muted)' }}>Loading…</p>}

          {!loading && profile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {banner && <Banner kind={banner.kind}>{banner.text}</Banner>}

              {/* Profile */}
              <section className="dash-card">
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: 'var(--text)' }}>Profile</h2>

                <div style={{ marginBottom: 20 }}>
                  <div className="dash-label" style={{ marginBottom: 6 }}>Email</div>
                  {!changingEmail ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, color: 'var(--text)' }}>{profile.email}</span>
                      <Button variant="outline" size="sm" onClick={() => { setChangingEmail(true); setBanner(null); }}>
                        <Mail style={{ width: 13, height: 13, marginRight: 6 }} /> Change email
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleChangeEmail} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)}
                        placeholder="new@example.com"
                        className="auth-input"
                        style={{ flex: 1, minWidth: 220, width: 'auto' }} />
                      <Button type="submit" size="sm" disabled={emailBusy}>{emailBusy ? 'Sending…' : 'Send confirmation'}</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setChangingEmail(false); setNewEmail(''); }}>Cancel</Button>
                    </form>
                  )}
                </div>

                <div>
                  <div className="dash-label" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <KeyRound style={{ width: 12, height: 12 }} /> API key
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <code className="copy-field-code" style={{ minWidth: 240 }}>
                      {showKey ? profile.api_key : profile.api_key_preview}
                    </code>
                    <button type="button" onClick={() => setShowKey(s => !s)} className="dash-label" style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      {showKey ? 'Hide' : 'Show'}
                    </button>
                    <button type="button" onClick={handleCopyKey} aria-label="Copy API key" className={`copy-field-btn ${copied ? 'copied' : ''}`} style={{ width: 42, height: 42 }}>
                      {copied ? <Check style={{ width: 16, height: 16 }} /> : <Copy style={{ width: 16, height: 16 }} />}
                    </button>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenBusy}>
                      <RefreshCw style={{ width: 13, height: 13, marginRight: 6 }} /> {regenBusy ? 'Regenerating…' : 'Regenerate key'}
                    </Button>
                  </div>
                </div>

                <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                  <div className="dash-label" style={{ marginBottom: 8 }}>CLI activation {profile.is_cli_activated ? '· activated' : '· not yet activated'}</div>
                  <code className="next-step-box" style={{ display: 'block', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                    agentsentry activate {profile.activation_code ?? 'AS-FREE-XXXX-XXXX-XXXX-XXXX'}
                  </code>
                </div>
              </section>

              {/* Pro benefits */}
              {profile.tier === 'pro' && (
                <section className="dash-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <Zap style={{ width: 18, height: 18, color: 'var(--accent)' }} />
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Your Pro benefits</h2>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 18 }}>
                    Your Pro license unlocks the following on the CLI.
                  </p>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20, paddingLeft: 0, listStyle: 'none' }}>
                    {PRO_BENEFITS.map(benefit => (
                      <li key={benefit} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--text)' }}>
                        <Check style={{ width: 16, height: 16, marginTop: 2, color: 'var(--accent)', flexShrink: 0 }} />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="dash-label" style={{ marginBottom: 8 }}>Try the new automated scans</div>
                  <code className="next-step-box" style={{ display: 'block', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                    agentsentry schedule add --target aws --interval daily --output-dir ~/agentsentry-reports --notify-email
                  </code>
                </section>
              )}

              {/* Credits */}
              <section className="dash-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                  <div>
                    <div className="dash-label" style={{ marginBottom: 6 }}>Current balance</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 700, color: 'var(--accent)' }}>{profile.credits_balance.toFixed(2)}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>credits</span>
                      <Badge variant={profile.tier === 'pro' ? 'green' : 'neutral'} dot={profile.tier === 'pro'}>
                        {profile.tier === 'pro' ? 'Pro' : 'Free'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="dash-label" style={{ marginBottom: 10 }}>Transaction history</div>
                {transactions.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No transactions yet.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>Action</th>
                          <th>Credits</th>
                          <th>Cost</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map(tx => (
                          <tr key={tx.id}>
                            <td>{formatAction(tx.action)}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', color: tx.credits_amount >= 0 ? 'var(--accent)' : '#dc2626' }}>
                              {tx.credits_amount >= 0 ? '+' : ''}{tx.credits_amount.toFixed(2)}
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>
                              {tx.cost_usd !== null ? `$${tx.cost_usd.toFixed(2)}` : '—'}
                            </td>
                            <td style={{ color: 'var(--text-faint)' }}>{formatDate(tx.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Buy credits */}
              <section className="dash-card">
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>Buy credits</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>Pay-as-you-go. Credits never expire.</p>
                <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                  {CREDIT_PACKAGES.map(pkg => (
                    <div key={pkg.id} className="dash-pkg-card">
                      <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>{pkg.name}</p>
                        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 700, marginTop: 4, color: 'var(--text)' }}>${pkg.priceUsd}</p>
                        <p style={{ color: 'var(--text-faint)', fontSize: 13, marginTop: 2 }}>{pkg.credits} credits</p>
                      </div>
                      <Button onClick={() => handleBuy(pkg.id)} disabled={buyingId !== null} fullWidth>
                        {buyingId === pkg.id ? 'Redirecting…' : 'Buy'}
                      </Button>
                    </div>
                  ))}
                </div>
              </section>

              <div>
                <Button variant="outline" onClick={handleLogout}>Log out</Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
