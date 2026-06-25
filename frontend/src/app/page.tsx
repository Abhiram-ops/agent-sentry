import dynamic from 'next/dynamic';
import { NavbarWeb3 } from '@/components/layout/NavbarWeb3';
import { HeroWeb3 } from '@/components/sections/HeroWeb3';
import HowItWorks from '@/components/sections/HowItWorks';
import Providers from '@/components/sections/Providers';
import Features from '@/components/sections/Features';
import Footer from '@/components/layout/Footer';
import { FadeIn } from '@/components/ui/FadeIn';

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
  return (
    <main>
      <NavbarWeb3 />
      <HeroWeb3 />
      <HowItWorks />
      <Providers />

      {/* Proof of work — live static audit of an agent codebase */}
      <section id="live-audit" aria-label="Live audit demonstration" className="section section-dark">
        <div className="container">
          <FadeIn className="section-header centered">
            <div className="section-label" style={{ justifyContent: 'center' }}>Proof of work</div>
            <h2>Watch a real scan run</h2>
            <p>
              No staged demo — this is the actual CLI scanning a sample agent codebase and surfacing
              a critical PREA finding line by line.
            </p>
          </FadeIn>
          <LiveAuditTerminal />
        </div>
      </section>

      <Features />

      {/* Proof of work — blast-radius attack graph with raw JSON evidence */}
      <section id="attack-graph" aria-label="Attack graph demonstration" className="section section-dark">
        <div className="container">
          <FadeIn className="section-header centered">
            <div className="section-label" style={{ justifyContent: 'center' }}>Proof of work</div>
            <h2>From one compromised agent to your data</h2>
            <p>
              Click a node to inspect the raw evidence behind each hop in the blast radius graph.
            </p>
          </FadeIn>
          <AttackGraphVisualizer />
        </div>
      </section>

      <RiskCalculator />
      <MethodologySection />
      <Pricing />
      <NewsletterSignup />
      <Contact />
      <Footer />
    </main>
  );
}
