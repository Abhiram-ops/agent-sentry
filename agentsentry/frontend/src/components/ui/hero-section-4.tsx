'use client';
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { InfiniteSlider } from '@/components/ui/infinite-slider';
import { ProgressiveBlur } from '@/components/ui/progressive-blur';
import { Shield, Cloud, Code2, Key, Database, GitBranch, Server, Lock } from 'lucide-react';

// ── Logo-ticker item (icon + label) ──────────────────────
const ToolBadge = ({ icon: Icon, label }: { icon: React.FC<React.SVGProps<SVGSVGElement>>; label: string }) => (
  <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] text-[#666] text-sm font-medium select-none whitespace-nowrap">
    <Icon className="w-4 h-4 opacity-60" />
    {label}
  </div>
);

const TOOLS = [
  { icon: Cloud,     label: 'AWS'         },
  { icon: Cloud,     label: 'Azure'       },
  { icon: Cloud,     label: 'GCP'         },
  { icon: GitBranch, label: 'GitHub'      },
  { icon: Code2,     label: 'Terraform'   },
  { icon: Server,    label: 'Kubernetes'  },
  { icon: Key,       label: 'HashiCorp Vault' },
  { icon: Database,  label: 'Snowflake'   },
  { icon: Lock,      label: 'Okta'        },
  { icon: Shield,    label: 'Datadog'     },
];

// ── Stat chip ─────────────────────────────────────────────
const Stat = ({ value, label }: { value: string; label: string }) => (
  <div className="flex flex-col items-center px-6 py-3 rounded-xl border border-[rgba(0,255,136,0.12)] bg-[rgba(0,255,136,0.04)]">
    <span className="text-2xl font-bold text-[#00ff88]">{value}</span>
    <span className="text-xs text-[#888] mt-0.5 whitespace-nowrap">{label}</span>
  </div>
);

// ── Hero section ──────────────────────────────────────────
export function HeroSection4() {
  return (
    <section className="relative w-full">
      {/* Content */}
      <div className="relative mx-auto max-w-5xl px-6 py-24 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.06)] text-[#00ff88] text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
          Open-source · Free audit
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08] max-w-3xl">
          Every Machine Identity,{' '}
          <span style={{ background: 'linear-gradient(135deg,#ffffff 20%,#00ff88 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Secured.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="mt-6 max-w-xl text-[#888] text-lg leading-relaxed">
          45 machine identities for every human in your cloud. Almost none governed.
          AgentSentry finds them all, scores blast radius, and tells you what to fix first.
        </p>

        {/* CTA */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="px-7">
            <Link href="/claim"><span>Run Free Audit</span></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="px-7">
            <Link href="/docs"><span>View Docs</span></Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Stat value="45:1" label="Machine : Human identities" />
          <Stat value="< 5%" label="Governed NHIs in avg cloud" />
          <Stat value="0-day" label="Time to first audit result" />
        </div>
      </div>

      {/* Logo ticker */}
      <div className="relative border-t border-[rgba(255,255,255,0.05)] py-8">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-xs text-[#444] uppercase tracking-widest mb-5">
            Scans identities across
          </p>
          <div className="relative">
            <InfiniteSlider gap={12} duration={30}>
              {TOOLS.map((t, i) => <ToolBadge key={i} icon={t.icon} label={t.label} />)}
            </InfiniteSlider>
            <ProgressiveBlur className="absolute inset-y-0 left-0 w-16" direction="left"  blurIntensity={0.6} />
            <ProgressiveBlur className="absolute inset-y-0 right-0 w-16" direction="right" blurIntensity={0.6} />
          </div>
        </div>
      </div>
    </section>
  );
}

// Alias for backwards-compat with the system prompt name
export { HeroSection4 as HeroSection };
