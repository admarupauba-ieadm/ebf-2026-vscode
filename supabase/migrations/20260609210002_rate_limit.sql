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
-- (Must preserve existing signature and behavior)
CREATE OR REPLACE FUNCTION public.criar_inscricao(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_protocolo TEXT;
  v_inscricao_id BIGINT;
  v_cpf TEXT;
  v_responsavel JSONB;
  v_crianca JSONB;
  v_saude JSONB;
  v_emergencia JSONB;
  v_autorizacoes JSONB;
BEGIN
  -- Extract sub-objects
  v_responsavel := payload->'responsavel';
  v_crianca := payload->'crianca';
  v_saude := payload->'saude';
  v_emergencia := payload->'emergencia';
  v_autorizacoes := payload->'autorizacoes';

  -- Extract CPF for rate limiting
  v_cpf := TRIM(v_responsavel->>'cpf');
  IF v_cpf IS NULL OR v_cpf = '' THEN
    RAISE EXCEPTION 'CPF do responsável é obrigatório.';
  END IF;

  -- Rate limit check
  PERFORM public.check_inscricao_rate_limit(v_cpf);

  -- Validate required fields
  IF NULLIF(TRIM(v_responsavel->>'nome'), '') IS NULL THEN
    RAISE EXCEPTION 'Nome do responsável é obrigatório.';
  END IF;
  IF NULLIF(TRIM(v_responsavel->>'telefone'), '') IS NULL THEN
    RAISE EXCEPTION 'Telefone do responsável é obrigatório.';
  END IF;
  IF NULLIF(TRIM(v_crianca->>'nome'), '') IS NULL THEN
    RAISE EXCEPTION 'Nome da criança é obrigatório.';
  END IF;
  IF NULLIF(TRIM(v_crianca->>'data_nascimento'), '') IS NULL THEN
    RAISE EXCEPTION 'Data de nascimento da criança é obrigatória.';
  END IF;
  IF NULLIF(TRIM(v_crianca->>'sexo'), '') IS NULL THEN
    RAISE EXCEPTION 'Sexo da criança é obrigatório.';
  END IF;
  IF v_autorizacoes IS NULL
     OR (v_autorizacoes->>'participacao')::BOOLEAN IS DISTINCT FROM true
     OR (v_autorizacoes->>'veracidade')::BOOLEAN IS DISTINCT FROM true
  THEN
    RAISE EXCEPTION 'Autorização de participação e confirmação de veracidade são obrigatórias.';
  END IF;

  -- Generate protocolo
  v_protocolo := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12));

  -- Insert responsavel
  INSERT INTO public.responsaveis (
    nome, cpf, telefone, whatsapp, email, endereco, bairro, cidade, estado, igreja, nome_pai, nome_mae
  ) VALUES (
    NULLIF(TRIM(v_responsavel->>'nome'), ''),
    v_cpf,
    NULLIF(TRIM(v_responsavel->>'telefone'), ''),
    NULLIF(TRIM(v_responsavel->>'whatsapp'), ''),
    NULLIF(TRIM(v_responsavel->>'email'), ''),
    NULLIF(TRIM(v_responsavel->>'endereco'), ''),
    NULLIF(TRIM(v_responsavel->>'bairro'), ''),
    NULLIF(TRIM(v_responsavel->>'cidade'), ''),
    NULLIF(TRIM(v_responsavel->>'estado'), ''),
    NULLIF(TRIM(v_responsavel->>'igreja'), ''),
    NULLIF(TRIM(v_responsavel->>'nome_pai'), ''),
    NULLIF(TRIM(v_responsavel->>'nome_mae'), '')
  )
  RETURNING id INTO v_inscricao_id;

  -- Insert crianca linked to responsavel
  INSERT INTO public.criancas (
    responsavel_id, nome, data_nascimento, idade, sexo, serie_escolar, tamanho_camisa
  ) VALUES (
    v_inscricao_id,
    NULLIF(TRIM(v_crianca->>'nome'), ''),
    NULLIF(TRIM(v_crianca->>'data_nascimento'), '')::DATE,
    NULLIF(TRIM(v_crianca->>'idade'), '')::INT,
    NULLIF(TRIM(v_crianca->>'sexo'), ''),
    NULLIF(TRIM(v_crianca->>'serie_escolar'), ''),
    NULLIF(TRIM(v_crianca->>'tamanho_camisa'), '')
  );

  -- Insert saude
  INSERT INTO public.saude (responsavel_id, alergias, medicamentos, necessidades_especiais, restricoes_alimentares)
  VALUES (
    v_inscricao_id,
    NULLIF(TRIM(v_saude->>'alergias'), ''),
    NULLIF(TRIM(v_saude->>'medicamentos'), ''),
    NULLIF(TRIM(v_saude->>'necessidades_especiais'), ''),
    NULLIF(TRIM(v_saude->>'restricoes_alimentares'), '')
  );

  -- Insert emergencia
  INSERT INTO public.emergencia (responsavel_id, nome, telefone, parentesco)
  VALUES (
    v_inscricao_id,
    NULLIF(TRIM(v_emergencia->>'nome'), ''),
    NULLIF(TRIM(v_emergencia->>'telefone'), ''),
    NULLIF(TRIM(v_emergencia->>'parentesco'), '')
  );

  -- Insert autorizacoes
  INSERT INTO public.autorizacoes (responsavel_id, participacao, imagem, veracidade)
  VALUES (
    v_inscricao_id,
    (v_autorizacoes->>'participacao')::BOOLEAN,
    (v_autorizacoes->>'imagem')::BOOLEAN,
    (v_autorizacoes->>'veracidade')::BOOLEAN
  );

  -- Update protocolo
  UPDATE public.responsaveis SET protocolo = v_protocolo WHERE id = v_inscricao_id;

  RETURN jsonb_build_object('protocolo', v_protocolo, 'id', v_inscricao_id);
END;
$$;
