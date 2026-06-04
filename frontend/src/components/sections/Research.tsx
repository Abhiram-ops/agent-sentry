'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Container } from '@/components/ui/Container';
import { GlowLine } from '@/components/graphics/GlowLine';
import { Button } from '@/components/ui/Button';
import { BookOpen, ArrowRight } from 'lucide-react';

export function Research() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section
      id="research"
      ref={ref}
      style={{
        paddingTop: '100px',
        paddingBottom: '100px',
        background: '#000',
        position: 'relative',
      }}
    >
      <GlowLine variant="accent" position="top" />

      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
          style={{
            padding: '48px',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
            border: '1px solid #00ff8840',
            borderRadius: '12px',
            maxWidth: '800px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <BookOpen size={40} color="#00ff88" style={{ margin: '0 auto 24px' }} />

          <h2
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#fff',
              marginBottom: '16px',
              fontFamily: 'var(--font-geist-sans)',
            }}
          >
            IEEE-Grade Research
          </h2>

          <p
            style={{
              fontSize: '16px',
              color: '#aaa',
              lineHeight: 1.8,
              marginBottom: '24px',
              fontFamily: 'var(--font-geist-sans)',
            }}
          >
            We introduced the <strong>AI-Amplification Factor</strong> — a novel academic contribution that quantifies how autonomous AI agents multiply the blast radius of a compromised identity.
          </p>

          <p
            style={{
              fontSize: '14px',
              color: '#888',
              marginBottom: '32px',
              fontFamily: 'var(--font-geist-sans)',
            }}
          >
            Published on arXiv cs.CR · Peer-reviewed submission in progress
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button href="#" variant="primary">
              <ArrowRight size={16} style={{ marginRight: '8px' }} />
              Read on arXiv
            </Button>
            <Button href="https://github.com/Abhiram-ops/agent-sentry/tree/main/paper" variant="secondary">
              View PDF & LaTeX
            </Button>
          </div>

          {/* Key contributions */}
          <div
            style={{
              marginTop: '40px',
              paddingTop: '32px',
              borderTop: '1px solid #1a1a1a',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px',
            }}
          >
            <div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#00ff88', marginBottom: '8px' }}>P×R×E×A</div>
              <div style={{ fontSize: '13px', color: '#888' }}>Risk scoring framework</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#ffcc00', marginBottom: '8px' }}>P→I→E→A</div>
              <div style={{ fontSize: '13px', color: '#888' }}>AI-amplified blast radius</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#ff3366', marginBottom: '8px' }}>4 Domains</div>
              <div style={{ fontSize: '13px', color: '#888' }}>NHI, AI agents, cloud, supply chain</div>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
