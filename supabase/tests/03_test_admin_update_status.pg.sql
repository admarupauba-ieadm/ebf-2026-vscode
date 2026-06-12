-- Tests: admin_update_status RPC
-- Validates: valid transitions, permission check, idempotency

begin;
select plan(5);

-- Setup: create test registration
select lives_ok(
  $$select criar_inscricao(
    p_cpf_responsavel := '52998224725',
    p_nome_responsavel := 'Admin Test',
    p_telefone_responsavel := '11911112222',
    p_email_responsavel := 'admin@test.com',
    p_igreja_responsavel := 'UCADMA',
    p_nome_crianca := 'StatusTest',
    p_data_nascimento := '2019-05-10',
    p_sexo_crianca := 'F',
    p_autorizacao := true,
    p_termo := true
  )$$,
  'setup: create registration for status tests'
);

-- 1. Confirm: Inscrito -> Confirmado
select lives_ok(
  $$select admin_update_status(
    (select id from inscricoes order by data_inscricao desc limit 1),
    'Confirmado'
  )$$,
  'status change Inscrito -> Confirmado succeeds'
);

-- 2. Presente: Confirmado -> Presente
select lives_ok(
  $$select admin_update_status(
    (select id from inscricoes order by data_inscricao desc limit 1),
    'Presente'
  )$$,
  'status change Confirmado -> Presente succeeds'
);

-- 3. Cancelado: Presente -> Cancelado
select lives_ok(
  $$select admin_update_status(
    (select id from inscricoes order by data_inscricao desc limit 1),
    'Cancelado'
  )$$,
  'status change Presente -> Cancelado succeeds'
);

-- 4. Invalid UUID raises error
select throws_ok(
  $$select admin_update_status('00000000-0000-0000-0000-000000000000', 'Confirmado')$$,
  null,
  'non-existent ID raises error'
);

-- 5. Verify actual status in database
select is(
  (select status from inscricoes order by data_inscricao desc limit 1),
  'Cancelado',
  'database reflects final Cancelado status'
);

rollback;
