import { createClient } from "@insforge/sdk";
import { auth0 } from "@/lib/auth0";

// Server-side client (uses Auth0 session to get InsForge JWT)
export async function createInsForgeClient() {
  const session = await auth0.getSession();
  const insforgeToken =
    session?.user?.["https://insforge.dev/insforge_token"] as
      | string
      | undefined;

  return createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
    edgeFunctionToken: insforgeToken,
  });
}

// Types shared between server and client
export type ActivityStatus = "sent" | "pending" | "needs-call";
export type QueueGroup = "decisions" | "ready" | "reach-out" | "coming-up";

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  tags: string[];
  created_at: string;
}

export interface ThreadMessage {
  id: string;
  from_party: "client" | "you";
  body: string;
  sent_at: string;
}

export interface AiActivity {
  id: string;
  channel: string;
  status: ActivityStatus;
  summary: string;
  client_message: string | null;
  ai_draft: string | null;
  acted_at: string;
  client: Client | null;
  conversation_id: string | null;
}

export interface QueueItem {
  id: string;
  grp: QueueGroup;
  reason: string;
  due_date: string | null;
  client: Client | null;
  activity_id: string | null;
}

export interface DailyStat {
  stat_date: string;
  handled: number;
  ready_to_send: number;
  active_leads: number;
  response_rate: number;
  avg_reply_mins: number;
}

export interface TodayData {
  activities: AiActivity[];
  queueItems: QueueItem[];
  stats: DailyStat[];        // last 7 days for sparklines
  todayStat: DailyStat | null;
  messages: Record<string, ThreadMessage[]>; // keyed by conversation_id
}

