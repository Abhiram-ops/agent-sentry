'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const DISMISS_KEY = 'agentsentry-beta-banner-dismissed';

export function BetaBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  function handleDismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch { /* localStorage unavailable */ }
  }

  if (dismissed) return null;

  return (
    <div
      role="status"
      style={{
        position: 'relative',
        zIndex: 101,
        background: 'var(--accent)',
        color: '#fff',
        textAlign: 'center',
        padding: '10px 44px',
        fontSize: 13.5,
        lineHeight: 1.5,
      }}
    >
      <strong>AgentSentry is under active development (beta).</strong>{' '}
      Please don&apos;t pay for Pro features yet, Pro purchases are temporarily disabled. If
      you&apos;d like early access to Pro, email{' '}
      <a href="mailto:support@agentsentry.org" style={{ color: '#fff', textDecoration: 'underline' }}>
        support@agentsentry.org
      </a>.
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{
          position: 'absolute',
          top: '50%',
          right: 12,
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          padding: 4,
        }}
      >
        <X style={{ width: 16, height: 16 }} />
      </button>
    </div>
  );
}
