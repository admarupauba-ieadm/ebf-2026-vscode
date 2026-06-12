-- Migration: Validação aprimorada no servidor
-- Adiciona validação de CPF (dígitos verificadores), telefone (qtd dígitos) e idade no RPC criar_inscricao

-- Função auxiliar: valida CPF (dígitos verificadores + rejeita sequências)
CREATE OR REPLACE FUNCTION public.validar_cpf(cpf TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  digits INT[];
  sum1 INT := 0;
  sum2 INT := 0;
  d1 INT;
  d2 INT;
  idx INT;
BEGIN
  cpf := regexp_replace(cpf, '\D', '', 'g');
  IF length(cpf) <> 11 THEN RETURN FALSE; END IF;
  IF cpf ~ '^(\d)\1{10}$' THEN RETURN FALSE; END IF;

  SELECT array_agg(ascii(substr(cpf, pos, 1)) - 48) INTO digits
  FROM generate_series(1, 11) AS pos;

  FOR idx IN 1..9 LOOP sum1 := sum1 + digits[idx] * (11 - idx); END LOOP;
  d1 := (sum1 * 10) % 11;
  IF d1 = 10 THEN d1 := 0; END IF;

  FOR idx IN 1..10 LOOP sum2 := sum2 + digits[idx] * (12 - idx); END LOOP;
  d2 := (sum2 * 10) % 11;
  IF d2 = 10 THEN d2 := 0; END IF;

  RETURN digits[10] = d1 AND digits[11] = d2;
END;
$$;

-- Atualiza criar_inscricao com validações adicionais
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
  v_idade INT;
BEGIN
  -- CPF
  v_cpf := regexp_replace(payload->'responsavel'->>'cpf', '\D', '', 'g');
  IF v_cpf IS NULL OR v_cpf = '' THEN
    RAISE EXCEPTION 'CPF do responsável é obrigatório.';
  END IF;
  IF NOT public.validar_cpf(v_cpf) THEN
    RAISE EXCEPTION 'CPF do responsável inválido.';
  END IF;

  -- Rate limit
  PERFORM public.check_inscricao_rate_limit(v_cpf);

  -- Valida campos obrigatórios
  IF NULLIF(TRIM(payload->'responsavel'->>'nome'), '') IS NULL THEN
    RAISE EXCEPTION 'Nome do responsável é obrigatório.';
  END IF;
  IF NULLIF(TRIM(payload->'responsavel'->>'telefone'), '') IS NULL THEN
    RAISE EXCEPTION 'Telefone do responsável é obrigatório.';
  END IF;

  -- Valida telefone (10-11 dígitos)
  IF length(regexp_replace(payload->'responsavel'->>'telefone', '\D', '', 'g')) NOT IN (10, 11) THEN
    RAISE EXCEPTION 'Telefone do responsável deve ter 10 ou 11 dígitos.';
  END IF;

  -- Criança
  IF NULLIF(TRIM(payload->'crianca'->>'nome'), '') IS NULL THEN
    RAISE EXCEPTION 'Nome da criança é obrigatório.';
  END IF;
  IF NULLIF(TRIM(payload->'crianca'->>'data_nascimento'), '') IS NULL THEN
    RAISE EXCEPTION 'Data de nascimento da criança é obrigatória.';
  END IF;
  IF NULLIF(TRIM(payload->'crianca'->>'sexo'), '') IS NULL THEN
    RAISE EXCEPTION 'Sexo da criança é obrigatório.';
  END IF;

  -- Valida idade (0-12 anos)
  v_idade := (payload->'crianca'->>'idade')::INT;
  IF v_idade < 0 OR v_idade > 12 THEN
    RAISE EXCEPTION 'A criança deve ter entre 0 e 12 anos para participar da EBF.';
  END IF;

  -- Autorizações
  IF (payload->'autorizacoes'->>'participacao')::BOOLEAN IS DISTINCT FROM true
     OR (payload->'autorizacoes'->>'veracidade')::BOOLEAN IS DISTINCT FROM true
  THEN
    RAISE EXCEPTION 'Autorização de participação e confirmação de veracidade são obrigatórias.';
  END IF;

  -- Upsert responsável
  SELECT id INTO v_resp_id FROM public.responsaveis WHERE cpf = v_cpf;
  IF v_resp_id IS NULL THEN
    INSERT INTO public.responsaveis (nome, cpf, telefone, whatsapp, email, endereco, bairro, cidade, estado, igreja, nome_pai, nome_mae)
    VALUES (
      payload->'responsavel'->>'nome', v_cpf,
      payload->'responsavel'->>'telefone',
      NULLIF(payload->'responsavel'->>'whatsapp', ''),
      NULLIF(payload->'responsavel'->>'email', ''),
      NULLIF(payload->'responsavel'->>'endereco', ''),
      NULLIF(payload->'responsavel'->>'bairro', ''),
      NULLIF(payload->'responsavel'->>'cidade', ''),
      NULLIF(payload->'responsavel'->>'estado', ''),
      NULLIF(payload->'responsavel'->>'igreja', ''),
      NULLIF(payload->'responsavel'->>'nome_pai', ''),
      NULLIF(payload->'responsavel'->>'nome_mae', '')
    ) RETURNING id INTO v_resp_id;
  ELSE
    UPDATE public.responsaveis SET
      nome = COALESCE(NULLIF(payload->'responsavel'->>'nome', ''), nome),
      telefone = COALESCE(NULLIF(payload->'responsavel'->>'telefone', ''), telefone),
      whatsapp = COALESCE(NULLIF(payload->'responsavel'->>'whatsapp', ''), whatsapp),
      email = COALESCE(NULLIF(payload->'responsavel'->>'email', ''), email),
      endereco = COALESCE(NULLIF(payload->'responsavel'->>'endereco', ''), endereco),
      bairro = COALESCE(NULLIF(payload->'responsavel'->>'bairro', ''), bairro),
      cidade = COALESCE(NULLIF(payload->'responsavel'->>'cidade', ''), cidade),
      estado = COALESCE(NULLIF(payload->'responsavel'->>'estado', ''), estado),
      igreja = COALESCE(NULLIF(payload->'responsavel'->>'igreja', ''), igreja),
      nome_pai = COALESCE(NULLIF(payload->'responsavel'->>'nome_pai', ''), nome_pai),
      nome_mae = COALESCE(NULLIF(payload->'responsavel'->>'nome_mae', ''), nome_mae)
    WHERE id = v_resp_id;
  END IF;

  -- Insert criança (com NULLIF para opcionais)
  INSERT INTO public.criancas (
    responsavel_id, nome, data_nascimento, idade, sexo, serie_escolar, tamanho_camisa,
    alergias, medicamentos, necessidades_especiais, restricoes_alimentares,
    emergencia_nome, emergencia_telefone, emergencia_parentesco,
    autoriza_participacao, autoriza_imagem, confirma_veracidade
  ) VALUES (
    v_resp_id,
    payload->'crianca'->>'nome',
    (payload->'crianca'->>'data_nascimento')::DATE,
    v_idade,
    payload->'crianca'->>'sexo',
    NULLIF(payload->'crianca'->>'serie_escolar', ''),
    NULLIF(payload->'crianca'->>'tamanho_camisa', ''),
    NULLIF(payload->'saude'->>'alergias', ''),
    NULLIF(payload->'saude'->>'medicamentos', ''),
    NULLIF(payload->'saude'->>'necessidades_especiais', ''),
    NULLIF(payload->'saude'->>'restricoes_alimentares', ''),
    NULLIF(payload->'emergencia'->>'nome', ''),
    NULLIF(payload->'emergencia'->>'telefone', ''),
    NULLIF(payload->'emergencia'->>'parentesco', ''),
    COALESCE((payload->'autorizacoes'->>'participacao')::BOOLEAN, false),
    COALESCE((payload->'autorizacoes'->>'imagem')::BOOLEAN, false),
    COALESCE((payload->'autorizacoes'->>'veracidade')::BOOLEAN, false)
  ) RETURNING id INTO v_crc_id;

  v_protocolo := 'EBF26-' || upper(substr(replace(v_crc_id::TEXT, '-', ''), 1, 8));
  INSERT INTO public.inscricoes (crianca_id, protocolo) VALUES (v_crc_id, v_protocolo);

  RETURN jsonb_build_object('protocolo', v_protocolo, 'crianca_id', v_crc_id, 'responsavel_id', v_resp_id);
END;
$$;

-- Corrige search_path da check_inscricao_rate_limit (segurança)
CREATE OR REPLACE FUNCTION public.check_inscricao_rate_limit(p_cpf TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  INSERT INTO public.inscricao_rate_limits (cpf) VALUES (p_cpf);
  RETURN true;
END;
$$;
