-- ================================================================
-- VITTA PILATES - MIGRAÇÃO 007: HARDENING COMPLETO DE SEGURANÇA E RLS
-- Executar no SQL Editor do Supabase após as migrações anteriores.
--
-- Objetivos:
-- 1. Eliminar o uso de políticas genéricas 'FOR ALL' em todas as tabelas.
-- 2. Criar políticas granulares individuais para SELECT, INSERT, UPDATE e DELETE.
-- 3. Adicionar políticas explícitas em courtesy_grants e cakto_orders.
-- 4. Adicionar políticas RLS para o schema storage.objects no bucket 'media'.
-- 5. Criar tabela de trilha de auditoria (audit_logs) com RLS ativado.
-- ================================================================

-- 1. POLÍTICAS GRANULARES: CATEGORIAS -----------------------------------
DROP POLICY IF EXISTS "Administradora gerencia categorias" ON public.categories;
DROP POLICY IF EXISTS "Admin insere categorias" ON public.categories;
DROP POLICY IF EXISTS "Admin atualiza categorias" ON public.categories;
DROP POLICY IF EXISTS "Admin exclui categorias" ON public.categories;

CREATE POLICY "Admin insere categorias" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_user_is_admin()));

CREATE POLICY "Admin atualiza categorias" ON public.categories
  FOR UPDATE TO authenticated
  USING ((SELECT public.current_user_is_admin()))
  WITH CHECK ((SELECT public.current_user_is_admin()));

CREATE POLICY "Admin exclui categorias" ON public.categories
  FOR DELETE TO authenticated
  USING ((SELECT public.current_user_is_admin()));

-- 2. POLÍTICAS GRANULARES: SUBCATEGORIAS --------------------------------
DROP POLICY IF EXISTS "Administradora gerencia subcategorias" ON public.subcategories;
DROP POLICY IF EXISTS "Admin insere subcategorias" ON public.subcategories;
DROP POLICY IF EXISTS "Admin atualiza subcategorias" ON public.subcategories;
DROP POLICY IF EXISTS "Admin exclui subcategorias" ON public.subcategories;

CREATE POLICY "Admin insere subcategorias" ON public.subcategories
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_user_is_admin()));

CREATE POLICY "Admin atualiza subcategorias" ON public.subcategories
  FOR UPDATE TO authenticated
  USING ((SELECT public.current_user_is_admin()))
  WITH CHECK ((SELECT public.current_user_is_admin()));

CREATE POLICY "Admin exclui subcategorias" ON public.subcategories
  FOR DELETE TO authenticated
  USING ((SELECT public.current_user_is_admin()));

-- 3. POLÍTICAS GRANULARES: EXERCÍCIOS -----------------------------------
DROP POLICY IF EXISTS "Administradora gerencia exercicios" ON public.exercises;
DROP POLICY IF EXISTS "Admin insere exercicios" ON public.exercises;
DROP POLICY IF EXISTS "Admin atualiza exercicios" ON public.exercises;
DROP POLICY IF EXISTS "Admin exclui exercicios" ON public.exercises;

CREATE POLICY "Admin insere exercicios" ON public.exercises
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_user_is_admin()));

CREATE POLICY "Admin atualiza exercicios" ON public.exercises
  FOR UPDATE TO authenticated
  USING ((SELECT public.current_user_is_admin()))
  WITH CHECK ((SELECT public.current_user_is_admin()));

CREATE POLICY "Admin exclui exercicios" ON public.exercises
  FOR DELETE TO authenticated
  USING ((SELECT public.current_user_is_admin()));

-- 4. POLÍTICAS GRANULARES: AULAS (LESSONS) ------------------------------
DROP POLICY IF EXISTS "Administradora gerencia aulas" ON public.lessons;
DROP POLICY IF EXISTS "Admin insere aulas" ON public.lessons;
DROP POLICY IF EXISTS "Admin atualiza aulas" ON public.lessons;
DROP POLICY IF EXISTS "Admin exclui aulas" ON public.lessons;

CREATE POLICY "Admin insere aulas" ON public.lessons
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_user_is_admin()));

CREATE POLICY "Admin atualiza aulas" ON public.lessons
  FOR UPDATE TO authenticated
  USING ((SELECT public.current_user_is_admin()))
  WITH CHECK ((SELECT public.current_user_is_admin()));

CREATE POLICY "Admin exclui aulas" ON public.lessons
  FOR DELETE TO authenticated
  USING ((SELECT public.current_user_is_admin()));

-- 5. POLÍTICAS GRANULARES: CONFIGURAÇÕES (SITE_SETTINGS) ----------------
DROP POLICY IF EXISTS "Administradora gerencia configurações" ON public.site_settings;
DROP POLICY IF EXISTS "Admin atualiza configurações" ON public.site_settings;
DROP POLICY IF EXISTS "Admin insere configurações" ON public.site_settings;

CREATE POLICY "Admin insere configurações" ON public.site_settings
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_user_is_admin()));

CREATE POLICY "Admin atualiza configurações" ON public.site_settings
  FOR UPDATE TO authenticated
  USING ((SELECT public.current_user_is_admin()))
  WITH CHECK ((SELECT public.current_user_is_admin()));

-- 6. POLÍTICAS GRANULARES: QUIZ_QUESTIONS -------------------------------
DROP POLICY IF EXISTS "Administradora gerencia quiz" ON public.quiz_questions;
DROP POLICY IF EXISTS "Admin insere quiz" ON public.quiz_questions;
DROP POLICY IF EXISTS "Admin atualiza quiz" ON public.quiz_questions;
DROP POLICY IF EXISTS "Admin exclui quiz" ON public.quiz_questions;

CREATE POLICY "Admin insere quiz" ON public.quiz_questions
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_user_is_admin()));

CREATE POLICY "Admin atualiza quiz" ON public.quiz_questions
  FOR UPDATE TO authenticated
  USING ((SELECT public.current_user_is_admin()))
  WITH CHECK ((SELECT public.current_user_is_admin()));

CREATE POLICY "Admin exclui quiz" ON public.quiz_questions
  FOR DELETE TO authenticated
  USING ((SELECT public.current_user_is_admin()));

-- 7. POLÍTICAS EXPLÍCITAS: COURTESY_GRANTS ------------------------------
ALTER TABLE public.courtesy_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin lê cortesias" ON public.courtesy_grants;
DROP POLICY IF EXISTS "Admin cria cortesias" ON public.courtesy_grants;
DROP POLICY IF EXISTS "Admin atualiza cortesias" ON public.courtesy_grants;
DROP POLICY IF EXISTS "Admin remove cortesias" ON public.courtesy_grants;

CREATE POLICY "Admin lê cortesias" ON public.courtesy_grants
  FOR SELECT TO authenticated
  USING ((SELECT public.current_user_is_admin()));

CREATE POLICY "Admin cria cortesias" ON public.courtesy_grants
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_user_is_admin()));

CREATE POLICY "Admin atualiza cortesias" ON public.courtesy_grants
  FOR UPDATE TO authenticated
  USING ((SELECT public.current_user_is_admin()))
  WITH CHECK ((SELECT public.current_user_is_admin()));

CREATE POLICY "Admin remove cortesias" ON public.courtesy_grants
  FOR DELETE TO authenticated
  USING ((SELECT public.current_user_is_admin()));

-- 8. POLÍTICAS EXPLÍCITAS: CAKTO_ORDERS ---------------------------------
ALTER TABLE public.cakto_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin lê pedidos cakto" ON public.cakto_orders;
CREATE POLICY "Admin lê pedidos cakto" ON public.cakto_orders
  FOR SELECT TO authenticated
  USING ((SELECT public.current_user_is_admin()));

-- 9. POLÍTICAS EXPLÍCITAS: STORAGE.OBJECTS (BUCKET 'MEDIA') ------------
-- Garante que alunas e público apenas leiam mídias públicas do bucket 'media',
-- e que uploads/alterações/remoções exijam credencial de administradora autenticada.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    EXECUTE 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;';

    DROP POLICY IF EXISTS "Leitura pública de objetos do bucket media" ON storage.objects;
    DROP POLICY IF EXISTS "Admin faz upload no bucket media" ON storage.objects;
    DROP POLICY IF EXISTS "Admin atualiza objetos no bucket media" ON storage.objects;
    DROP POLICY IF EXISTS "Admin exclui objetos no bucket media" ON storage.objects;

    CREATE POLICY "Leitura pública de objetos do bucket media" ON storage.objects
      FOR SELECT USING (bucket_id = 'media');

    CREATE POLICY "Admin faz upload no bucket media" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'media' AND (SELECT public.current_user_is_admin()));

    CREATE POLICY "Admin atualiza objetos no bucket media" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'media' AND (SELECT public.current_user_is_admin()))
      WITH CHECK (bucket_id = 'media' AND (SELECT public.current_user_is_admin()));

    CREATE POLICY "Admin exclui objetos no bucket media" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'media' AND (SELECT public.current_user_is_admin()));
  END IF;
END $$;

-- 10. TABELA DE AUDITORIA DE SEGURANÇA (AUDIT_LOGS) ---------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('admin', 'student', 'system', 'anonymous')),
  actor_id TEXT,
  ip_address TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON public.audit_logs (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (actor_type, actor_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin visualiza logs de auditoria" ON public.audit_logs;
CREATE POLICY "Admin visualiza logs de auditoria" ON public.audit_logs
  FOR SELECT TO authenticated
  USING ((SELECT public.current_user_is_admin()));

REVOKE ALL ON public.audit_logs FROM anon, authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT INSERT ON public.audit_logs TO authenticated;
