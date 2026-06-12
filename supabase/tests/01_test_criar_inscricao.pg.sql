-- Tests: criar_inscricao RPC
-- Validates: input validation, business rules, success path

begin;
select plan(10);

-- 1. Reject empty CPF
select throws_ok(
  $$select criar_inscricao(
    p_cpf_responsavel := '',
    p_nome_responsavel := 'Maria',
    p_telefone_responsavel := '11987654321',
    p_email_responsavel := 'maria@email.com',
    p_igreja_responsavel := 'UCADMA',
    p_nome_crianca := 'João',
    p_data_nascimento := '2020-01-01',
    p_sexo_crianca := 'M',
    p_autorizacao := true,
    p_termo := true
  )$$,
  'cpf do responsável é obrigatório',
  'empty CPF is rejected'
);

-- 2. Reject invalid CPF (all same digits)
select throws_ok(
  $$select criar_inscricao(
    p_cpf_responsavel := '11111111111',
    p_nome_responsavel := 'Maria',
    p_telefone_responsavel := '11987654321',
    p_email_responsavel := 'maria@email.com',
    p_igreja_responsavel := 'UCADMA',
    p_nome_crianca := 'João',
    p_data_nascimento := '2020-01-01',
    p_sexo_crianca := 'M',
    p_autorizacao := true,
    p_termo := true
  )$$,
  'cpf inválido',
  'invalid CPF (all same digits) is rejected'
);

-- 3. Reject invalid phone (too short)
select throws_ok(
  $$select criar_inscricao(
    p_cpf_responsavel := '52998224725',
    p_nome_responsavel := 'Maria',
    p_telefone_responsavel := '119',
    p_email_responsavel := 'maria@email.com',
    p_igreja_responsavel := 'UCADMA',
    p_nome_crianca := 'João',
    p_data_nascimento := '2020-01-01',
    p_sexo_crianca := 'M',
    p_autorizacao := true,
    p_termo := true
  )$$,
  'telefone inválido',
  'short phone is rejected'
);

-- 4. Reject age over 12
select throws_ok(
  $$select criar_inscricao(
    p_cpf_responsavel := '52998224725',
    p_nome_responsavel := 'Maria',
    p_telefone_responsavel := '11987654321',
    p_email_responsavel := 'maria@email.com',
    p_igreja_responsavel := 'UCADMA',
    p_nome_crianca := 'Adulto',
    p_data_nascimento := '2000-01-01',
    p_sexo_crianca := 'M',
    p_autorizacao := true,
    p_termo := true
  )$$,
  'criança deve ter entre 0 e 12 anos',
  'age >12 is rejected'
);

-- 5. Reject missing authorization
select throws_ok(
  $$select criar_inscricao(
    p_cpf_responsavel := '52998224725',
    p_nome_responsavel := 'Maria',
    p_telefone_responsavel := '11987654321',
    p_email_responsavel := 'maria@email.com',
    p_igreja_responsavel := 'UCADMA',
    p_nome_crianca := 'João',
    p_data_nascimento := '2020-01-01',
    p_sexo_crianca := 'M',
    p_autorizacao := false,
    p_termo := true
  )$$,
  'autorização de participação',
  'missing authorization is rejected'
);

-- 6. Reject missing term consent
select throws_ok(
  $$select criar_inscricao(
    p_cpf_responsavel := '52998224725',
    p_nome_responsavel := 'Maria',
    p_telefone_responsavel := '11987654321',
    p_email_responsavel := 'maria@email.com',
    p_igreja_responsavel := 'UCADMA',
    p_nome_crianca := 'João',
    p_data_nascimento := '2020-01-01',
    p_sexo_crianca := 'M',
    p_autorizacao := true,
    p_termo := false
  )$$,
  'aceitar os termos',
  'missing term consent is rejected'
);

-- 7. Reject empty required fields: nome_responsavel
select throws_ok(
  $$select criar_inscricao(
    p_cpf_responsavel := '52998224725',
    p_nome_responsavel := '',
    p_telefone_responsavel := '11987654321',
    p_email_responsavel := 'maria@email.com',
    p_igreja_responsavel := 'UCADMA',
    p_nome_crianca := 'João',
    p_data_nascimento := '2020-01-01',
    p_sexo_crianca := 'M',
    p_autorizacao := true,
    p_termo := true
  )$$,
  'nome do responsável é obrigatório',
  'empty responsavel name is rejected'
);

-- 8. Reject empty required fields: nome_crianca
select throws_ok(
  $$select criar_inscricao(
    p_cpf_responsavel := '52998224725',
    p_nome_responsavel := 'Maria',
    p_telefone_responsavel := '11987654321',
    p_email_responsavel := 'maria@email.com',
    p_igreja_responsavel := 'UCADMA',
    p_nome_crianca := '',
    p_data_nascimento := '2020-01-01',
    p_sexo_crianca := 'M',
    p_autorizacao := true,
    p_termo := true
  )$$,
  'nome da criança é obrigatório',
  'empty crianca name is rejected'
);

-- 9. Reject duplicate (same CPF + child name + birth date)
-- Insert first registration
select lives_ok(
  $$select criar_inscricao(
    p_cpf_responsavel := '52998224725',
    p_nome_responsavel := 'Maria',
    p_telefone_responsavel := '11987654321',
    p_email_responsavel := 'maria@email.com',
    p_igreja_responsavel := 'UCADMA',
    p_nome_crianca := 'DuplicadoTest',
    p_data_nascimento := '2020-06-01',
    p_sexo_crianca := 'F',
    p_autorizacao := true,
    p_termo := true
  )$$,
  'first registration succeeds'
);

-- Try duplicate
select throws_ok(
  $$select criar_inscricao(
    p_cpf_responsavel := '52998224725',
    p_nome_responsavel := 'Maria',
    p_telefone_responsavel := '11987654321',
    p_email_responsavel := 'maria@email.com',
    p_igreja_responsavel := 'UCADMA',
    p_nome_crianca := 'DuplicadoTest',
    p_data_nascimento := '2020-06-01',
    p_sexo_crianca := 'F',
    p_autorizacao := true,
    p_termo := true
  )$$,
  'já foi inscrita',
  'duplicate registration is rejected'
);

-- 10. Success: valid registration with valid CPF
select lives_ok(
  $$select criar_inscricao(
    p_cpf_responsavel := '52998224725',
    p_nome_responsavel := 'Maria Oliveira',
    p_telefone_responsavel := '11987654321',
    p_email_responsavel := 'moliveira@email.com',
    p_igreja_responsavel := 'UCADMA',
    p_nome_crianca := 'Ana Oliveira',
    p_data_nascimento := '2019-03-15',
    p_sexo_crianca := 'F',
    p_autorizacao := true,
    p_termo := true
  )$$,
  'valid registration succeeds'
);

rollback;
