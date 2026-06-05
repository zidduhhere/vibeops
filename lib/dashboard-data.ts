/* eslint-disable prefer-const */
import { createInsForgeClient, TodayData } from "@/lib/insforge";

export async function fetchTodayData(): Promise<TodayData> {
  const db = await createInsForgeClient();

  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Fetch in parallel
  const [activitiesRes, queueRes, statsRes] = await Promise.all([
    db.database
      .from("ai_activities")
      .select(
        "id, channel, status, summary, client_message, ai_draft, acted_at, conversation_id, client:clients(id, name, email, phone, bio, tags)",
      )
      .order("acted_at", { ascending: false })
      .limit(20),

    db.database
      .from("queue_items")
      .select(
        "id, grp, reason, due_date, activity_id, client:clients(id, name, email, phone, bio, tags)",
      )
      .eq("resolved", false)
      .order("created_at", { ascending: true }),

    db.database
      .from("daily_stats")
      .select(
        "stat_date, handled, ready_to_send, active_leads, response_rate, avg_reply_mins",
      )
      .gte("stat_date", sevenDaysAgo)
      .order("stat_date", { ascending: true }),
  ]);

  const activities = (activitiesRes.data ?? []) as unknown as TodayData["activities"];
  const queueItems = (queueRes.data ?? []) as unknown as TodayData["queueItems"];
  const stats = (statsRes.data ?? []) as TodayData["stats"];
  const todayStat =
    stats.find((s) => s.stat_date === today) ?? null;

  // Fetch thread messages for all conversations referenced by activities
  const convIds = [
    ...new Set(
      activities.map((a) => a.conversation_id).filter(Boolean) as string[],
    ),
  ];

  let messages: TodayData["messages"] = {};
  if (convIds.length > 0) {
    const { data: msgRows } = await db.database
      .from("messages")
      .select("id, conversation_id, from_party, body, sent_at")
      .in("conversation_id", convIds)
      .order("sent_at", { ascending: true });

    for (const msg of msgRows ?? []) {
      const cid = (msg as { conversation_id: string }).conversation_id;
      if (!messages[cid]) messages[cid] = [];
      messages[cid].push(msg as TodayData["messages"][string][number]);
    }
  }

  return { activities, queueItems, stats, todayStat, messages };
}
