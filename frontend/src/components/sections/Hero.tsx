'use client';

import { motion } from 'framer-motion';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DotGrid } from '@/components/graphics/DotGrid';
import { Orbs } from '@/components/graphics/Orbs';
import { Terminal } from 'lucide-react';
import Link from 'next/link';

export function Hero() {
  const terminalLines = [
    '$ python -m agentsentry scan aws --enrich',
    '[AgentSentry] Connecting to AWS...',
    '[AgentSentry] Found 47 NHIs',
    'Critical: 8 | High: 12 | Medium: 27',
    '$ agentsentry scan mock --visualize',
    '✓ Graph saved: agentsentry_graph.html',
  ];

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #000 0%, #0a0a0a 100%)',
      }}
    >
      <DotGrid opacity={0.15} />
      <Orbs />

      {/* Radial glow behind hero content */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}
      >
        <div className="w-[800px] h-[500px] bg-[#00ff88]/5 blur-3xl rounded-full" />
      </div>

      <Container>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '80px',
            alignItems: 'center',
            paddingTop: '60px',
            paddingBottom: '60px',
          }}
        >
          {/* Left Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <div style={{ marginBottom: '24px' }}>
              <Badge dot>Open source · v0.1.0</Badge>
            </div>

            <h1
              className="bg-gradient-to-r from-[#00ff88] to-[#0099ff] bg-clip-text text-transparent"
              style={{
                fontSize: '56px',
                fontWeight: 700,
                lineHeight: 1.2,
                marginBottom: '24px',
                fontFamily: 'var(--font-geist-sans)',
              }}
            >
              Find every Machine's Identity before they do.
            </h1>

            <p
              style={{
                fontSize: '18px',
                color: '#aaa',
                lineHeight: 1.6,
                marginBottom: '40px',
                maxWidth: '500px',
                fontFamily: 'var(--font-geist-sans)',
              }}
            >
              Discover ungoverned AI agents and non-human identities in your cloud. Score attack risk. Fix it before attackers do.
            </p>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <Link
                href="https://github.com/Abhiram-ops/agent-sentry"
                className="backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 transition-all inline-flex items-center justify-center gap-2 font-semibold rounded-[10px] text-sm px-[22px] py-[11px] text-white no-underline whitespace-nowrap"
              >
                Get Started on GitHub
              </Link>
              <Button href="#research" variant="secondary">
                Read the Paper
              </Button>
            </div>
          </motion.div>

          {/* Right Column - Terminal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{
              background: '#0a0a0a',
              border: '1px solid #1a1a1a',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0, 255, 136, 0.1)',
            }}
          >
            {/* Terminal Header */}
            <div
              style={{
                background: '#1a1a1a',
                padding: '12px 16px',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                borderBottom: '1px solid #2a2a2a',
              }}
            >
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }} />
              <span style={{ marginLeft: '8px', color: '#666', fontSize: '13px' }}>agentsentry scan</span>
            </div>

            {/* Terminal Content */}
            <div style={{ padding: '20px', fontFamily: 'var(--font-geist-mono)', fontSize: '13px' }}>
              {terminalLines.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                  style={{
                    color: line.includes('$') ? '#00ff88' : line.includes('Critical') ? '#ff3366' : '#aaa',
                    marginBottom: '8px',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {line}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </Container>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#666',
        }}
      >
        <Terminal size={20} />
      </motion.div>
    </section>
  );
}
