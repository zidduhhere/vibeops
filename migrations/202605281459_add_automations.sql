CREATE TABLE IF NOT EXISTS public.user_automations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  automation_key text NOT NULL,
  enabled boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, automation_key)
);

ALTER TABLE public.user_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own automations"
  ON public.user_automations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
