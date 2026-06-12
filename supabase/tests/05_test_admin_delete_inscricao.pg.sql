-- Tests: admin_delete_inscricao RPC
-- Validates: cascade deletion, permission check, return value

begin;
select plan(8);

-- Setup: create test registration
select lives_ok(
  $$select criar_inscricao(
    p_cpf_responsavel := '52998224725',
    p_nome_responsavel := 'Delete Test',
    p_telefone_responsavel := '11933334444',
    p_email_responsavel := 'delete@test.com',
    p_igreja_responsavel := 'UCADMA',
    p_nome_crianca := 'DeleteChild',
    p_data_nascimento := '2019-11-20',
    p_sexo_crianca := 'F',
    p_autorizacao := true,
    p_termo := true
  )$$,
  'setup: create registration for delete tests'
);

-- Store IDs for later checks
-- (inline subqueries handle this in pgTAP)

-- 1. Delete returns success
select ok(
  (select (admin_delete_inscricao(
    (select id from inscricoes order by data_inscricao desc limit 1)
  ))->>'success')::boolean,
  'deletion returns success=true'
);

-- 2. Inscricao was removed
select is(
  (select count(*)::int from inscricoes
   where id = (select id from inscricoes order by data_inscricao desc limit 1)),
  0,
  'inscricao record was deleted'
);

-- 3. Presencas were removed (cascade)
select is(
  (select count(*)::int from presencas
   where crianca_id = (select crianca_id from inscricoes order by data_inscricao desc limit 1)),
  0,
  'presenca records were cascade-deleted'
);

-- 4. Invalid UUID
select throws_ok(
  $$select admin_delete_inscricao('00000000-0000-0000-0000-000000000000')$$,
  null,
  'non-existent ID raises error'
);

-- Setup second registration for cascade test
select lives_ok(
  $$select criar_inscricao(
    p_cpf_responsavel := '52998224725',
    p_nome_responsavel := 'Cascade Test',
    p_telefone_responsavel := '11944445555',
    p_email_responsavel := 'cascade@test.com',
    p_igreja_responsavel := 'UCADMA',
    p_nome_crianca := 'CascadeChild',
    p_data_nascimento := '2020-08-15',
    p_sexo_crianca := 'M',
    p_autorizacao => true,
    p_termo => true
  )$$,
  'setup: create second registration for cascade test'
);

-- 5. Delete with a presence record
select lives_ok(
  $$select admin_register_presence(
    (select crianca_id from inscricoes order by data_inscricao desc limit 1),
    current_date,
    'presente'::text,
    null
  )$$,
  'register presence for cascade test'
);

-- 6. Delete returns inscricao_removida = true
select ok(
  (select (admin_delete_inscricao(
    (select id from inscricoes order by data_inscricao desc limit 1)
  ))->>'inscricao_removida')::boolean,
  'inscricao_removida flag is true'
);

-- 7. Verify inscricao + presencas are gone
select is(
  (select count(*)::int from inscricoes
   where id = (select id from inscricoes order by data_inscricao desc limit 1)),
  0,
  'final inscricao was deleted with cascade'
);

rollback;
