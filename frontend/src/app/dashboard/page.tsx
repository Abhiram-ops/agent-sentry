'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { NavbarWeb3 as Navbar } from '@/components/layout/NavbarWeb3';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { CreditTransaction, Tier, ScanReport, SubscriptionStatus } from '@/lib/db';
import { Copy, Check, Mail, KeyRound, RefreshCw, Zap, Download, Trash2 } from 'lucide-react';

const PRO_BENEFITS = [
  'All cloud scanners — AWS, Azure, GCP, GitHub, and Kubernetes',
  'AI-agent framework detection — LangChain, CrewAI, and AutoGen',
  'Blast-radius mapping with lateral-movement attack graphs',
  'CISA KEV enrichment and JSON exports for CI pipelines',
  'Automated scheduled scans (Automation add-on, $9/mo) — recurring local scans that email you when new NHIs, zombie credentials, or rotation-due keys are found',
];

interface Profile {
  email: string;
  api_key_preview: string;
  credits_balance: number;
  tier: Tier;
  activation_code: string | null;
  is_cli_activated: boolean;
  created_at: string;
  subscription_status: SubscriptionStatus;
  subscription_current_period_end: string | null;
}

// AgentSentry is in beta — new purchases/subscriptions are paused. Keep this
// in sync with BILLING_PAUSED in src/lib/stripe.ts.
const PAYMENTS_PAUSED = true;

const CREDIT_PACKAGES = [
  { id: 1, name: 'Starter', credits: 10, priceUsd: 5 },
  { id: 2, name: 'Growth', credits: 40, priceUsd: 15 },
  { id: 3, name: 'Scale', credits: 150, priceUsd: 50 },
];

const SCHEDULE_CMD = 'agentsentry schedule add --target aws --interval daily --output-dir ~/agentsentry-reports --notify-email';

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
  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Automated scans
  const [scanReports, setScanReports] = useState<ScanReport[]>([]);
  const [subBusy, setSubBusy] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

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

      const reportsRes = await fetch('/api/user/scan-reports', { cache: 'no-store' });
      if (reportsRes.ok) {
        const json = (await reportsRes.json()) as { reports: ScanReport[] };
        setScanReports(json.reports);
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
    } else if (params.get('subscription') === 'success') {
      setBanner({ kind: 'success', text: 'Automation subscription activated — it may take a moment to sync.' });
    } else if (params.get('subscription') === 'cancelled') {
      setBanner({ kind: 'error', text: 'Subscription checkout was cancelled.' });
    }
    if (params.toString()) {
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

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
        setProfile(p => (p ? { ...p, api_key_preview: json.api_key_preview } : p));
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
        headers: { 'Content-Type': 'application/json' },
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

  async function handleSubscribe() {
    if (!profile) return;
    setSubBusy(true);
    setBanner(null);
    try {
      const res = await fetch('/api/billing/subscribe', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.checkout_url) {
        window.location.assign(json.checkout_url);
        return;
      }
      setBanner({ kind: 'error', text: json.error ?? 'Failed to start checkout.' });
      setSubBusy(false);
    } catch {
      setBanner({ kind: 'error', text: 'Network error — please try again.' });
      setSubBusy(false);
    }
  }

  async function handleManageSubscription() {
    if (!profile) return;
    setSubBusy(true);
    setBanner(null);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.portal_url) {
        window.location.assign(json.portal_url);
        return;
      }
      setBanner({ kind: 'error', text: json.error ?? 'Failed to open billing portal.' });
      setSubBusy(false);
    } catch {
      setBanner({ kind: 'error', text: 'Network error — please try again.' });
      setSubBusy(false);
    }
  }

  function handleExportData() {
    window.location.assign('/api/user/export');
  }

  async function handleDeleteAccount() {
    if (!confirm('Request account deletion? We\'ll email you a confirmation link — your account is only deleted after you click it.')) return;
    setDeleteBusy(true);
    setBanner(null);
    try {
      const res = await fetch('/api/user/delete', { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        setBanner({ kind: 'success', text: json.message ?? 'Check your email to confirm account deletion.' });
      } else {
        setBanner({ kind: 'error', text: json.error ?? 'Could not start account deletion.' });
      }
    } catch {
      setBanner({ kind: 'error', text: 'Network error — please try again.' });
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleCopyCmd() {
    try {
      await navigator.clipboard.writeText(SCHEDULE_CMD);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 1500);
    } catch { /* clipboard unavailable */ }
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
                    <code className="copy-field-code" style={{ minWidth: 240, letterSpacing: 1 }}>
                      {profile.api_key_preview}
                    </code>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
                    Your full API key is not displayed for security. To retrieve it, email{' '}
                    <a href="mailto:support@agentsentry.org" style={{ color: 'var(--accent)' }}>support@agentsentry.org</a>{' '}
                    from your registered address and we&apos;ll send it securely.
                  </p>
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

              {/* Automated scans */}
              <section className="dash-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Automated scans</h2>
                  <Badge variant={profile.subscription_status === 'active' ? 'green' : profile.subscription_status === 'past_due' ? 'yellow' : 'neutral'} dot={profile.subscription_status === 'active'}>
                    {profile.subscription_status === 'active' ? 'Active' : profile.subscription_status === 'past_due' ? 'Past due' : 'Not subscribed'}
                  </Badge>
                </div>

                {profile.subscription_status === 'active' ? (
                  <>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
                      Register a local scheduled scan with the CLI below. Reports are written to a directory you choose, and — with <code style={{ fontFamily: 'var(--font-mono)' }}>--notify-email</code> — a summary is emailed here after each run.
                    </p>
                    <div className="copy-field-row" style={{ marginBottom: 16 }}>
                      <code className="copy-field-code">{SCHEDULE_CMD}</code>
                      <button type="button" onClick={handleCopyCmd} aria-label="Copy command" className={`copy-field-btn ${copiedCmd ? 'copied' : ''}`}>
                        {copiedCmd ? <Check style={{ width: 16, height: 16 }} /> : <Copy style={{ width: 16, height: 16 }} />}
                      </button>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={subBusy}>
                      {subBusy ? 'Opening…' : 'Manage subscription'}
                    </Button>

                    <div style={{ marginTop: 24 }}>
                      <div className="dash-label" style={{ marginBottom: 10 }}>Recent scan reports</div>
                      {scanReports.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No scheduled scans reported yet.</p>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table className="dash-table">
                            <thead>
                              <tr>
                                <th>Target</th>
                                <th>New NHIs</th>
                                <th>Newly zombie</th>
                                <th style={{ textAlign: 'right' }}>Rotation due</th>
                                <th>Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {scanReports.map(r => (
                                <tr key={r.id}>
                                  <td style={{ textTransform: 'uppercase' }}>{r.target}</td>
                                  <td style={{ fontFamily: 'var(--font-mono)', color: r.new_nhi_count > 0 ? '#dc2626' : 'var(--text)' }}>{r.new_nhi_count}</td>
                                  <td style={{ fontFamily: 'var(--font-mono)' }}>{r.new_zombie_count}</td>
                                  <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{r.rotation_due_count}</td>
                                  <td style={{ color: 'var(--text-faint)' }}>{formatDate(r.created_at)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
                      Run scans on a schedule from your own machine — no credentials leave your environment. Each run diffs
                      against the previous scan and alerts you to new identities (with remediation suggestions), newly-zombie
                      credentials, and credentials due for rotation.
                    </p>
                    {profile.tier === 'pro' ? (
                      PAYMENTS_PAUSED ? (
                        <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>
                          New subscriptions are paused during beta. Email{' '}
                          <a href="mailto:support@agentsentry.org" style={{ color: 'var(--accent)' }}>support@agentsentry.org</a>{' '}
                          if you&apos;d like early access to automated scans.
                        </p>
                      ) : (
                        <Button onClick={handleSubscribe} disabled={subBusy}>
                          {subBusy ? 'Redirecting…' : 'Subscribe — $9/mo'}
                        </Button>
                      )
                    ) : (
                      <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>Requires an active Pro license.</p>
                    )}
                  </>
                )}
              </section>

              {/* Buy credits */}
              <section className="dash-card">
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>Buy credits</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>Pay-as-you-go. Credits never expire.</p>
                {PAYMENTS_PAUSED && (
                  <p style={{ color: 'var(--text-faint)', fontSize: 13, marginBottom: 16 }}>
                    AgentSentry is in beta and credit purchases are temporarily paused. Email{' '}
                    <a href="mailto:support@agentsentry.org" style={{ color: 'var(--accent)' }}>support@agentsentry.org</a>{' '}
                    if you need more credits.
                  </p>
                )}
                <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                  {CREDIT_PACKAGES.map(pkg => (
                    <div key={pkg.id} className="dash-pkg-card">
                      <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>{pkg.name}</p>
                        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 700, marginTop: 4, color: 'var(--text)' }}>${pkg.priceUsd}</p>
                        <p style={{ color: 'var(--text-faint)', fontSize: 13, marginTop: 2 }}>{pkg.credits} credits</p>
                      </div>
                      <Button onClick={() => handleBuy(pkg.id)} disabled={PAYMENTS_PAUSED || buyingId !== null} fullWidth>
                        {PAYMENTS_PAUSED ? 'Paused' : buyingId === pkg.id ? 'Redirecting…' : 'Buy'}
                      </Button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Privacy & data */}
              <section className="dash-card">
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>Privacy & data</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 18 }}>
                  Export everything we hold about your account, or permanently delete it.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Button variant="outline" size="sm" onClick={handleExportData}>
                    <Download style={{ width: 13, height: 13, marginRight: 6 }} /> Export my data
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDeleteAccount} disabled={deleteBusy}>
                    <Trash2 style={{ width: 13, height: 13, marginRight: 6 }} /> {deleteBusy ? 'Sending…' : 'Delete my account'}
                  </Button>
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
