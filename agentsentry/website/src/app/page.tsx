import Navbar       from "@/components/Navbar";
import Hero         from "@/components/Hero";
import Problem      from "@/components/Problem";
import HowItWorks   from "@/components/HowItWorks";
import Providers    from "@/components/Providers";
import Stats        from "@/components/Stats";
import Research     from "@/components/Research";
import Testimonials from "@/components/Testimonials";
import Pricing      from "@/components/Pricing";
import Footer       from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main style={{ position: "relative", zIndex: 1 }}>
        {/* 1. Introduction */}
        <Hero />
        {/* 2. Problem Statement */}
        <Problem />
        {/* 3. Solution */}
        <HowItWorks />
        <Providers />
        {/* 4. Demonstration */}
        <Stats />
        <Research />
        {/* 5. Social Proof */}
        <Testimonials />
        {/* 6. CTA */}
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
