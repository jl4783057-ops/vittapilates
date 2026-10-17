-- ================================================================
-- VITTA PILATES - MIGRAÇÃO 005: Controle de Publicação em 3 Estados
-- (Disponível, Em atualização, Oculta)
-- ================================================================
--
-- Estados:
-- 1. 'available' (Disponível): visível e aulas acessíveis.
-- 2. 'updating' (Em atualização): visível com banner cinza/esmaecido e aviso; aulas bloqueadas.
-- 3. 'hidden' (Oculta): não aparece para as alunas e inacessível por URL.
--
-- Preservação de dados existentes:
-- Adiciona a coluna 'status' sem default imediato, permitindo que
-- o backfill distinga registros que estavam com published = false para marcá-los como 'hidden'.
-- Registros com published = true tornam-se 'available'.
-- Após o backfill, o default 'available' e a restrição NOT NULL são aplicados de forma segura e idempotente.
-- ================================================================

-- 1. Tabela de Categorias: Adição segura da coluna status
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS status TEXT;

-- Backfill das categorias existentes respeitando published = false -> 'hidden'
UPDATE public.categories
SET status = CASE
  WHEN published = false THEN 'hidden'
  ELSE 'available'
END
WHERE status IS NULL OR status NOT IN ('available', 'updating', 'hidden');

-- Define default e NOT NULL após o preenchimento de todos os registros
ALTER TABLE public.categories
  ALTER COLUMN status SET DEFAULT 'available',
  ALTER COLUMN status SET NOT NULL;

-- Restrição de valores permitidos
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

-- 2. Tabela de Subcategorias: Adição segura da coluna status
ALTER TABLE public.subcategories
  ADD COLUMN IF NOT EXISTS status TEXT;

-- Backfill das subcategorias existentes respeitando published = false -> 'hidden'
UPDATE public.subcategories
SET status = CASE
  WHEN published = false THEN 'hidden'
  ELSE 'available'
END
WHERE status IS NULL OR status NOT IN ('available', 'updating', 'hidden');

-- Define default e NOT NULL após o preenchimento
ALTER TABLE public.subcategories
  ALTER COLUMN status SET DEFAULT 'available',
  ALTER COLUMN status SET NOT NULL;

-- Restrição de valores permitidos
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

-- 3. Atualização das políticas de RLS para leitura pública
DROP POLICY IF EXISTS "Leitura pública de categorias publicadas" ON public.categories;
CREATE POLICY "Leitura pública de categorias publicadas" ON public.categories
  FOR SELECT USING (
    status IN ('available', 'updating')
    OR (status IS NULL AND published = true)
    OR (SELECT public.current_user_is_admin())
  );

DROP POLICY IF EXISTS "Leitura pública de subcategorias publicadas" ON public.subcategories;
CREATE POLICY "Leitura pública de subcategorias publicadas" ON public.subcategories
  FOR SELECT USING (
    status IN ('available', 'updating')
    OR (status IS NULL AND published = true)
    OR (SELECT public.current_user_is_admin())
  );
