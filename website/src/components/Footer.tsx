const GH_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5z"/>
  </svg>
);
const X_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 4l7.07 9.01L4.14 20H5.8l6.04-6.83L17.2 20H20l-7.41-9.44L19.52 4h-1.66l-5.7 6.44L7.2 4H4z"/>
  </svg>
);
const LI_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);

export default function Footer() {
  return (
    <footer>
      <div className="w">
        <div className="foot-grid">
          <div className="foot-brand">
            <div className="logo">
              <span className="mark" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </span>
              Agent<span className="ac">Sentry</span>
            </div>
            <p>Finds every IAM role, API key, SSH key, and AI agent in your cloud. Then scores each one's blast radius.</p>
            <div className="foot-socials">
              <a className="foot-soc" href="https://github.com/Abhiram-ops/agent-sentry" target="_blank" rel="noopener" aria-label="GitHub">{GH_ICON}</a>
              <a className="foot-soc" href="https://x.com/AgentSentryApp" target="_blank" rel="noopener" aria-label="X / Twitter">{X_ICON}</a>
              <a className="foot-soc" href="#" aria-label="LinkedIn">{LI_ICON}</a>
            </div>
          </div>

          <div className="foot-col">
            <h4>Product</h4>
            <ul>
              <li><a href="#how-it-works">How it works</a></li>
              <li><a href="#providers">Providers</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="/changelog">Changelog</a></li>
            </ul>
          </div>

          <div className="foot-col">
            <h4>Resources</h4>
            <ul>
              <li><a href="https://github.com/Abhiram-ops/agent-sentry" target="_blank" rel="noopener">GitHub</a></li>
              <li><a href="https://pypi.org/project/agentsentry/" target="_blank" rel="noopener">PyPI</a></li>
              <li><a href="#">Docs</a></li>
              <li><a href="#research">Research paper</a></li>
            </ul>
          </div>

          <div className="foot-col">
            <h4>Legal</h4>
            <ul>
              <li><a href="https://github.com/Abhiram-ops/agent-sentry/blob/main/LICENSE" target="_blank" rel="noopener">AGPL-3.0 License</a></li>
              <li><a href="#">Privacy</a></li>
              <li><a href="mailto:hello@agentsentry.org">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="foot-bottom">
          <span className="mono">© 2026 AgentSentry &nbsp;·&nbsp; Built by Abhiram Lanka</span>
          <span className="mono">AGPL-3.0 License</span>
        </div>
      </div>
    </footer>
  );
}
