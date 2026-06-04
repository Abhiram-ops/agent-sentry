'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Container } from '@/components/ui/Container';
import { GlowLine } from '@/components/graphics/GlowLine';

export function Stats() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [counts, setCounts] = useState({ nhi: 0, cves: 0, rate: 0 });

  useEffect(() => {
    if (!isInView) return;

    const intervals = [
      setInterval(() => setCounts(c => ({ ...c, nhi: Math.min(c.nhi + 2, 47) })), 30),
      setInterval(() => setCounts(c => ({ ...c, cves: Math.min(c.cves + 50, 1610) })), 20),
      setInterval(() => setCounts(c => ({ ...c, rate: Math.min(c.rate + 1, 99) })), 40),
    ];

    return () => intervals.forEach(clearInterval);
  }, [isInView]);

  const stats = [
    { label: 'Non-Human Identities Found', value: counts.nhi, suffix: '+' },
    { label: 'CISA KEV Entries', value: counts.cves, suffix: '' },
    { label: 'Accuracy Rate', value: counts.rate, suffix: '%' },
  ];

  return (
    <section
      ref={ref}
      style={{
        paddingTop: '100px',
        paddingBottom: '100px',
        background: '#000',
        position: 'relative',
      }}
    >
      <GlowLine variant="dim" position="top" />

      <Container>
        <div style={{ marginBottom: '80px', textAlign: 'center' }}>
          <h2
            style={{
              fontSize: '42px',
              fontWeight: 700,
              color: '#fff',
              marginBottom: '16px',
              fontFamily: 'var(--font-geist-sans)',
            }}
          >
            Built for Enterprise Scale
          </h2>
          <p
            style={{
              fontSize: '18px',
              color: '#888',
              fontFamily: 'var(--font-geist-sans)',
            }}
          >
            Real numbers from real AWS environments
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '40px',
          }}
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              style={{
                textAlign: 'center',
                padding: '32px',
                background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
                border: '1px solid #1a1a1a',
                borderRadius: '12px',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 700,
                  color: '#00ff88',
                  marginBottom: '12px',
                  fontFamily: 'var(--font-geist-mono)',
                }}
              >
                {stat.value}
                {stat.suffix}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#888',
                  fontFamily: 'var(--font-geist-sans)',
                }}
              >
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
