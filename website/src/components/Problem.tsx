export default function Problem() {
  return (
    <section className="problem-sec" id="problem">
      <div className="w">
        <div className="problem-grid">
          <div className="reveal">
            <div className="kicker">The problem</div>
            <h2 className="sec-h">The breach nobody is watching for.</h2>
            <p className="sec-sub">
              Machine identities accumulate quietly. IAM roles are created for one project and
              never deleted. API keys are provisioned with admin scope because someone needed to
              move fast. AI agents are given irreversible tool access with no oversight. Most are
              never reviewed.
            </p>
            <ul className="problem-list">
              <li>No rotation policy. No expiry. No MFA requirement.</li>
              <li>AI agents with write access to production databases and external APIs.</li>
              <li>Every role, key, and agent is a lateral movement opportunity.</li>
              <li>Cloud providers surface these identities in six different consoles that don't talk to each other.</li>
            </ul>
          </div>
          <div className="reveal" style={{ transitionDelay: ".1s", textAlign: "right" }}>
            <div className="problem-stat-big">76%</div>
            <p className="problem-stat-sub">of breaches involve a non-human identity</p>
          </div>
        </div>
      </div>
    </section>
  );
}
