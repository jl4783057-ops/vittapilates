-- Videoaulas privadas no Cloudflare R2.
-- A migration é compatível com aulas antigas: todas permanecem como links externos.
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS video_provider TEXT NOT NULL DEFAULT 'external',
  ADD COLUMN IF NOT EXISTS video_storage_key TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lessons_video_provider_check'
      AND conrelid = 'public.lessons'::regclass
  ) THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT lessons_video_provider_check
      CHECK (video_provider IN ('external', 'r2'));
  END IF;
END $$;

ALTER TABLE public.lessons
  DROP CONSTRAINT IF EXISTS lessons_r2_storage_key_check;
ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_r2_storage_key_check
  CHECK (
    (video_provider = 'external' AND video_storage_key IS NULL)
    OR
    (video_provider = 'r2' AND video_storage_key ~ '^lessons/[a-f0-9-]+[.](mp4|webm|mov)$')
  );
