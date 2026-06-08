import Navbar       from "@/components/Navbar";
import Hero         from "@/components/Hero";
import Stats        from "@/components/Stats";
import Problem      from "@/components/Problem";
import HowItWorks   from "@/components/HowItWorks";
import Providers    from "@/components/Providers";
import Pricing      from "@/components/Pricing";
import Testimonials from "@/components/Testimonials";
import Research     from "@/components/Research";
import Footer       from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main style={{ position: "relative", zIndex: 1 }}>
        <Hero />
        <Stats />
        <Problem />
        <HowItWorks />
        <Providers />
        <Pricing />
        <Testimonials />
        <Research />
      </main>
      <Footer />
    </>
  );
}
