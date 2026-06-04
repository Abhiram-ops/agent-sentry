'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Container } from '@/components/ui/Container';
import { GlowLine } from '@/components/graphics/GlowLine';
import { Shield, Brain, Zap } from 'lucide-react';

export function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const features = [
    {
      icon: Shield,
      title: 'NHI Discovery',
      description: 'Automatically discover every service account, API key, and machine credential in your cloud.',
      color: '#00ff88',
    },
    {
      icon: Brain,
      title: 'AI Agent Scoring',
      description: 'Analyze autonomous AI agents. Calculate attack blast radius with the AI-Amplification Factor.',
      color: '#ffcc00',
    },
    {
      icon: Zap,
      title: 'CISA KEV Intel',
      description: 'Correlate findings against active exploits. Know which vulnerabilities are being exploited right now.',
      color: '#ff3366',
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
      <GlowLine variant="primary" position="top" />

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
            Core Capabilities
          </h2>
          <p
            style={{
              fontSize: '18px',
              color: '#888',
              fontFamily: 'var(--font-geist-sans)',
            }}
          >
            Everything you need to govern non-human identities
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '32px',
          }}
        >
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                whileHover={{ y: -4 }}
                style={{
                  padding: '32px',
                  background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
                  border: '1px solid #1a1a1a',
                  borderRadius: '12px',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
              >
                {/* Hover glow */}
                <motion.div
                  style={{
                    position: 'absolute',
                    top: '-50%',
                    left: '-50%',
                    width: '200%',
                    height: '200%',
                    background: `radial-gradient(circle, ${feature.color}20 0%, transparent 70%)`,
                    opacity: 0,
                  }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <Icon size={32} color={feature.color} style={{ marginBottom: '16px' }} />

                  <h3
                    style={{
                      fontSize: '20px',
                      fontWeight: 600,
                      color: '#fff',
                      marginBottom: '12px',
                      fontFamily: 'var(--font-geist-sans)',
                    }}
                  >
                    {feature.title}
                  </h3>

                  <p
                    style={{
                      fontSize: '14px',
                      color: '#888',
                      lineHeight: 1.6,
                      fontFamily: 'var(--font-geist-sans)',
                    }}
                  >
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
