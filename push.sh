#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "→ Setting up git..."
git init
git config user.email "hello@agentsentry.org"
git config user.name "Abhiram Lanka"
git branch -M main

echo "→ Setting remote..."
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/Abhiram-ops/agent-sentry.git

echo "→ Creating branch..."
git checkout -b feat/web3-ui-redesign 2>/dev/null || git checkout feat/web3-ui-redesign

echo "→ Staging files..."
git add .

echo "→ Committing..."
git commit -m "feat: Web3 UI redesign with full feature migration

- NavbarWeb3: all section links, glass scroll, mobile menu, green CTA
- HeroWeb3: full-page video bg, gradient heading, dual CTAs
- ChatBot: scroll-aware FAB over Gemini watermark, AgentSentry icon
- Migrated: ChatBot, CursorTrail, HowItWorks, Providers,
  InteractiveGraph, RiskCalculator, NewsletterSignup, AttackGraph3D
- Upgraded Stats, Features, Research, Pricing, Footer
- Fixed all TypeScript errors
- Video background spans entire page via layout.tsx"

echo "→ Pushing to GitHub..."
git push -u origin feat/web3-ui-redesign

echo ""
echo "✓ Done! Open https://github.com/Abhiram-ops/agent-sentry"
echo "  GitHub will show a 'Compare & pull request' banner."
