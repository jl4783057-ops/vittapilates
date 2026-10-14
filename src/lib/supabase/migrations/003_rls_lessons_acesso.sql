-- ================================================================
-- VITTA PILATES - MIGRAÇÃO 003: Atualização de RLS na tabela public.lessons
-- Rode no SQL Editor do Supabase DEPOIS de executar a migração 002.
--
-- Objetivo:
-- Alinhar a política de segurança de leitura de aulas às regras de negócio:
-- 1. Administradoras continuam podendo visualizar e gerenciar todas as aulas.
-- 2. Alunas podem ler aulas publicadas APENAS quando:
--    a) access_type = 'subscriber' E subscription_status IN ('active', 'trial')
--    b) access_type = 'courtesy' E access_expires_at > now()
-- 3. Contas com access_type = 'none', cortesias expiradas ou usuárias não
--    autenticadas (anon) são bloqueadas.
-- ================================================================

-- 1. Garante que RLS está habilitado na tabela de aulas
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- 2. Remove políticas de leitura antigas/duplicadas para evitar permissões concorrentes ou excessivas
DROP POLICY IF EXISTS "Alunas ativas visualizam aulas publicadas" ON public.lessons;
DROP POLICY IF EXISTS "Alunas com acesso ativo visualizam aulas publicadas" ON public.lessons;

-- 3. Cria a política oficial de leitura com verificação combinada de acesso
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

-- 4. Reafirma que usuários anônimos (anon) não têm acesso de leitura à tabela de aulas
REVOKE ALL ON public.lessons FROM anon;
GRANT SELECT ON public.lessons TO authenticated;
