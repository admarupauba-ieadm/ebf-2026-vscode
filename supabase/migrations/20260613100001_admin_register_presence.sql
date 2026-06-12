-- Migration: RPC para registro de presença (admin)
-- Substitui supabase.from("presencas").upsert() + supabase.from("inscricoes").update()
-- por uma única operação atômica e auditável

CREATE OR REPLACE FUNCTION public.admin_register_presence(
  p_crianca_id UUID,
  p_data DATE,
  p_status TEXT,
  p_registrado_por UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inscricao_id UUID;
  v_status_atual TEXT;
  v_inscricao_atualizada BOOLEAN := false;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem registrar presença.'
      USING HINT = 'Verifique se você possui o papel de administrador.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.criancas WHERE id = p_crianca_id) THEN
    RAISE EXCEPTION 'Criança não encontrada: %', p_crianca_id
      USING HINT = 'Verifique se o ID da criança está correto.';
  END IF;

  INSERT INTO public.presencas (crianca_id, data, status, registrado_por)
  VALUES (p_crianca_id, p_data, p_status, p_registrado_por)
  ON CONFLICT (crianca_id, data)
  DO UPDATE SET status = EXCLUDED.status, registrado_por = COALESCE(EXCLUDED.registrado_por, presencas.registrado_por);

  IF p_status = 'presente' THEN
    SELECT id, status INTO v_inscricao_id, v_status_atual
    FROM public.inscricoes
    WHERE crianca_id = p_crianca_id
    ORDER BY data_inscricao DESC
    LIMIT 1;

    IF v_inscricao_id IS NOT NULL AND v_status_atual IS DISTINCT FROM 'Presente' THEN
      UPDATE public.inscricoes
      SET status = 'Presente'
      WHERE id = v_inscricao_id;
      v_inscricao_atualizada := true;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'crianca_id', p_crianca_id,
    'data', p_data,
    'presenca_status', p_status,
    'inscricao_atualizada', v_inscricao_atualizada
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_register_presence(UUID, DATE, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_register_presence(UUID, DATE, TEXT, UUID) TO authenticated;
