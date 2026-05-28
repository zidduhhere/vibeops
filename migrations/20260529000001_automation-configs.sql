-- automation_configs: per-user config for each automation
CREATE TABLE IF NOT EXISTS public.automation_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  automation_key text NOT NULL,
  mode text NOT NULL DEFAULT 'supervised' CHECK (mode IN ('agentic', 'supervised')),
  trigger_params jsonb DEFAULT '{}',
  ai_prompt text DEFAULT '',
  tone text NOT NULL DEFAULT 'professional' CHECK (tone IN ('professional', 'casual', 'friendly')),
  gmail_filter text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, automation_key)
);

ALTER TABLE public.automation_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own automation configs"
  ON public.automation_configs FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- automation_runs: execution log
CREATE TABLE IF NOT EXISTS public.automation_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  automation_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'held_for_review', 'failed')),
  trigger_email_id text,
  trigger_email_subject text,
  trigger_email_from text,
  ai_output text,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own automation runs"
  ON public.automation_runs FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- gmail_watches: track active Gmail push subscriptions per user
CREATE TABLE IF NOT EXISTS public.gmail_watches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  history_id text,
  expiration timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.gmail_watches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own gmail watches"
  ON public.gmail_watches FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
