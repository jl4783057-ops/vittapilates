-- ================================================================
-- PILATES EM CASA - ESQUEMA DE BANCO DE DADOS POSTGRESQL & SUPABASE
-- ================================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE PERFIS DE USUÁRIAS (Vinculada ao auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'aluna' CHECK (role IN ('aluna', 'admin')),
  avatar_url TEXT,
  phone TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'trial', 'canceled')),
  subscription_plan TEXT NOT NULL DEFAULT 'Mensal' CHECK (subscription_plan IN ('Mensal', 'Trimestral', 'Anual')),
  subscription_renewal_date TIMESTAMPTZ,
  completed_lesson_ids TEXT[] DEFAULT '{}',
  last_lesson_id TEXT,
  custom_plan JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. TABELA DE CATEGORIAS
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'updating', 'hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TABELA DE SUBCATEGORIAS
CREATE TABLE IF NOT EXISTS public.subcategories (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'updating', 'hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(category_id, slug)
);

-- 4. TABELA DE AULAS
CREATE TABLE IF NOT EXISTS public.lessons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  subcategory_id TEXT NOT NULL REFERENCES public.subcategories(id) ON DELETE RESTRICT,
  duration_minutes INT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('iniciante', 'intermediário', 'avançado')),
  format TEXT NOT NULL CHECK (format IN ('aula rápida', 'aula completa', 'sequência guiada', 'programa por dias')),
  equipment TEXT NOT NULL CHECK (equipment IN ('sem equipamento', 'com acessórios')),
  materials TEXT DEFAULT 'Tapete de Pilates (Mat)',
  thumbnail_url TEXT NOT NULL,
  video_url TEXT NOT NULL,
  video_provider TEXT NOT NULL DEFAULT 'external' CHECK (video_provider IN ('external', 'r2')),
  video_storage_key TEXT,
  display_order INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'publicado' CHECK (status IN ('rascunho', 'publicado')),
  tags TEXT[] DEFAULT '{}',
  views_count INT NOT NULL DEFAULT 0,
  completions_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TABELA DE CONFIGURAÇÕES DA PLATAFORMA
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  platform_name TEXT NOT NULL DEFAULT 'Pilates em Casa',
  logo_text TEXT NOT NULL DEFAULT 'Pilates em Casa',
  logo_url TEXT,
  login_title TEXT NOT NULL DEFAULT 'Bem-vinda de volta!',
  login_subtitle TEXT NOT NULL DEFAULT 'Faça login para acessar seus treinos.',
  login_banner_url TEXT,
  whatsapp_community_url TEXT NOT NULL,
  whatsapp_community_title TEXT NOT NULL,
  whatsapp_community_subtitle TEXT NOT NULL,
  whatsapp_community_button_text TEXT NOT NULL,
  library_hero_title TEXT NOT NULL,
  library_hero_subtitle TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. TABELA DE PERGUNTAS DO QUIZ
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id TEXT PRIMARY KEY,
  display_order INT NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  helper_text TEXT,
  type TEXT NOT NULL CHECK (type IN ('text', 'date', 'single', 'multiple', 'frequency', 'duration')),
  required BOOLEAN NOT NULL DEFAULT true,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  privacy_notice TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TABELA DE RESPOSTAS E PLANOS GERADOS DO QUIZ
CREATE TABLE IF NOT EXISTS public.quiz_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  answers JSONB NOT NULL,
  generated_plan JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ================================================================
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

-- Helper seguro para evitar que as políticas consultem profiles recursivamente.
-- A função lê somente o papel da usuária autenticada e não pode ser alterada pelo app.
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

-- Regras de perfis:
-- Aluna vê seu próprio perfil; Administradora vê todos os perfis.
CREATE POLICY "Usuária visualiza seu próprio perfil" ON public.profiles
  FOR SELECT USING ((SELECT auth.uid()) = id OR (SELECT public.current_user_is_admin()));

CREATE POLICY "Usuária atualiza seu próprio perfil" ON public.profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- O navegador não pode se promover a admin, liberar a própria assinatura,
-- ou alterar campos que só o servidor e o webhook devem controlar.
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (name, avatar_url, phone, completed_lesson_ids, last_lesson_id, custom_plan, updated_at)
  ON public.profiles TO authenticated;

-- Regras de categorias e subcategorias:
-- Todo mundo pode ler categorias em available ou updating; Admin pode gerenciar tudo.
CREATE POLICY "Leitura pública de categorias publicadas" ON public.categories
  FOR SELECT USING (
    status IN ('available', 'updating')
    OR (status IS NULL AND published = true)
    OR (SELECT public.current_user_is_admin())
  );

CREATE POLICY "Administradora gerencia categorias" ON public.categories
  FOR ALL USING ((SELECT public.current_user_is_admin()))
  WITH CHECK ((SELECT public.current_user_is_admin()));

CREATE POLICY "Leitura pública de subcategorias publicadas" ON public.subcategories
  FOR SELECT USING (
    status IN ('available', 'updating')
    OR (status IS NULL AND published = true)
    OR (SELECT public.current_user_is_admin())
  );

CREATE POLICY "Administradora gerencia subcategorias" ON public.subcategories
  FOR ALL USING ((SELECT public.current_user_is_admin()))
  WITH CHECK ((SELECT public.current_user_is_admin()));

-- Regras de aulas:
-- Alunas com acesso válido (assinante ativa/trial ou cortesia no prazo) podem ler aulas publicadas.
-- Administradoras podem visualizar e gerenciar tudo. Sem acesso para anon.
CREATE POLICY "Alunas com acesso ativo visualizam aulas publicadas" ON public.lessons
  FOR SELECT TO authenticated USING (
    (status = 'publicado' AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND (
          (access_type = 'subscriber' AND subscription_status IN ('active', 'trial'))
          OR
          (access_type = 'courtesy' AND access_expires_at IS NOT NULL AND access_expires_at > now())
        )
    ))
    OR (SELECT public.current_user_is_admin())
  );

CREATE POLICY "Administradora gerencia aulas" ON public.lessons
  FOR ALL USING ((SELECT public.current_user_is_admin()))
  WITH CHECK ((SELECT public.current_user_is_admin()));

-- Regras de configurações do site:
-- Leitura pública; Edição apenas admin.
CREATE POLICY "Leitura pública de configurações" ON public.site_settings
  FOR SELECT USING (true);

CREATE POLICY "Administradora gerencia configurações" ON public.site_settings
  FOR ALL USING ((SELECT public.current_user_is_admin()))
  WITH CHECK ((SELECT public.current_user_is_admin()));

-- Regras do Quiz:
-- Leitura de perguntas por qualquer pessoa; Edição apenas admin.
CREATE POLICY "Leitura de perguntas do quiz" ON public.quiz_questions
  FOR SELECT USING (true);

CREATE POLICY "Administradora gerencia quiz" ON public.quiz_questions
  FOR ALL USING ((SELECT public.current_user_is_admin()))
  WITH CHECK ((SELECT public.current_user_is_admin()));

-- Respostas do quiz podem conter dados pessoais. A gravação/leitura é feita
-- pelo servidor depois de validações, nunca anonimamente pelo navegador.
REVOKE ALL ON public.quiz_submissions FROM anon, authenticated;

CREATE POLICY "Administradora lê submissões do quiz" ON public.quiz_submissions
  FOR SELECT USING ((SELECT public.current_user_is_admin()));
