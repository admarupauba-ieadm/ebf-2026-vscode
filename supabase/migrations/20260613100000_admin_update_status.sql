-- Migration: RPC para alteração de status de inscrição (admin)
-- Substitui supabase.from("inscricoes").update() por uma RPC segura e auditável

CREATE OR REPLACE FUNCTION public.admin_update_status(
  p_inscricao_id UUID,
  p_novo_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status_atual TEXT;
  v_protocolo TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem alterar status de inscrições.'
      USING HINT = 'Verifique se você possui o papel de administrador.';
  END IF;

  SELECT status, protocolo INTO v_status_atual, v_protocolo
  FROM public.inscricoes
  WHERE id = p_inscricao_id;

  IF v_protocolo IS NULL THEN
    RAISE EXCEPTION 'Inscrição não encontrada: %', p_inscricao_id
      USING HINT = 'Verifique se o ID da inscrição está correto.';
  END IF;

  UPDATE public.inscricoes
  SET status = p_novo_status
  WHERE id = p_inscricao_id;

  RETURN jsonb_build_object(
    'success', true,
    'inscricao_id', p_inscricao_id,
    'protocolo', v_protocolo,
    'status_anterior', v_status_atual,
    'status_novo', p_novo_status
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_status(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_status(UUID, TEXT) TO authenticated;
