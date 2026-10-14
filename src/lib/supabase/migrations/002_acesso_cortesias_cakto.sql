-- ================================================================
-- VITTA PILATES - MIGRAÇÃO 002: acesso, cortesias, Cakto e mídia
-- Rode no SQL Editor do Supabase DEPOIS de schema.sql.
-- ================================================================

-- 1. Tipo de acesso no perfil -----------------------------------------
ALTER TABLE public.profiles
  ALTER COLUMN subscription_status SET DEFAULT 'inactive';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_type TEXT NOT NULL DEFAULT 'none'
    CHECK (access_type IN ('none', 'subscriber', 'courtesy')),
  ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMPTZ;

-- Cria o perfil automaticamente quando o Supabase Auth cria a usuária
-- (convite de cortesia ou compra aprovada na Cakto).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, subscription_status, access_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    lower(NEW.email),
    'inactive',
    'none'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Cortesias para influenciadoras -----------------------------------
CREATE TABLE IF NOT EXISTS public.courtesy_grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  duration_days INT NOT NULL CHECK (duration_days > 0),
  status TEXT NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'active', 'expired', 'revoked', 'converted')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  invite_sent_at TIMESTAMPTZ,
  created_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS courtesy_grants_email_idx ON public.courtesy_grants (lower(email));
CREATE INDEX IF NOT EXISTS courtesy_grants_status_idx ON public.courtesy_grants (status, expires_at);

-- Apenas o servidor (service role) lê/escreve. Sem políticas = sem acesso via anon key.
ALTER TABLE public.courtesy_grants ENABLE ROW LEVEL SECURITY;

-- 3. Pedidos recebidos pelo webhook da Cakto (idempotência + auditoria) --
CREATE TABLE IF NOT EXISTS public.cakto_orders (
  id TEXT PRIMARY KEY,                -- data.id enviado pela Cakto
  event TEXT NOT NULL,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cakto_orders ENABLE ROW LEVEL SECURITY;

-- 4. Configurações: linha única garantida ------------------------------
INSERT INTO public.site_settings (
  id, platform_name, logo_text, whatsapp_community_url, whatsapp_community_title,
  whatsapp_community_subtitle, whatsapp_community_button_text,
  library_hero_title, library_hero_subtitle
) VALUES (
  1, 'Vitta Pilates', 'Vitta Pilates', 'https://chat.whatsapp.com/', 'Comunidade Vitta',
  'Troque experiências com outras alunas.', 'Entrar no grupo',
  'Biblioteca de aulas', 'Pilates no seu ritmo.'
) ON CONFLICT (id) DO NOTHING;

-- 5. Storage público para imagens do site (logo, banners, capas) --------
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;
-- Uploads são feitos apenas pelo servidor (service role) após validar a sessão;
-- a leitura é pública pela URL gerada pelo Storage.

-- 6. Subcategorias com imagem e ícone ----------------------------------
ALTER TABLE public.subcategories
  ADD COLUMN IF NOT EXISTS image_url TEXT;
