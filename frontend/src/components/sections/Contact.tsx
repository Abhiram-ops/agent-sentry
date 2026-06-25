"use client";

import { Code2, Mail, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

const contacts = [
  {
    icon: MessageSquare,
    platform: "X / Twitter",
    handle: "@AgentSentryApp",
    href: "https://x.com/AgentSentryApp",
    description: "DM for quick questions or feedback",
  },
  {
    icon: Code2,
    platform: "GitHub Issues",
    handle: "Abhiram-ops/agent-sentry",
    href: "https://github.com/Abhiram-ops/agent-sentry/issues",
    description: "Bug reports & feature requests",
  },
  {
    icon: Mail,
    platform: "Email",
    handle: "support@agentsentry.org",
    href: "mailto:support@agentsentry.org",
    description: "Partnerships, enterprise, or anything else",
  },
];

export default function Contact() {
  return (
    <section id="contact" className="section section-alt">
      <div className="container">
        <motion.div className="section-header centered"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}>
          <div className="section-label" style={{ justifyContent: "center" }}>Contact</div>
          <h2>Get in touch</h2>
          <p>Choose the channel that works best for you.</p>
        </motion.div>
        <div className="contact-grid">
          {contacts.map(({ icon: Icon, platform, handle, href, description }, i) => (
            <motion.a key={platform} href={href} target="_blank" rel="noopener noreferrer" className="contact-card"
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.45, delay: i * 0.1 }}>
              <div className="contact-platform">{platform}</div>
              <Icon style={{ width: 22, height: 22, color: "var(--accent)", marginBottom: 12 }} />
              <h3>{handle}</h3>
              <p>{description}</p>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
