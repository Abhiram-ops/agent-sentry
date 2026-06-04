"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Shield, Menu, X } from "lucide-react";
import GithubIcon from "./GithubIcon";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "How it works", href: "#how-it-works" },
    { label: "Providers",    href: "#providers" },
    { label: "Features",     href: "#features" },
    { label: "Research",     href: "#research" },
    { label: "Pricing",      href: "#pricing" },
    { label: "Docs",         href: "/docs" },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-black/70 backdrop-blur-2xl border-b border-white/[0.05]"
            : "bg-transparent"
        }`}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", paddingLeft: 56, paddingRight: 56 }} className="h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center group-hover:bg-[#00ff88]/15 transition-colors">
              <Shield className="w-4 h-4 text-[#00ff88]" />
            </div>
            <span className="font-semibold text-white tracking-tight">
              Agent<span className="text-[#00ff88]">Sentry</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-[#444] hover:text-white transition-colors duration-150"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="https://github.com/Abhiram-ops/agent-sentry"
              target="_blank"
              className="flex items-center gap-2 text-sm text-[#444] hover:text-white transition-colors"
            >
              <GithubIcon className="w-4 h-4" />
              <span>GitHub</span>
            </Link>
            <Link
              href="#pricing"
              className="px-4 py-2 text-sm font-semibold bg-[#00ff88] text-black rounded-lg hover:bg-[#00cc6a] transition-colors"
            >
              Get started free
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-[#444] hover:text-white transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 left-0 right-0 z-40 bg-black/95 backdrop-blur-2xl border-b border-white/[0.05] p-6 flex flex-col gap-5 md:hidden"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-[#555] hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="#pricing"
              onClick={() => setMenuOpen(false)}
              className="mt-2 px-4 py-3 text-sm font-semibold bg-[#00ff88] text-black rounded-xl text-center"
            >
              Get started free
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
