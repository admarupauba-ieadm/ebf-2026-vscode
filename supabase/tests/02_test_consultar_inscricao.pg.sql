-- Tests: consultar_inscricao RPC
-- Validates: search by protocol, CPF, phone; empty results

begin;
select plan(6);

-- Setup: insert a test registration
select lives_ok(
  $$select criar_inscricao(
    p_cpf_responsavel := '52998224725',
    p_nome_responsavel := 'Carlos Teste',
    p_telefone_responsavel := '11988887777',
    p_email_responsavel := 'carlos@test.com',
    p_igreja_responsavel := 'UCADMA',
    p_nome_crianca := 'Lucas Teste',
    p_data_nascimento := '2018-07-20',
    p_sexo_crianca := 'M',
    p_autorizacao := true,
    p_termo := true
  )$$,
  'setup: create test registration'
);

-- 1. Search by protocol
select is(
  (select count(*)::int from consultar_inscricao((select protocolo from inscricoes order by data_inscricao desc limit 1))),
  1,
  'search by protocol returns 1 result'
);

-- 2. Search by CPF
select is(
  (select count(*)::int from consultar_inscricao('52998224725')),
  1,
  'search by CPF returns 1 result'
);

-- 3. Search by phone
select is(
  (select count(*)::int from consultar_inscricao('11988887777')),
  1,
  'search by phone returns 1 result'
);

-- 4. Search returns correct fields
select is(
  (select crianca_nome from consultar_inscricao('52998224725') limit 1),
  'Lucas Teste',
  'search returns correct child name'
);

-- 5. Empty result for non-existent term
select is(
  (select count(*)::int from consultar_inscricao('TERMO-INEXISTENTE')),
  0,
  'non-existent term returns empty'
);

-- 6. Search by CPF returns all required fields
select ok(
  exists(
    select 1 from consultar_inscricao('52998224725')
    where
      protocolo is not null
      and crianca_nome is not null
      and crianca_idade is not null
      and crianca_sexo is not null
      and status is not null
      and responsavel_nome is not null
      and responsavel_telefone is not null
  ),
  'search result has all required fields'
);

rollback;
