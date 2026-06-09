
-- Roles enum and tables
CREATE TYPE public.app_role AS ENUM ('admin', 'equipe');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','equipe'))
$$;

-- Domain tables
CREATE TABLE public.responsaveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  telefone TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  endereco TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  igreja TEXT,
  nome_pai TEXT,
  nome_mae TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX responsaveis_cpf_idx ON public.responsaveis (cpf);

CREATE TABLE public.criancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  responsavel_id UUID NOT NULL REFERENCES public.responsaveis(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  data_nascimento DATE NOT NULL,
  idade INT NOT NULL,
  sexo TEXT NOT NULL,
  serie_escolar TEXT,
  tamanho_camisa TEXT,
  alergias TEXT,
  medicamentos TEXT,
  necessidades_especiais TEXT,
  restricoes_alimentares TEXT,
  emergencia_nome TEXT,
  emergencia_telefone TEXT,
  emergencia_parentesco TEXT,
  autoriza_participacao BOOLEAN NOT NULL DEFAULT false,
  autoriza_imagem BOOLEAN NOT NULL DEFAULT false,
  confirma_veracidade BOOLEAN NOT NULL DEFAULT false,
  turma TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.inscricoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crianca_id UUID NOT NULL REFERENCES public.criancas(id) ON DELETE CASCADE,
  protocolo TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'confirmada',
  data_inscricao TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  responsavel_id UUID NOT NULL REFERENCES public.responsaveis(id) ON DELETE CASCADE,
  data_contato TIMESTAMPTZ NOT NULL DEFAULT now(),
  observacoes TEXT,
  confirmado BOOLEAN NOT NULL DEFAULT false,
  registrado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.presencas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crianca_id UUID NOT NULL REFERENCES public.criancas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'presente',
  registrado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (crianca_id, data)
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_resp_upd BEFORE UPDATE ON public.responsaveis FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_crc_upd BEFORE UPDATE ON public.criancas FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email);
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Public RPC: create inscription
CREATE OR REPLACE FUNCTION public.criar_inscricao(payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  resp_id UUID;
  crc_id UUID;
  prot TEXT;
  cpf_clean TEXT;
BEGIN
  cpf_clean := regexp_replace(payload->'responsavel'->>'cpf', '\D', '', 'g');

  SELECT id INTO resp_id FROM public.responsaveis WHERE cpf = cpf_clean;
  IF resp_id IS NULL THEN
    INSERT INTO public.responsaveis (nome,cpf,telefone,whatsapp,email,endereco,bairro,cidade,estado,igreja,nome_pai,nome_mae)
    VALUES (
      payload->'responsavel'->>'nome', cpf_clean,
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
    ) RETURNING id INTO resp_id;
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
    WHERE id = resp_id;
  END IF;

  INSERT INTO public.criancas (
    responsavel_id,nome,data_nascimento,idade,sexo,serie_escolar,tamanho_camisa,
    alergias,medicamentos,necessidades_especiais,restricoes_alimentares,
    emergencia_nome,emergencia_telefone,emergencia_parentesco,
    autoriza_participacao,autoriza_imagem,confirma_veracidade
  ) VALUES (
    resp_id,
    payload->'crianca'->>'nome',
    (payload->'crianca'->>'data_nascimento')::date,
    (payload->'crianca'->>'idade')::int,
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
    COALESCE((payload->'autorizacoes'->>'participacao')::boolean,false),
    COALESCE((payload->'autorizacoes'->>'imagem')::boolean,false),
    COALESCE((payload->'autorizacoes'->>'veracidade')::boolean,false)
  ) RETURNING id INTO crc_id;

  prot := 'EBF26-' || upper(substr(replace(crc_id::text,'-',''),1,8));

  INSERT INTO public.inscricoes (crianca_id, protocolo) VALUES (crc_id, prot);

  RETURN jsonb_build_object('protocolo', prot, 'crianca_id', crc_id, 'responsavel_id', resp_id);
END $$;

-- Public RPC: consult inscription
CREATE OR REPLACE FUNCTION public.consultar_inscricao(termo TEXT)
RETURNS TABLE(
  protocolo TEXT, status TEXT, data_inscricao TIMESTAMPTZ,
  crianca_nome TEXT, crianca_idade INT, crianca_sexo TEXT,
  responsavel_nome TEXT, responsavel_telefone TEXT, igreja TEXT
) LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.protocolo, i.status, i.data_inscricao,
         c.nome, c.idade, c.sexo,
         r.nome, r.telefone, r.igreja
  FROM public.inscricoes i
  JOIN public.criancas c ON c.id = i.crianca_id
  JOIN public.responsaveis r ON r.id = c.responsavel_id
  WHERE i.protocolo = upper(termo)
     OR r.cpf = regexp_replace(termo,'\D','','g')
     OR r.telefone = regexp_replace(termo,'\D','','g')
$$;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.responsaveis TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.criancas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inscricoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contatos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presencas TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON FUNCTION public.criar_inscricao(JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consultar_inscricao(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(UUID) TO authenticated;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presencas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_staff(auth.uid()));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "roles read staff" ON public.user_roles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "roles admin manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "staff all responsaveis" ON public.responsaveis FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff all criancas" ON public.criancas FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff all inscricoes" ON public.inscricoes FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff all contatos" ON public.contatos FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff all presencas" ON public.presencas FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
