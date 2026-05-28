// Determines which enabled automations match an incoming email

export interface IncomingEmail {
  id: string;
  subject: string;
  from: string;
  body: string;
  snippet: string;
}

export interface EnabledAutomation {
  automation_key: string;
  gmail_filter: string;
  trigger_params: Record<string, unknown>;
}

const PRICING_KEYWORDS = ["pricing", "price", "cost", "budget", "quote", "how much", "rates"];
const SCOPE_KEYWORDS = ["also", "additionally", "while you're at it", "can you also", "one more thing", "add", "extra"];

function emailMatchesFilter(email: IncomingEmail, gmailFilter: string): boolean {
  if (!gmailFilter) return true;
  const text = `${email.subject} ${email.from} ${email.body}`.toLowerCase();
  // Support simple from: filter
  if (gmailFilter.startsWith("from:")) {
    const domain = gmailFilter.replace("from:", "").trim();
    return email.from.includes(domain);
  }
  // Support label: filter — can't check labels here without extra API call, skip match
  if (gmailFilter.startsWith("label:")) return true;
  // Plain keyword
  return text.includes(gmailFilter.toLowerCase());
}

function emailText(email: IncomingEmail): string {
  return `${email.subject} ${email.body}`.toLowerCase();
}

export function matchAutomations(
  email: IncomingEmail,
  automations: EnabledAutomation[]
): EnabledAutomation[] {
  return automations.filter(a => {
    if (!emailMatchesFilter(email, a.gmail_filter)) return false;

    switch (a.automation_key) {
      case "auto_draft_pricing": {
        const keywords = (a.trigger_params.keywords as string[] | undefined) ?? PRICING_KEYWORDS;
        return keywords.some(k => emailText(email).includes(k.toLowerCase()));
      }
      case "scope_creep_detector": {
        return SCOPE_KEYWORDS.some(k => emailText(email).includes(k.toLowerCase()));
      }
      case "lead_qualification": {
        // Fires on any new email from an unknown sender
        return true;
      }
      case "proposal_followup":
      case "weekly_status":
      case "invoice_reminder":
        // Time-based automations — not triggered by incoming email
        return false;
      default:
        return false;
    }
  });
}
