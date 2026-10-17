-- ================================================================
-- VITTA PILATES - MIGRAÇÃO 005: Controle de Publicação em 3 Estados
-- (Disponível, Em atualização, Oculta)
-- ================================================================
--
-- Estados:
-- 1. 'available' (Disponível): aparece normalmente para as alunas, aulas acessíveis.
-- 2. 'updating' (Em atualização): visível no site com banner esmaecido/cinza e aviso;
--    aulas e subcategorias vinculadas bloqueadas para acesso.
-- 3. 'hidden' (Oculta): completamente invisível na área das alunas e inacessível por URL.
--
-- Retrocompatibilidade:
-- O campo booleano 'published' é mantido e sincronizado:
-- published = (status != 'hidden'). Dessa forma, 'available' e 'updating'
-- têm published = true, enquanto 'hidden' tem published = false.
-- ================================================================

-- 1. Tabela de Categorias: adiciona coluna status
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'available';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'categories_status_check'
      AND conrelid = 'public.categories'::regclass
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_status_check
      CHECK (status IN ('available', 'updating', 'hidden'));
  END IF;
END $$;

-- 2. Tabela de Subcategorias: adiciona coluna status
ALTER TABLE public.subcategories
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'available';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subcategories_status_check'
      AND conrelid = 'public.subcategories'::regclass
  ) THEN
    ALTER TABLE public.subcategories
      ADD CONSTRAINT subcategories_status_check
      CHECK (status IN ('available', 'updating', 'hidden'));
  END IF;
END $$;

-- 3. Migração segura e compatível dos dados existentes:
-- Se o item estava despublicado (published = false), migra para 'hidden'.
-- Se estava publicado (published = true), mantém 'available'.
UPDATE public.categories
SET status = CASE WHEN published = false THEN 'hidden' ELSE 'available' END
WHERE status IS NULL OR status NOT IN ('available', 'updating', 'hidden');

UPDATE public.subcategories
SET status = CASE WHEN published = false THEN 'hidden' ELSE 'available' END
WHERE status IS NULL OR status NOT IN ('available', 'updating', 'hidden');

-- 4. Atualização das políticas de RLS para leitura pública
-- Permite leitura de categorias em 'available' e 'updating' por qualquer pessoa/aluna.
-- Categorias 'hidden' só podem ser lidas por administradoras.
DROP POLICY IF EXISTS "Leitura pública de categorias publicadas" ON public.categories;
CREATE POLICY "Leitura pública de categorias publicadas" ON public.categories
  FOR SELECT USING (
    status IN ('available', 'updating')
    OR (status IS NULL AND published = true)
    OR (SELECT public.current_user_is_admin())
  );

-- Permite leitura de subcategorias em 'available' e 'updating'.
-- Subcategorias 'hidden' só podem ser lidas por administradoras.
DROP POLICY IF EXISTS "Leitura pública de subcategorias publicadas" ON public.subcategories;
CREATE POLICY "Leitura pública de subcategorias publicadas" ON public.subcategories
  FOR SELECT USING (
    status IN ('available', 'updating')
    OR (status IS NULL AND published = true)
    OR (SELECT public.current_user_is_admin())
  );
