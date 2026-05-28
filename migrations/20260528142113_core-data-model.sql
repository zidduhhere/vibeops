-- ── Clients ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  bio         TEXT,
  tags        TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients: owner" ON clients
  USING (user_id = requesting_user_id())
  WITH CHECK (user_id = requesting_user_id());

-- ── Conversations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  channel     TEXT NOT NULL,
  subject     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations: owner" ON conversations
  USING (user_id = requesting_user_id())
  WITH CHECK (user_id = requesting_user_id());

-- ── Messages ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  from_party       TEXT NOT NULL,
  body             TEXT NOT NULL,
  sent_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages: owner" ON messages
  USING (user_id = requesting_user_id())
  WITH CHECK (user_id = requesting_user_id());

-- ── AI Activities ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_activities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  conversation_id  UUID REFERENCES conversations(id) ON DELETE SET NULL,
  client_id        UUID REFERENCES clients(id) ON DELETE SET NULL,
  channel          TEXT NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('sent', 'pending', 'needs-call')),
  summary          TEXT NOT NULL,
  client_message   TEXT,
  ai_draft         TEXT,
  acted_at         TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_activities: owner" ON ai_activities
  USING (user_id = requesting_user_id())
  WITH CHECK (user_id = requesting_user_id());

-- ── Queue Items ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS queue_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE,
  activity_id  UUID REFERENCES ai_activities(id) ON DELETE SET NULL,
  grp          TEXT NOT NULL CHECK (grp IN ('decisions', 'ready', 'reach-out', 'coming-up')),
  reason       TEXT NOT NULL,
  due_date     DATE,
  resolved     BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE queue_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "queue_items: owner" ON queue_items
  USING (user_id = requesting_user_id())
  WITH CHECK (user_id = requesting_user_id());

-- ── Daily Stats ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_stats (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  stat_date        DATE NOT NULL,
  handled          INT DEFAULT 0,
  ready_to_send    INT DEFAULT 0,
  active_leads     INT DEFAULT 0,
  response_rate    NUMERIC(5,2) DEFAULT 0,
  avg_reply_mins   INT DEFAULT 0,
  UNIQUE (user_id, stat_date)
);

ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_stats: owner" ON daily_stats
  USING (user_id = requesting_user_id())
  WITH CHECK (user_id = requesting_user_id());
