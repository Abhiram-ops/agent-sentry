import { NavbarWeb3 } from '@/components/layout/NavbarWeb3';
import { HeroWeb3 } from '@/components/sections/HeroWeb3';
import LiveAuditTerminal from '@/components/sections/LiveAuditTerminal';
import Stats from '@/components/sections/Stats';
import HowItWorks from '@/components/sections/HowItWorks';
import Providers from '@/components/sections/Providers';
import AttackGraphVisualizer from '@/components/sections/AttackGraphVisualizer';
import Features from '@/components/sections/Features';
import RiskCalculator from '@/components/sections/RiskCalculator';
import MethodologySection from '@/components/sections/MethodologySection';
import Pricing from '@/components/sections/Pricing';
import { NewsletterSignup } from '@/components/sections/NewsletterSignup';
import Contact from '@/components/sections/Contact';
import Footer from '@/components/layout/Footer';

export default function Home() {
  return (
    <main>
      <NavbarWeb3 />
      <HeroWeb3 />

      {/* Proof of work — live static audit of an agent codebase */}
      <section id="live-audit" aria-label="Live audit demonstration" className="container py-16">
        <LiveAuditTerminal />
      </section>

      <Stats />
      <HowItWorks />
      <Providers />

      {/* Proof of work — blast-radius attack graph with raw JSON evidence */}
      <section id="attack-graph" aria-label="Attack graph demonstration" className="container py-16">
        <AttackGraphVisualizer />
      </section>

      <Features />
      <RiskCalculator />

      {/* Academic methodology — PREA formula and the A-factor (renders its own <section>) */}
      <MethodologySection />

      <Pricing />
      <NewsletterSignup />
      <Contact />
      <Footer />
    </main>
  );
}
