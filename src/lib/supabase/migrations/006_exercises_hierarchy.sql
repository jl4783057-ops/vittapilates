-- ================================================================
-- VITTA PILATES - MIGRAÇÃO 006: Hierarquia de Exercícios
-- (Categoria → Subcategoria → Exercícios → Aulas)
-- ================================================================
--
-- Esta migração introduz a entidade 'exercises' entre 'subcategories'
-- e 'lessons', permitindo organizar qualquer subcategoria em múltiplos
-- exercícios sequenciais (ex: Exercício 1, Exercício 2...) e associar
-- uma ou mais aulas a cada exercício.
--
-- GARANTIAS DE SEGURANÇA, INTEGRIDADE E PRESERVAÇÃO:
-- 1. Idempotência Total: Todas as operações utilizam IF NOT EXISTS / IF EXISTS
--    e blocos condicionais DO $$ ... $$ para restrições e índices.
-- 2. Integridade Relacional Composta no Banco:
--    Garante no próprio PostgreSQL que exercises.category_id corresponda
--    obrigatoriamente à categoria dona de exercises.subcategory_id através
--    da chave estrangeira composta fk_exercises_subcategory_category,
--    tornando impossível criar exercícios com categorias descompassadas.
-- 3. Preservação de Dados Existentes:
--    - Nenhuma tabela, categoria, subcategoria, aula ou vídeo é alterado ou excluído.
--    - Adição segura de UNIQUE(id, category_id) em subcategories (onde id já é PK).
-- 4. Exclusão Segura de Exercício (ON DELETE SET NULL):
--    Se um exercício for excluído, as aulas vinculadas a ele permanecem intactas
--    na subcategoria como aulas diretas (exercise_id = NULL), preservando vídeos do R2.
-- 5. Compatibilidade Estrita com a Aplicação:
--    Mantém as colunas 'display_order' e 'lessons.exercise_id' exatamente como
--    consumidas pelas rotas da API e telas administrativas/alunas.
-- 6. RLS Rigoroso e Princípio do Menor Privilégio:
--    - Sem brechas de WITH CHECK(true) ou USING(true) em escrita.
--    - Escrita restrita a administradoras autenticadas (public.current_user_is_admin()).
--    - Leitura pública/aluna condicionada a categorias e subcategorias não-ocultas.
--    - REVOKE total com GRANT mínimo de SELECT para anon/authenticated.
-- ================================================================

-- 1. Garante restrição UNIQUE composta em subcategories (id, category_id)
-- Como 'id' é PRIMARY KEY, cada par (id, category_id) é naturalmente único.
-- Isso permite a criação da foreign key composta sem modificar nenhum dado existente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subcategories_id_category_id_key'
      AND conrelid = 'public.subcategories'::regclass
  ) THEN
    ALTER TABLE public.subcategories
      ADD CONSTRAINT subcategories_id_category_id_key UNIQUE (id, category_id);
  END IF;
END $$;

-- 2. Criação da tabela de exercícios (se não existir)
CREATE TABLE IF NOT EXISTS public.exercises (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  subcategory_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Chave estrangeira composta: Amarra exercises à subcategoria E à sua categoria dona
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_exercises_subcategory_category'
      AND conrelid = 'public.exercises'::regclass
  ) THEN
    ALTER TABLE public.exercises
      ADD CONSTRAINT fk_exercises_subcategory_category
      FOREIGN KEY (subcategory_id, category_id)
      REFERENCES public.subcategories (id, category_id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Chave estrangeira direta para a tabela de categorias
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_exercises_category'
      AND conrelid = 'public.exercises'::regclass
  ) THEN
    ALTER TABLE public.exercises
      ADD CONSTRAINT fk_exercises_category
      FOREIGN KEY (category_id)
      REFERENCES public.categories (id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Índices de performance para consultas frequentes e ordenação
CREATE INDEX IF NOT EXISTS idx_exercises_subcategory_id ON public.exercises(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_exercises_category_id ON public.exercises(category_id);
CREATE INDEX IF NOT EXISTS idx_exercises_subcat_cat ON public.exercises(subcategory_id, category_id);
CREATE INDEX IF NOT EXISTS idx_exercises_order ON public.exercises(display_order);

-- 6. Vínculo seguro e opcional em aulas (lessons)
-- ON DELETE SET NULL garante que a exclusão de um exercício desvincule a aula
-- sem apagar o registro da aula nem os metadados do vídeo no R2.
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS exercise_id TEXT REFERENCES public.exercises(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lessons_exercise_id ON public.lessons(exercise_id);

-- 7. Habilitação mandatória de RLS na tabela de exercícios
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- 8. Limpeza de políticas existentes para evitar duplicidade
DROP POLICY IF EXISTS "Permitir leitura publica de exercicios" ON public.exercises;
DROP POLICY IF EXISTS "Permitir insercao de exercicios para service_role" ON public.exercises;
DROP POLICY IF EXISTS "Permitir atualizacao de exercicios para service_role" ON public.exercises;
DROP POLICY IF EXISTS "Permitir exclusao de exercicios para service_role" ON public.exercises;
DROP POLICY IF EXISTS "Leitura de exercícios para alunas com acesso" ON public.exercises;
DROP POLICY IF EXISTS "Administradora gerencia exercícios" ON public.exercises;
DROP POLICY IF EXISTS "Leitura pública de exercícios visíveis" ON public.exercises;
DROP POLICY IF EXISTS "Administradora gerencia exercicios" ON public.exercises;

-- 9. Política de Leitura RLS:
-- Apenas exercícios pertencentes a categorias e subcategorias visíveis ('available' ou 'updating')
-- podem ser consultados. Categorias ou subcategorias 'hidden' ficam ocultas para alunas/público.
-- Administradoras podem visualizar qualquer exercício.
CREATE POLICY "Leitura pública de exercícios visíveis" ON public.exercises
  FOR SELECT USING (
    (
      EXISTS (
        SELECT 1
        FROM public.subcategories s
        JOIN public.categories c ON c.id = s.category_id
        WHERE s.id = exercises.subcategory_id
          AND s.category_id = exercises.category_id
          AND (s.status IN ('available', 'updating') OR (s.status IS NULL AND s.published = true))
          AND (c.status IN ('available', 'updating') OR (c.status IS NULL AND c.published = true))
      )
    )
    OR (SELECT public.current_user_is_admin())
  );

-- 10. Política de Escrita RLS:
-- Somente administradoras autenticadas podem inserir, atualizar ou excluir exercícios.
-- Nenhum acesso com USING(true) ou WITH CHECK(true) é permitido para escrita.
CREATE POLICY "Administradora gerencia exercicios" ON public.exercises
  FOR ALL TO authenticated
  USING ((SELECT public.current_user_is_admin()))
  WITH CHECK ((SELECT public.current_user_is_admin()));

-- 11. Permissões SQL Granulares (Menor Privilégio):
REVOKE ALL ON public.exercises FROM PUBLIC;
REVOKE ALL ON public.exercises FROM anon;
REVOKE ALL ON public.exercises FROM authenticated;

-- Concede estritamente SELECT para anon e authenticated (o RLS filtra o que é visível)
GRANT SELECT ON public.exercises TO anon;
GRANT SELECT ON public.exercises TO authenticated;

-- Concede escrita para authenticated (estritamente barrado pelo RLS caso role != 'admin')
GRANT INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
