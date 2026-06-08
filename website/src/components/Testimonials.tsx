const TESTIMONIALS = [
  {
    quote: "Ran it on our staging AWS account. Found 3 IAM roles with AdministratorAccess we didn't know existed. Took 4 minutes. One of those roles was attached to a Lambda that processed user data.",
    who: "ML Engineer",
    role: "Series A AI startup",
  },
  {
    quote: "We run it in CI on every PR now. Caught an overprivileged deploy key before it hit prod. Twice in the same month. The --json flag made integration easy.",
    who: "DevSecOps Lead",
    role: "Fintech team, 40 engineers",
  },
  {
    quote: "Didn't expect the local scan to find anything. It found 4 .env files with production secrets in my home directory. Two of them were from projects I'd left six months ago.",
    who: "Backend Engineer",
    role: "Security tools startup",
  },
];

export default function Testimonials() {
  return (
    <section className="sec" id="testimonials" style={{ paddingTop: 0 }}>
      <div className="w">
        <div className="sec-head ctr reveal">
          <div className="kicker">From the field</div>
          <h2 className="sec-h">What people found.</h2>
        </div>
        <div className="testi-grid">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="testi-card reveal" style={{ transitionDelay: `${i * 0.08}s` }}>
              <p className="testi-q">{t.quote}</p>
              <div className="testi-meta">
                <div className="testi-who">
                  {t.who}
                  <span className="role">{t.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
