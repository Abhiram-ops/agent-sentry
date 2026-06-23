export function JsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "AgentSentry",
    applicationCategory: "SecurityApplication",
    applicationSubCategory: "Cloud Security / Non-Human Identity Auditor",
    operatingSystem: "Windows, macOS, Linux",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Open-source CLI tool that discovers every Non-Human Identity (NHI) and AI agent across AWS, Azure, GCP, GitHub, and Kubernetes, builds an attack graph, and scores blast radius using the P×R×E×A model. Reduces cloud security alert fatigue by over 90%.",
    softwareVersion: "0.2.0",
    url: "https://agentsentry.org",
    downloadUrl: "https://pypi.org/project/nhi-audit/",
    codeRepository: "https://github.com/Abhiram-ops/agent-sentry",
    license: "https://www.gnu.org/licenses/agpl-3.0.html",
    author: {
      "@type": "Person",
      name: "Abhiram Lanka",
    },
    keywords:
      "non-human identity, NHI security, AI agent security, cloud IAM audit, attack graph, least privilege, AWS IAM, Kubernetes secrets",
    featureList: [
      "Multi-cloud NHI discovery (AWS, Azure, GCP, GitHub, Kubernetes)",
      "P×R×E×A blast-radius scoring model",
      "AI-Amplification Factor for autonomous agent risk",
      "Interactive attack graph visualization",
      "Continuous scan history and drift detection",
      "Data-driven least-privilege via IAM Access Analyzer",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
