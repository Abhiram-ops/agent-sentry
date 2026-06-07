'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ClaimPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setAlreadyClaimed(data.alreadyClaimed ?? false);
      } else {
        setStatus('error');
        setErrorMsg(data.error || 'Something went wrong.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error — please try again.');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-20"
      style={{ background: 'linear-gradient(135deg, #000 0%, #0a1a0f 50%, #000 100%)' }}>

      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div className="relative w-full max-w-md z-10">

        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 opacity-70 hover:opacity-100 transition-opacity">
            <span style={{ color: '#00ff88', fontSize: '1.4rem' }}>⬡</span>
            <span style={{ color: '#00ff88', fontWeight: 700, fontSize: '1.1rem', fontFamily: 'monospace' }}>AgentSentry</span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Claim your free key</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            One key. All cloud scanners. No credit card.
          </p>
          <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Already registered?{' '}
            <span style={{ color: 'rgba(0,255,136,0.6)' }}>Re-enter your email below — we&apos;ll resend your key instantly.</span>
          </p>
        </div>

        {status === 'success' ? (
          <div className="rounded-xl p-8 text-center border" style={{
            background: 'rgba(0,255,136,0.05)',
            borderColor: 'rgba(0,255,136,0.3)',
          }}>
            <div className="text-5xl mb-4">📬</div>
            <h2 className="text-xl font-bold text-white mb-2">
              {alreadyClaimed ? 'Key re-sent!' : 'Check your inbox!'}
            </h2>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Your free key was sent to <span className="text-white font-medium">{form.email}</span>.
              {alreadyClaimed && ' We found your existing key and sent it again.'}
            </p>
            <div className="rounded-lg p-4 mb-6 text-left font-mono text-sm"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,255,136,0.2)' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)' }}># Once you have your key:</p>
              <p style={{ color: '#00ff88' }}>agentsentry activate AF-XXXX-XXXX-XXXX-XXXX</p>
            </div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Didn&apos;t receive it? Check spam, or{' '}
              <button onClick={() => setStatus('idle')}
                className="underline" style={{ color: '#00ff88' }}>try again</button>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-xl p-8 border" style={{
            background: 'rgba(255,255,255,0.03)',
            borderColor: 'rgba(255,255,255,0.08)',
          }}>

            <div className="rounded-lg p-4 mb-6 text-sm" style={{
              background: 'rgba(0,255,136,0.05)',
              border: '1px solid rgba(0,255,136,0.15)',
            }}>
              <p className="font-semibold mb-2" style={{ color: '#00ff88' }}>Free key unlocks:</p>
              <ul className="space-y-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                <li>✓ AWS / Azure / GCP / GitHub / K8s scanners</li>
                <li>✓ AI agent analyzer (LangChain, CrewAI, AutoGen)</li>
                <li>✓ P×R×E×A risk scoring + MITRE mapping</li>
                <li>✓ Blast radius analysis</li>
                <li style={{ color: 'rgba(255,255,255,0.35)' }}>— --visualize, --enrich, --json → Pro</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Full name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Abhiram Lanka"
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Work email
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@company.com"
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min 8 characters"
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Used to recover your key — enter the same password if you&apos;re already registered.
                </p>
              </div>
            </div>

            {errorMsg && (
              <p className="mt-4 text-sm text-red-400">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full mt-6 py-3 rounded-lg font-semibold text-sm transition-all"
              style={{
                background: status === 'loading' ? 'rgba(0,255,136,0.5)' : '#00ff88',
                color: '#000',
                cursor: status === 'loading' ? 'wait' : 'pointer',
              }}
            >
              {status === 'loading' ? 'Sending your key…' : 'Get my free key →'}
            </button>

            <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
              By creating an account you agree to receive occasional product emails.{' '}
              No spam. Unsubscribe anytime.
            </p>
          </form>
        )}

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Need Pro features?{' '}
          <a href="https://sentryagent.gumroad.com/l/eawugx"
            className="underline" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Get Pro — $49 one-time →
          </a>
        </p>
      </div>
    </main>
  );
}
