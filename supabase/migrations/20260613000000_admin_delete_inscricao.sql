-- Migration: Exclusão física de inscrições (admin)
-- Permite que administradores removam permanentemente uma inscrição
-- Remove em cascata: inscricao → crianca (se sem vínculos) → responsavel (se sem vínculos)

-- Validação de permissão administrativa
CREATE OR REPLACE FUNCTION public.admin_delete_inscricao(
  p_inscricao_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_crianca_id UUID;
  v_responsavel_id UUID;
  v_inscricao_existente RECORD;
  v_outras_inscricoes INT;
  v_outras_criancas INT;
  v_result JSONB;
BEGIN
  -- Verifica permissão: apenas admin pode excluir
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem excluir inscrições.'
      USING HINT = 'Verifique se você possui o papel de administrador.';
  END IF;

  -- Passo 1: Localizar a inscrição
  SELECT id, crianca_id, protocolo INTO v_inscricao_existente
  FROM public.inscricoes
  WHERE id = p_inscricao_id;

  IF v_inscricao_existente IS NULL THEN
    RAISE EXCEPTION 'Inscrição não encontrada: %', p_inscricao_id
      USING HINT = 'Verifique se o ID da inscrição está correto.';
  END IF;

  v_crianca_id := v_inscricao_existente.crianca_id;
  v_result := jsonb_build_object(
    'success', true,
    'inscricao_removida', false,
    'crianca_removida', false,
    'responsavel_removido', false
  );

  -- Passo 2: Obter responsável vinculado à criança
  SELECT responsavel_id INTO v_responsavel_id
  FROM public.criancas
  WHERE id = v_crianca_id;

  -- Passo 3-4: Excluir a inscrição
  DELETE FROM public.inscricoes WHERE id = p_inscricao_id;
  v_result := jsonb_set(v_result, '{inscricao_removida}', 'true');

  -- Passo 5: Verificar se a criança possui outras inscrições
  SELECT COUNT(*) INTO v_outras_inscricoes
  FROM public.inscricoes
  WHERE crianca_id = v_crianca_id;

  IF v_outras_inscricoes = 0 THEN
    -- Excluir presencas da criança (se houver)
    DELETE FROM public.presencas WHERE crianca_id = v_crianca_id;
    -- Excluir a criança
    DELETE FROM public.criancas WHERE id = v_crianca_id;
    v_result := jsonb_set(v_result, '{crianca_removida}', 'true');
  END IF;

  -- Passo 6: Verificar se o responsável possui outras crianças vinculadas
  IF v_responsavel_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_outras_criancas
    FROM public.criancas
    WHERE responsavel_id = v_responsavel_id;

    IF v_outras_criancas = 0 THEN
      -- Excluir contatos associados (se houver)
      DELETE FROM public.contatos WHERE responsavel_id = v_responsavel_id;
      -- Excluir o responsável
      DELETE FROM public.responsaveis WHERE id = v_responsavel_id;
      v_result := jsonb_set(v_result, '{responsavel_removido}', 'true');
    END IF;
  END IF;

  RETURN v_result;
END;
$$;

-- Permissão: apenas usuários autenticados (a função valida admin internamente)
REVOKE EXECUTE ON FUNCTION public.admin_delete_inscricao(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_inscricao(UUID) TO authenticated;
