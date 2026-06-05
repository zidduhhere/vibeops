-- ── WhatsApp Messages (dedup) ─────────────────────────────────────────────────
-- Mirrors email_metadata for Gmail. Prevents reprocessing the same WA message.
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_message_id TEXT NOT NULL UNIQUE,
  user_id       TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  processed_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_messages: owner" ON whatsapp_messages
  USING (user_id = requesting_user_id())
  WITH CHECK (user_id = requesting_user_id());
