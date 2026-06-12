-- Tests: admin_register_presence RPC
-- Validates: upsert behavior, atomic status update, idempotency

begin;
select plan(6);

-- Setup: create test registration
select lives_ok(
  $$select criar_inscricao(
    p_cpf_responsavel := '52998224725',
    p_nome_responsavel := 'Presence Test',
    p_telefone_responsavel := '11922223333',
    p_email_responsavel := 'presence@test.com',
    p_igreja_responsavel := 'UCADMA',
    p_nome_crianca := 'PresenceChild',
    p_data_nascimento := '2020-02-10',
    p_sexo_crianca := 'M',
    p_autorizacao := true,
    p_termo := true
  )$$,
  'setup: create registration for presence tests'
);

-- 1. Register presence: presente
select lives_ok(
  $$select admin_register_presence(
    (select crianca_id from inscricoes order by data_inscricao desc limit 1),
    current_date,
    'presente'::text,
    null
  )$$,
  'register presence as presente succeeds'
);

-- 2. Verify presence was saved
select is(
  (select status from presencas
   where crianca_id = (select crianca_id from inscricoes order by data_inscricao desc limit 1)
   and data = current_date),
  'presente',
  'presence record has status presente'
);

-- 3. Atomic status update: inscricao status became Presente
select is(
  (select status from inscricoes order by data_inscricao desc limit 1),
  'Presente',
  'inscricao status auto-updated to Presente'
);

-- 4. Upsert: registering again changes status
select lives_ok(
  $$select admin_register_presence(
    (select crianca_id from inscricoes order by data_inscricao desc limit 1),
    current_date,
    'faltou'::text,
    null
  )$$,
  'upsert presence from presente to faltou succeeds'
);

-- 5. Verify upsert updated the record
select is(
  (select status from presencas
   where crianca_id = (select crianca_id from inscricoes order by data_inscricao desc limit 1)
   and data = current_date),
  'faltou',
  'presence updated to faltou (upsert works)'
);

-- 6. Registering faltou does NOT change Inscricao status from Presente
-- (only 'presente' triggers status update, and it's already Presente)
select is(
  (select status from inscricoes order by data_inscricao desc limit 1),
  'Presente',
  'inscricao stays Presente even after faltou registration'
);

rollback;
