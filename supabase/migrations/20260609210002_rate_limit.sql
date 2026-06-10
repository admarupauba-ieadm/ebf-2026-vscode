-- Migration 5: Rate limiting para RPCs públicas
-- Previne abuso de criacao de inscricoes (max 3 por CPF a cada 60 min)

CREATE TABLE IF NOT EXISTS public.inscricao_rate_limits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cpf TEXT NOT NULL,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_cpf_created
  ON public.inscricao_rate_limits (cpf, created_at DESC);

ALTER TABLE public.inscricao_rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow authenticated and anon to insert (RPC calls will insert directly)
-- But anon should not be able to read or list
CREATE POLICY "rate_limits_insert_authenticated" ON public.inscricao_rate_limits
  FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "rate_limits_select_authenticated" ON public.inscricao_rate_limits
  FOR SELECT TO authenticated USING (true);

-- Helper: check if a CPF exceeded rate limit
-- Returns true if allowed, raises exception if blocked
CREATE OR REPLACE FUNCTION public.check_inscricao_rate_limit(p_cpf TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recent_count INT;
  v_max_per_window CONSTANT INT := 3;
  v_window_minutes CONSTANT INT := 60;
BEGIN
  SELECT COUNT(*) INTO v_recent_count
  FROM public.inscricao_rate_limits
  WHERE cpf = p_cpf
    AND created_at > now() - (v_window_minutes || ' minutes')::INTERVAL;

  IF v_recent_count >= v_max_per_window THEN
    RAISE EXCEPTION 'Limite de inscrições excedido. Tente novamente em % minuto(s).', v_window_minutes;
  END IF;

  -- Register this attempt
  INSERT INTO public.inscricao_rate_limits (cpf) VALUES (p_cpf);

  RETURN true;
END;
$$;

-- Recreate criar_inscricao to include rate limiting
-- (Must preserve original signature, upsert logic, and schema)
CREATE OR REPLACE FUNCTION public.criar_inscricao(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_protocolo TEXT;
  v_crc_id UUID;
  v_resp_id UUID;
  v_cpf TEXT;
BEGIN
  -- Extract CPF for rate limiting
  v_cpf := regexp_replace(payload->'responsavel'->>'cpf', '\D', '', 'g');
  IF v_cpf IS NULL OR v_cpf = '' THEN
    RAISE EXCEPTION 'CPF do responsável é obrigatório.';
  END IF;

  -- Rate limit check (max 3 inscrições por CPF a cada 60 min)
  PERFORM public.check_inscricao_rate_limit(v_cpf);

  -- Validate required fields
  IF NULLIF(TRIM(payload->'responsavel'->>'nome'), '') IS NULL THEN
    RAISE EXCEPTION 'Nome do responsável é obrigatório.';
  END IF;
  IF NULLIF(TRIM(payload->'responsavel'->>'telefone'), '') IS NULL THEN
    RAISE EXCEPTION 'Telefone do responsável é obrigatório.';
  END IF;
  IF NULLIF(TRIM(payload->'crianca'->>'nome'), '') IS NULL THEN
    RAISE EXCEPTION 'Nome da criança é obrigatório.';
  END IF;
  IF NULLIF(TRIM(payload->'crianca'->>'data_nascimento'), '') IS NULL THEN
    RAISE EXCEPTION 'Data de nascimento da criança é obrigatória.';
  END IF;
  IF NULLIF(TRIM(payload->'crianca'->>'sexo'), '') IS NULL THEN
    RAISE EXCEPTION 'Sexo da criança é obrigatório.';
  END IF;
  IF (payload->'autorizacoes'->>'participacao')::BOOLEAN IS DISTINCT FROM true
     OR (payload->'autorizacoes'->>'veracidade')::BOOLEAN IS DISTINCT FROM true
  THEN
    RAISE EXCEPTION 'Autorização de participação e confirmação de veracidade são obrigatórias.';
  END IF;

  -- Find or create responsavel (original upsert logic)
  SELECT id INTO v_resp_id FROM public.responsaveis WHERE cpf = v_cpf;
  IF v_resp_id IS NULL THEN
    INSERT INTO public.responsaveis (nome, cpf, telefone, whatsapp, email, endereco, bairro, cidade, estado, igreja, nome_pai, nome_mae)
    VALUES (
      payload->'responsavel'->>'nome', v_cpf,
      payload->'responsavel'->>'telefone',
      payload->'responsavel'->>'whatsapp',
      payload->'responsavel'->>'email',
      payload->'responsavel'->>'endereco',
      payload->'responsavel'->>'bairro',
      payload->'responsavel'->>'cidade',
      payload->'responsavel'->>'estado',
      payload->'responsavel'->>'igreja',
      payload->'responsavel'->>'nome_pai',
      payload->'responsavel'->>'nome_mae'
    ) RETURNING id INTO v_resp_id;
  ELSE
    UPDATE public.responsaveis SET
      nome = COALESCE(payload->'responsavel'->>'nome', nome),
      telefone = COALESCE(payload->'responsavel'->>'telefone', telefone),
      whatsapp = COALESCE(payload->'responsavel'->>'whatsapp', whatsapp),
      email = COALESCE(payload->'responsavel'->>'email', email),
      endereco = COALESCE(payload->'responsavel'->>'endereco', endereco),
      bairro = COALESCE(payload->'responsavel'->>'bairro', bairro),
      cidade = COALESCE(payload->'responsavel'->>'cidade', cidade),
      estado = COALESCE(payload->'responsavel'->>'estado', estado),
      igreja = COALESCE(payload->'responsavel'->>'igreja', igreja),
      nome_pai = COALESCE(payload->'responsavel'->>'nome_pai', nome_pai),
      nome_mae = COALESCE(payload->'responsavel'->>'nome_mae', nome_mae)
    WHERE id = v_resp_id;
  END IF;

  -- Insert crianca with ALL fields (saude, emergencia, autorizacoes included in table)
  INSERT INTO public.criancas (
    responsavel_id, nome, data_nascimento, idade, sexo, serie_escolar, tamanho_camisa,
    alergias, medicamentos, necessidades_especiais, restricoes_alimentares,
    emergencia_nome, emergencia_telefone, emergencia_parentesco,
    autoriza_participacao, autoriza_imagem, confirma_veracidade
  ) VALUES (
    v_resp_id,
    payload->'crianca'->>'nome',
    (payload->'crianca'->>'data_nascimento')::DATE,
    (payload->'crianca'->>'idade')::INT,
    payload->'crianca'->>'sexo',
    payload->'crianca'->>'serie_escolar',
    payload->'crianca'->>'tamanho_camisa',
    payload->'saude'->>'alergias',
    payload->'saude'->>'medicamentos',
    payload->'saude'->>'necessidades_especiais',
    payload->'saude'->>'restricoes_alimentares',
    payload->'emergencia'->>'nome',
    payload->'emergencia'->>'telefone',
    payload->'emergencia'->>'parentesco',
    COALESCE((payload->'autorizacoes'->>'participacao')::BOOLEAN, false),
    COALESCE((payload->'autorizacoes'->>'imagem')::BOOLEAN, false),
    COALESCE((payload->'autorizacoes'->>'veracidade')::BOOLEAN, false)
  ) RETURNING id INTO v_crc_id;

  -- Generate protocolo (original format)
  v_protocolo := 'EBF26-' || upper(substr(replace(v_crc_id::TEXT, '-', ''), 1, 8));

  -- Insert into inscricoes (original logic)
  INSERT INTO public.inscricoes (crianca_id, protocolo) VALUES (v_crc_id, v_protocolo);

  RETURN jsonb_build_object('protocolo', v_protocolo, 'crianca_id', v_crc_id, 'responsavel_id', v_resp_id);
END;
$$;
