import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import HowItWorks from "@/components/HowItWorks";
import Providers from "@/components/Providers";
import InteractiveGraph from "@/components/InteractiveGraph";
import Features from "@/components/Features";
import RiskCalculator from "@/components/RiskCalculator";
import Research from "@/components/Research";
import Pricing from "@/components/Pricing";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main style={{ background: "#000", minHeight: "100vh" }}>
      <Navbar />
      <Hero />
      <Stats />
      <HowItWorks />
      <Providers />
      <InteractiveGraph />
      <Features />
      <RiskCalculator />
      <Research />
      <Pricing />
      <NewsletterSignup />
      <Footer />
    </main>
  );
}
