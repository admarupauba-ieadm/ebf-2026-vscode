-- Migration: Prevenção de inscrições duplicadas
-- Impede que a mesma criança seja inscrita mais de uma vez pelo mesmo responsável

-- UNIQUE constraint em criancas (responsavel_id, nome, data_nascimento)
ALTER TABLE public.criancas
  ADD CONSTRAINT criancas_responsavel_nome_dn_unique
  UNIQUE (responsavel_id, nome, data_nascimento);

-- Função auxiliar: verifica se já existe inscrição duplicada
CREATE OR REPLACE FUNCTION public.verificar_inscricao_duplicada(
  p_responsavel_cpf TEXT,
  p_crianca_nome TEXT,
  p_data_nascimento DATE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_responsavel_id UUID;
  v_existing RECORD;
BEGIN
  p_responsavel_cpf := regexp_replace(p_responsavel_cpf, '\D', '', 'g');

  SELECT id INTO v_responsavel_id
  FROM public.responsaveis
  WHERE cpf = p_responsavel_cpf;

  IF v_responsavel_id IS NULL THEN
    RETURN jsonb_build_object('duplicada', false);
  END IF;

  SELECT c.nome, c.data_nascimento, i.protocolo, i.data_inscricao, i.status
    INTO v_existing
  FROM public.criancas c
  JOIN public.inscricoes i ON i.crianca_id = c.id
  WHERE c.responsavel_id = v_responsavel_id
    AND c.nome = p_crianca_nome
    AND c.data_nascimento = p_data_nascimento
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object(
      'duplicada', true,
      'protocolo', v_existing.protocolo,
      'data_inscricao', v_existing.data_inscricao,
      'status', v_existing.status
    );
  END IF;

  RETURN jsonb_build_object('duplicada', false);
END;
$$;

-- Atualiza criar_inscricao para verificar duplicidade antes de inserir
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
  v_crianca_nome TEXT;
  v_data_nascimento DATE;
  v_duplicata JSONB;
BEGIN
  v_cpf := regexp_replace(payload->'responsavel'->>'cpf', '\D', '', 'g');
  IF v_cpf IS NULL OR v_cpf = '' THEN
    RAISE EXCEPTION 'CPF do responsável é obrigatório.';
  END IF;
  IF NOT public.validar_cpf(v_cpf) THEN
    RAISE EXCEPTION 'CPF do responsável inválido.';
  END IF;

  PERFORM public.check_inscricao_rate_limit(v_cpf);

  IF NULLIF(TRIM(payload->'responsavel'->>'nome'), '') IS NULL THEN
    RAISE EXCEPTION 'Nome do responsável é obrigatório.';
  END IF;
  IF NULLIF(TRIM(payload->'responsavel'->>'telefone'), '') IS NULL THEN
    RAISE EXCEPTION 'Telefone do responsável é obrigatório.';
  END IF;
  IF length(regexp_replace(payload->'responsavel'->>'telefone', '\D', '', 'g')) NOT IN (10, 11) THEN
    RAISE EXCEPTION 'Telefone do responsável deve ter 10 ou 11 dígitos.';
  END IF;

  v_crianca_nome := NULLIF(TRIM(payload->'crianca'->>'nome'), '');
  IF v_crianca_nome IS NULL THEN
    RAISE EXCEPTION 'Nome da criança é obrigatório.';
  END IF;
  IF NULLIF(TRIM(payload->'crianca'->>'data_nascimento'), '') IS NULL THEN
    RAISE EXCEPTION 'Data de nascimento da criança é obrigatória.';
  END IF;
  IF NULLIF(TRIM(payload->'crianca'->>'sexo'), '') IS NULL THEN
    RAISE EXCEPTION 'Sexo da criança é obrigatório.';
  END IF;

  v_idade := (payload->'crianca'->>'idade')::INT;
  IF v_idade < 0 OR v_idade > 12 THEN
    RAISE EXCEPTION 'A criança deve ter entre 0 e 12 anos para participar da EBF.';
  END IF;

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

  -- Verifica duplicidade antes de inserir
  v_data_nascimento := (payload->'crianca'->>'data_nascimento')::DATE;
  v_duplicata := public.verificar_inscricao_duplicada(v_cpf, v_crianca_nome, v_data_nascimento);
  IF (v_duplicata->>'duplicada')::BOOLEAN THEN
    RAISE EXCEPTION 'Esta criança já foi inscrita. Protocolo existente: % (Status: %)',
      v_duplicata->>'protocolo', v_duplicata->>'status';
  END IF;

  INSERT INTO public.criancas (
    responsavel_id, nome, data_nascimento, idade, sexo, serie_escolar, tamanho_camisa,
    alergias, medicamentos, necessidades_especiais, restricoes_alimentares,
    emergencia_nome, emergencia_telefone, emergencia_parentesco,
    autoriza_participacao, autoriza_imagem, confirma_veracidade
  ) VALUES (
    v_resp_id, v_crianca_nome, v_data_nascimento, v_idade,
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

-- Permissão para a nova função
GRANT EXECUTE ON FUNCTION public.verificar_inscricao_duplicada(TEXT, TEXT, DATE) TO anon, authenticated;
