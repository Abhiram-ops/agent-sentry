"use client";

import { Code2, Mail, MessageSquare } from "lucide-react";

const contacts = [
  {
    icon: MessageSquare,
    label: "X / Twitter",
    handle: "@AgentSentryApp",
    href: "https://x.com/AgentSentryApp",
    description: "DM for quick questions or feedback",
  },
  {
    icon: Code2,
    label: "GitHub Issues",
    handle: "Abhiram-ops/agent-sentry",
    href: "https://github.com/Abhiram-ops/agent-sentry/issues",
    description: "Bug reports & feature requests",
  },
  {
    icon: Mail,
    label: "Email",
    handle: "agentsentry.tool@gmail.com",
    href: "mailto:agentsentry.tool@gmail.com",
    description: "Partnerships, enterprise, or anything else",
  },
];

export default function Contact() {
  return (
    <section id="contact" className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4 text-white">
          Get in Touch
        </h2>
        <p className="text-center text-gray-400 mb-12">
          Choose the channel that works best for you.
        </p>
        <div className="grid gap-6 sm:grid-cols-3">
          {contacts.map(({ icon: Icon, label, handle, href, description }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-6 text-center transition hover:border-red-500/50 hover:bg-white/10"
            >
              <Icon className="h-8 w-8 text-red-500" />
              <span className="font-semibold text-white">{label}</span>
              <span className="text-sm text-gray-400">{handle}</span>
              <span className="text-xs text-gray-500">{description}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
