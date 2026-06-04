import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import Research from "@/components/Research";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main style={{ background: "#000", minHeight: "100vh" }}>
      <Navbar />
      <Hero />
      <Stats />
      <HowItWorks />
      <Features />
      <Research />
      <Pricing />
      <Footer />
    </main>
  );
}
