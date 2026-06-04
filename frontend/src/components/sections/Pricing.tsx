'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Container } from '@/components/ui/Container';
import { GlowLine } from '@/components/graphics/GlowLine';
import { Button } from '@/components/ui/Button';
import { Check, Lock } from 'lucide-react';

export function Pricing() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const tiers = [
    {
      name: 'Open Source',
      price: 'Free',
      description: 'Full-featured CLI tool',
      color: '#00ff88',
      features: [
        'AWS NHI discovery',
        'AI agent static analysis',
        'Risk scoring engine',
        'Attack graph visualization',
        'CISA KEV enrichment',
        'Community support',
      ],
      locked: false,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'SaaS platform with advanced features',
      color: '#ffcc00',
      features: [
        'Everything in Open Source',
        'Continuous monitoring',
        'Remediation workflows',
        'Audit-grade PDF reports',
        'Multi-cloud support',
        'Dedicated support',
      ],
      locked: true,
    },
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
      <GlowLine variant="secondary" position="top" />

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
            Open Source, Built for Scale
          </h2>
          <p
            style={{
              fontSize: '18px',
              color: '#888',
              fontFamily: 'var(--font-geist-sans)',
            }}
          >
            Free open source forever. Advanced features coming soon for enterprises.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '40px',
            maxWidth: '900px',
            margin: '0 auto',
          }}
        >
          {tiers.map((tier, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
              style={{
                padding: '40px',
                background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
                border: `2px solid ${tier.color}40`,
                borderRadius: '12px',
                position: 'relative',
              }}
            >
              <div style={{ marginBottom: '24px' }}>
                <h3
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#fff',
                    marginBottom: '8px',
                    fontFamily: 'var(--font-geist-sans)',
                  }}
                >
                  {tier.name}
                </h3>
                <p
                  style={{
                    fontSize: '14px',
                    color: '#888',
                    fontFamily: 'var(--font-geist-sans)',
                  }}
                >
                  {tier.description}
                </p>
              </div>

              <div
                style={{
                  fontSize: '36px',
                  fontWeight: 700,
                  color: tier.color,
                  marginBottom: '32px',
                  fontFamily: 'var(--font-geist-mono)',
                }}
              >
                {tier.price}
              </div>

              <Button
                href={tier.locked ? '#' : 'https://github.com/Abhiram-ops/agent-sentry'}
                variant={tier.locked ? 'secondary' : 'primary'}
                style={{ width: '100%', marginBottom: '32px' }}
              >
                {tier.locked ? 'Coming Soon' : 'Get Started'}
              </Button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tier.features.map((feature, j) => (
                  <div
                    key={j}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      color: '#aaa',
                      fontSize: '14px',
                      fontFamily: 'var(--font-geist-sans)',
                    }}
                  >
                    {tier.locked && j >= 1 ? (
                      <Lock size={18} color="#888" style={{ marginTop: '2px', flexShrink: 0 }} />
                    ) : (
                      <Check size={18} color={tier.color} style={{ marginTop: '2px', flexShrink: 0 }} />
                    )}
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
