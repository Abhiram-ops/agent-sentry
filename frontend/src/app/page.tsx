import { NavbarWeb3 } from '@/components/layout/NavbarWeb3';
import { HeroWeb3 } from '@/components/sections/HeroWeb3';
import Stats from '@/components/sections/Stats';
import HowItWorks from '@/components/sections/HowItWorks';
import Providers from '@/components/sections/Providers';
import InteractiveGraph from '@/components/sections/InteractiveGraph';
import Features from '@/components/sections/Features';
import RiskCalculator from '@/components/sections/RiskCalculator';
import Research from '@/components/sections/Research';
import Pricing from '@/components/sections/Pricing';
import { NewsletterSignup } from '@/components/sections/NewsletterSignup';
import Contact from '@/components/sections/Contact';
import Footer from '@/components/layout/Footer';

export default function Home() {
  return (
    <main>
      <NavbarWeb3 />
      <HeroWeb3 />
      <Stats />
      <HowItWorks />
      <Providers />
      <InteractiveGraph />
      <Features />
      <RiskCalculator />
      <Research />
      <Pricing />
      <NewsletterSignup />
      <Contact />
      <Footer />
    </main>
  );
}
