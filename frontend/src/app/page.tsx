import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { NavbarWeb3 } from '@/components/layout/NavbarWeb3';
import { HeroWeb3 } from '@/components/sections/HeroWeb3';
import HowItWorks from '@/components/sections/HowItWorks';
import Providers from '@/components/sections/Providers';
import Features from '@/components/sections/Features';
import Footer from '@/components/layout/Footer';

// 1. Export Metadata for SEO
export const metadata: Metadata = {
  title: 'NHI Discovery & Security Scanner | AgentSentry',
  description: 'Discover, secure, and map Non-Human Identities (NHIs) across AWS, Azure, GCP, and GitHub using a zero-telemetry local engine.',
};

// Below-the-fold, animation-heavy sections — code-split so their JS
// (framer-motion, SVG/graph rendering) only loads as the user scrolls.
const LiveAuditTerminal = dynamic(() => import('@/components/sections/LiveAuditTerminal'), {
  loading: () => <div className="section-skeleton" style={{ height: 420 }} />,
});
const AttackGraphVisualizer = dynamic(() => import('@/components/sections/AttackGraphVisualizer'), {
  loading: () => <div className="section-skeleton" style={{ height: 480 }} />,
});
const RiskCalculator = dynamic(() => import('@/components/sections/RiskCalculator'), {
  loading: () => <div className="section-skeleton" style={{ height: 420 }} />,
});
const MethodologySection = dynamic(() => import('@/components/sections/MethodologySection'), {
  loading: () => <div className="section-skeleton" style={{ height: 320 }} />,
});
const Pricing = dynamic(() => import('@/components/sections/Pricing'), {
  loading: () => <div className="section-skeleton" style={{ height: 420 }} />,
});
const NewsletterSignup = dynamic(
  () => import('@/components/sections/NewsletterSignup').then((mod) => mod.NewsletterSignup),
  { loading: () => <div className="section-skeleton" style={{ height: 180 }} /> }
);
const Contact = dynamic(() => import('@/components/sections/Contact'), {
  loading: () => <div className="section-skeleton" style={{ height: 320 }} />,
});

export default function Home() {
  // 2. Define the structured data object matching your primary keywords
  const nhiJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is a Non-Human Identity (NHI)?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A Non-Human Identity (NHI) refers to programmatic access credentials—such as API keys, service accounts, tokens, and IAM roles—used by applications, AI agents, and automated scripts to interact with cloud infrastructure.',
        },
      },
      {
        '@type': 'Question',
        name: 'How can I find my NHIs?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You can discover and map your NHIs using a static analysis framework like AgentSentry. It executes a local scan across multi-cloud environments and source repositories to track exposed keys and evaluate privilege boundaries.',
        },
      },
    ],
  };

  return (
    <main>
      {/* 3. Inject the hidden script for Google Search Crawlers */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(nhiJsonLd) }}
      />

      <NavbarWeb3 />
      <HeroWeb3 />
      <HowItWorks />
      <Providers />

      {/* Proof of work — live static audit of an agent codebase */}
      <section id="live-audit" aria-label="Live audit demonstration" className="section section-dark">
        <div className="container">
          <div className="section-header centered">
            <div className="section-label" style={{ justifyContent: 'center' }}>Proof of work</div>
            <h2>Watch a real scan run</h2>
            <p>
              No staged demo — this is the actual CLI scanning a sample agent codebase and surfacing
              a critical PREA finding line by line.
            </p>
          </div>
          <LiveAuditTerminal />
        </div>
      </section>

      <Features />

      {/* Proof of work — blast-radius attack graph with raw JSON evidence */}
      <section id="attack-graph" aria-label="Attack graph demonstration" className="section section-dark">
        <div className="container">
          <div className="section-header centered">
            <div className="section-label" style={{ justifyContent: 'center' }}>Proof of work</div>
            <h2>From one compromised agent to your data</h2>
            <p>
              Click a node to inspect the raw evidence behind each hop in the blast radius graph.
            </p>
          </div>
          <AttackGraphVisualizer />
        </div>
      </section>

      <RiskCalculator />
      <MethodologySection />
      <Pricing />
      <NewsletterSignup />
      <Contact />

      {/* 4. Visible FAQ Layout (Required for Google Schema Validation) */}
      <section id="faq" className="max-w-4xl mx-auto py-20 px-6 border-t border-border/40">
        <div className="container">
          <h2 className="text-3xl font-bold tracking-tight mb-8 bg-gradient-to-r from-white to-muted-foreground bg-clip-text text-transparent">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="p-6 bg-card/50 rounded-xl border border-border/50 backdrop-blur-sm">
              <h3 className="text-xl font-semibold text-white mb-2">What is a Non-Human Identity (NHI)?</h3>
              <p className="text-muted-foreground">
                A Non-Human Identity (NHI) refers to programmatic access credentials—such as API keys, service accounts, tokens, and IAM roles—used by applications, AI agents, and automated scripts to interact with cloud infrastructure.
              </p>
            </div>
            <div className="p-6 bg-card/50 rounded-xl border border-border/50 backdrop-blur-sm">
              <h3 className="text-xl font-semibold text-white mb-2">How can I find my NHIs?</h3>
              <p className="text-muted-foreground">
                You can discover and map your NHIs using a static analysis framework like AgentSentry. It executes a local scan across multi-cloud environments and source repositories to track exposed keys and evaluate privilege boundaries.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}