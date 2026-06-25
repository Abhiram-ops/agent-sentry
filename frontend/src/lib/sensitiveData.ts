/**
 * Sensitive-data detection shared by the /contribute client (live warnings +
 * one-click redaction) and the /api/contribute server (a last-line safety net
 * that rejects submissions still carrying obvious live secrets).
 *
 * Design goal: catch high-confidence secrets and personal identifiers with as
 * few false positives as practical. Patterns deliberately favour precision —
 * we would rather miss a low-signal match than nag the user about every
 * 12-digit number on screen.
 */

export type Severity = "critical" | "warning" | "info";

export interface SensitivePattern {
  id: string;
  label: string;
  severity: Severity;
  /** Global, multiline regex. MUST use the `g` flag for findMatches() to work. */
  regex: RegExp;
  /** Short, human explanation shown next to the warning. */
  hint: string;
}

export interface SensitiveMatch {
  id: string;
  label: string;
  severity: Severity;
  hint: string;
  value: string;
  index: number;
}

/**
 * Ordered roughly by severity. `critical` = a live credential that grants
 * access if leaked. `warning` = an identifier that is sensitive but not
 * directly exploitable. `info` = worth a glance but usually fine to share.
 */
export const SENSITIVE_PATTERNS: SensitivePattern[] = [
  {
    id: "private-key-block",
    label: "Private key block",
    severity: "critical",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |PGP |DSA )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |OPENSSH |PGP |DSA )?PRIVATE KEY-----/g,
    hint: "A full private key. Never share this — it grants direct access.",
  },
  {
    id: "aws-access-key",
    label: "AWS access key ID",
    severity: "critical",
    regex: /\b(?:AKIA|ASIA|AROA|AIDA|AGPA|ANPA|ANVA|AIPA)[0-9A-Z]{16}\b/g,
    hint: "An AWS access key ID. Pair with a secret key, it grants account access.",
  },
  {
    id: "aws-secret-key",
    label: "AWS secret access key",
    severity: "critical",
    regex: /\b(?:aws_secret_access_key|secret[_-]?access[_-]?key)\b['"\s:=]+([A-Za-z0-9/+=]{40})\b/gi,
    hint: "An AWS secret access key. This is the half attackers actually need.",
  },
  {
    id: "github-token",
    label: "GitHub token",
    severity: "critical",
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[0-9A-Za-z]{36}\b|\bgithub_pat_[0-9A-Za-z_]{22,}\b/g,
    hint: "A GitHub personal access / app token.",
  },
  {
    id: "google-api-key",
    label: "Google API key",
    severity: "critical",
    regex: /\bAIza[0-9A-Za-z\-_]{35}\b/g,
    hint: "A Google / GCP API key.",
  },
  {
    id: "slack-token",
    label: "Slack token",
    severity: "critical",
    regex: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g,
    hint: "A Slack API token.",
  },
  {
    id: "stripe-key",
    label: "Stripe secret key",
    severity: "critical",
    regex: /\b(?:sk|rk)_(?:live|test)_[0-9A-Za-z]{20,}\b/g,
    hint: "A Stripe secret/restricted key.",
  },
  {
    id: "jwt",
    label: "JWT / bearer token",
    severity: "critical",
    regex: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
    hint: "A JSON Web Token — often a live session or service credential.",
  },
  {
    id: "generic-secret-assignment",
    label: "Secret assignment",
    severity: "warning",
    regex: /\b(?:password|passwd|secret|token|api[_-]?key|client[_-]?secret)\b['"\s:=]+['"]?([^\s'"]{8,})['"]?/gi,
    hint: "Looks like a secret being assigned a value. Double-check it isn't live.",
  },
  {
    id: "aws-arn",
    label: "AWS ARN (account ID)",
    severity: "warning",
    regex: /\barn:aws[a-z-]*:[a-z0-9-]*:[a-z0-9-]*:\d{12}:[^\s'"]+/g,
    hint: "An ARN embeds your 12-digit AWS account ID.",
  },
  {
    id: "aws-account-id",
    label: "AWS account ID",
    severity: "info",
    regex: /\b\d{12}\b/g,
    hint: "A 12-digit number — could be an AWS account ID.",
  },
  {
    id: "email",
    label: "Email address",
    severity: "info",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    hint: "An email address — personal data.",
  },
  {
    id: "ipv4",
    label: "IP address",
    severity: "info",
    regex: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
    hint: "An IPv4 address.",
  },
];

/** Returns every sensitive match found in `text`, de-duplicated by value+id. */
export function findMatches(text: string): SensitiveMatch[] {
  if (!text) return [];
  const seen = new Set<string>();
  const out: SensitiveMatch[] = [];

  for (const pat of SENSITIVE_PATTERNS) {
    pat.regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pat.regex.exec(text)) !== null) {
      const value = m[0];
      const key = `${pat.id}:${value}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({
          id: pat.id,
          label: pat.label,
          severity: pat.severity,
          hint: pat.hint,
          value,
          index: m.index,
        });
      }
      // Guard against zero-length matches causing an infinite loop.
      if (m.index === pat.regex.lastIndex) pat.regex.lastIndex++;
    }
  }
  return out.sort((a, b) => a.index - b.index);
}

/** Replaces every sensitive match in `text` with a [REDACTED:<label>] marker. */
export function redactText(text: string): string {
  let out = text;
  for (const pat of SENSITIVE_PATTERNS) {
    pat.regex.lastIndex = 0;
    out = out.replace(pat.regex, () => `[REDACTED:${pat.label}]`);
  }
  return out;
}

/** True if `text` still contains any `critical`-severity secret. */
export function hasCriticalSecret(text: string): boolean {
  return findMatches(text).some((m) => m.severity === "critical");
}

export function severityColor(sev: Severity): { bg: string; border: string; text: string } {
  switch (sev) {
    case "critical":
      return { bg: "#fef2f2", border: "#ef4444", text: "#991b1b" };
    case "warning":
      return { bg: "#fffbeb", border: "#f59e0b", text: "#92400e" };
    default:
      return { bg: "#eff6ff", border: "#3b82f6", text: "#1e40af" };
  }
}
