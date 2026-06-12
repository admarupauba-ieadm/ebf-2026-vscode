# Auditoria de Persistência — `/inscricao`

**Projeto:** EBF 2026 Connect Hub  
**Data:** 12/06/2026  
**Analista:** opencode  
**Ambiente:** Produção (Supabase Project `fwaiaxfbyuvjqelvuivz`)  
**PG Version:** 17  

---

## Resumo

Foram executados **12 testes** abrangendo criação, verificação, recuperação, integridade e cenários de erro da rota pública de inscrição.  
**Resultado:** 11 aprovados, 1 reprovado (crítico).

---

## 1. Criação de Inscrições de Teste

### Teste 1 — Inscrição completa (todos os campos)

| Campo | Informação |
|-------|-----------|
| **Payload** | Responsável com 11 campos + Criança com 6 campos + Saúde 4 campos + Emergência 3 campos + Autorizações 3 campos |
| **CPF** | `529.982.247-25` (válido) |
| **Telefone** | `(91) 99876-5432` (com máscara) |
| **Resultado** | `{"protocolo":"EBF26-0ED904F5"}` |
| **Status** | ✅ **Aprovado** |

### Teste 2 — Inscrição mínima (apenas obrigatórios)

| Campo | Informação |
|-------|-----------|
| **Payload** | Apenas campos obrigatórios preenchidos; todos os opcionais vazios |
| **CPF** | `742.453.960-08` (válido) |
| **Resultado** | `{"protocolo":"EBF26-59347F34"}` |
| **Status** | ✅ **Aprovado** |

### Teste 3 — Upsert mesmo CPF com dados atualizados

| Aspecto | Resultado |
|---------|-----------|
| Mesmo CPF do Teste 1, dados do responsável alterados | `responsavel_id` reutilizado |
| Nova criança vinculada ao mesmo responsável | `"Ana Clara Silva"` criada |
| Dados antigos sobrescritos? | `nome`, `email`, `endereco`, `bairro`, `nome_pai` atualizados |
| **Status** | ✅ **Aprovado** |

---

## 2. Verificação de Gravação no Banco

### Teste 4 — Persistência completa (Tabela `responsaveis`)

| Campo | Esperado | Obtido | Status |
|-------|:--------:|:------:|:------:|
| `id` | UUID | `eb664b2a-d1cb-44e4-8c14-91d7e66a1756` | ✅ |
| `nome` | "Maria Aparecida Silva" | "Maria Aparecida Silva" | ✅ |
| `cpf` | "52998224725" | "52998224725" | ✅ |
| `telefone` | "(91) 99876-5432" | "(91) 99876-5432" | ✅ |
| `whatsapp` | "(91) 99876-5432" | "(91) 99876-5432" | ✅ |
| `email` | "maria.silva@email.com" | "maria.silva@email.com" | ✅ |
| `endereco` | "Rua 15 de Novembro, 500" | conforme | ✅ |
| `bairro` | "Centro" | conforme | ✅ |
| `cidade` | "Tomé-Açu" | conforme | ✅ |
| `estado` | "PA" | conforme | ✅ |
| `igreja` | "AD Campo Marupaúba" | conforme | ✅ |
| `nome_pai` | "João Silva" | conforme | ✅ |
| `nome_mae` | "Maria Aparecida Silva" | conforme | ✅ |
| `created_at` | timestamp | `2026-06-12 00:38:15.160783+00` | ✅ |
| `updated_at` | = created_at | `2026-06-12 00:38:15.160783+00` | ✅ |

**Status:** ✅ **Aprovado**

### Teste 5 — Persistência completa (Tabela `criancas`)

| Campo | Esperado | Obtido | Status |
|-------|:--------:|:------:|:------:|
| `responsavel_id` | UUID do responsável | `eb664b2a-...` | ✅ |
| `nome` | "Pedro Henrique Silva" | conforme | ✅ |
| `data_nascimento` | "2018-05-10" | conforme | ✅ |
| `idade` | 8 | 8 | ✅ |
| `sexo` | "masculino" | conforme | ✅ |
| `serie_escolar` | "2º ano" | conforme | ✅ |
| `tamanho_camisa` | "M" | conforme | ✅ |
| `alergias` | "Amendoim e poeira" | conforme | ✅ |
| `medicamentos` | "Antialérgico periódico" | conforme | ✅ |
| `restricoes_alimentares` | "Sem derivados de amendoim" | conforme | ✅ |
| `emergencia_nome` | "Carlos Silva" | conforme | ✅ |
| `emergencia_telefone` | "(91) 99123-4567" | conforme | ✅ |
| `emergencia_parentesco` | "Tio" | conforme | ✅ |
| `autoriza_participacao` | true | true | ✅ |
| `autoriza_imagem` | true | true | ✅ |
| `confirma_veracidade` | true | true | ✅ |
| `turma` | null | null | ✅ |

**Status:** ✅ **Aprovado**

### Teste 6 — Persistência completa (Tabela `inscricoes`)

| Campo | Esperado | Obtido | Status |
|-------|:--------:|:------:|:------:|
| `crianca_id` | UUID da criança | `0ed904f5-...` | ✅ |
| `protocolo` | "EBF26-0ED904F5" | conforme | ✅ |
| `status` | "confirmada" | "confirmada" | ✅ |
| `data_inscricao` | timestamp | `2026-06-12 00:38:15.160783+00` | ✅ |

**Observação:** O `status` padrão é `'confirmada'` . O único registro com status diferente (`Cancelado`) é o registro de homologação anterior.

**Status:** ✅ **Aprovado**

---

## 3. Status Inicial

### Teste 7 — Verificação de status automático

| Cenário | Resultado |
|---------|-----------|
| Valor padrão na coluna `status` | `'confirmada'::text` |
| Status após criação via RPC | `"confirmada"` |
| Pode ser alterado? | Sim (admin pode atualizar via dashboard) |
| Exceções tratadas? | UNIQUE constraint em `protocolo` impede duplicatas |

**Status:** ✅ **Aprovado**

---

## 4. Recuperação dos Dados

### Teste 8 — Consulta por protocolo

| Parâmetro | Resultado Esperado | Resultado Obtido | Status |
|-----------|:------------------:|:----------------:|:------:|
| `EBF26-0ED904F5` | 1 registro | 1 registro (Pedro Henrique Silva) | ✅ |
| `EBF26-59347F34` | 1 registro | 1 registro (Lucas Costa) | ✅ |

**Status:** ✅ **Aprovado**

### Teste 9 — Consulta por CPF

| Parâmetro | Resultado Esperado | Resultado Obtido | Status |
|-----------|:------------------:|:----------------:|:------:|
| `529.982.247-25` (formatado) | 3 registros | 3 registros | ✅ |
| `52998224725` (sem formatação) | 3 registros | 3 registros | ✅ |

**Status:** ✅ **Aprovado**

### Teste 10 — Consulta por telefone

| Parâmetro | Resultado Esperado | Resultado Obtido | Status |
|-----------|:------------------:|:----------------:|:------:|
| Telefone sem formatação | 1 registro | 1 registro | ✅ |

**Observação:** A busca por telefone depende de o número estar armazenado sem formatação (apenas dígitos). A `consultar_inscricao` RPC usa `regexp_replace(r.telefone, '\D', '', 'g')` em ambos os lados, então funciona tanto com números mascarados quanto limpos.

**Status:** ✅ **Aprovado**

---

## 5. Integridade dos Dados

### Teste 11 — Verificações de integridade

| Verificação | Resultado | Status |
|-------------|-----------|:------:|
| CPFs duplicados em `responsaveis` | Nenhum (índice único respeitado) | ✅ |
| Protocolos duplicados em `inscricoes` | Nenhum (UNIQUE constraint respeitada) | ✅ |
| Órfãos: `criancas` sem `inscricoes` | Nenhum | ✅ |
| Órfãos: `criancas` sem `responsaveis` | Nenhum (FK `criancas_responsavel_id_fkey`) | ✅ |
| Caracteres especiais (acentos, ü) | "José Francisco Müller Filho", "Ana Júlia Müller" — armazenados corretamente | ✅ |
| Campos opcionais vazios | Antes: `''` (string vazia). Depois da correção: `NULL` | ✅ Corrigido |
| Crianças duplicadas (mesmo responsável + nome + DOB) | UNIQUE constraint `criancas_responsavel_nome_dn_unique` adicionada | ✅ Corrigido |

**Problema encontrado e corrigido:** Campos opcionais não preenchidos eram armazenados como `''`. A RPC `criar_inscricao` foi atualizada com `NULLIF(coluna, '')` em todos os campos opcionais. Agora são armazenados corretamente como `NULL`.

**Status:** ✅ **Corrigido**

---

## 6. Cenários de Erro

### Teste 12 — Tratamento de erros

| Cenário | Entrada | Resultado Esperado | Resultado Obtido | Status |
|---------|---------|:------------------:|:----------------:|:------:|
| CPF inválido (sequência) | `111.111.111-11` | ❌ Rejeitar | ❌ Rejeitou com `"CPF do responsável inválido."` | ✅ Corrigido |
| Campos obrigatórios vazios | `nome: ""`, `cpf: ""` | ❌ Rejeitar | ❌ Rejeitou com `"CPF do responsável é obrigatório."` | ✅ |
| Autorizações falsas | `participacao: false` | ❌ Rejeitar | ❌ Rejeitou com mensagem clara | ✅ |
| Rate limit (4ª inscrição mesmo CPF) | CPF já com 3 inscrições | ❌ Bloquear | ❌ Bloqueou com `"Limite de inscrições excedido."` | ✅ |
| Protocolo duplicado | `EBF26-0ED904F5` já existente | ❌ Rejeitar | ❌ Rejeitou com `duplicate key value` | ✅ |
| Rollback de transação | BEGIN + INSERT + ROLLBACK | Dados não persistidos | Dados não persistidos (verificado) | ✅ |

## Problema Crítico Encontrado e Corrigido

### CPF inválido `111.111.111-11` foi ACEITO (CORRIGIDO)

O RPC `criar_inscricao` **não validava o CPF**. A migration `20260611000000_validacao_servidor.sql` foi criada com a função `validar_cpf()` em plpgsql que:
- Rejeita sequências repetidas (`111.111.111-11`, `000.000.000-00`, etc.)
- Valida os dígitos verificadores (algoritmo módulo 11)

**Impacto (antes da correção):** Qualquer pessoa podia se inscrever com um CPF inválido.

**Correção aplicada:** A migration foi executada no banco de produção. O RPC `criar_inscricao` agora rejeita CPFs inválidos com a mensagem `"CPF do responsável inválido."`

---

## Resultados Consolidados

| # | Teste | Resultado |
|:--:|-------|:---------:|
| 1 | Inscrição completa | ✅ Aprovado |
| 2 | Inscrição mínima | ✅ Aprovado |
| 3 | Upsert mesmo CPF | ✅ Aprovado |
| 4 | Persistência `responsaveis` | ✅ Aprovado |
| 5 | Persistência `criancas` | ✅ Aprovado |
| 6 | Persistência `inscricoes` | ✅ Aprovado |
| 7 | Status inicial | ✅ Aprovado |
| 8 | Consulta por protocolo | ✅ Aprovado |
| 9 | Consulta por CPF | ✅ Aprovado |
| 10 | Consulta por telefone | ✅ Aprovado |
| 11 | Integridade dos dados | ✅ Aprovado |
| 12 | Cenários de erro (após correção) | ✅ Aprovado |

---

## Problemas Encontrados e Corrigidos

| # | Severidade | Descrição | Solução | Status |
|:-:|:----------:|-----------|---------|:------:|
| 1 | **Crítica** | `criar_inscricao` aceitava CPF inválido (`111.111.111-11`, `000.000.000-00`) | Migration `20260611000000_validacao_servidor.sql` aplicada com função `validar_cpf()` | ✅ Corrigido |
| 2 | **Média** | Campos opcionais vazios armazenados como `''` em vez de `NULL` | RPC atualizado com `NULLIF(coluna, '')` | ✅ Corrigido |
| 3 | **Média** | Sistema permitia mesma criança ser inscrita múltiplas vezes | UNIQUE constraint + função `verificar_inscricao_duplicada` + validação frontend | ✅ Corrigido |

---

## Correções Aplicadas

| # | Correção | Detalhes |
|:-:|----------|----------|
| 1 | **Validação de CPF no servidor** | Migration `20260611000000_validacao_servidor.sql` aplicada. Função `validar_cpf()` criada e integrada ao RPC `criar_inscricao`. Rejeita sequências repetidas e valida dígitos verificadores. |
| 2 | **NULLIF em campos opcionais** | RPC `criar_inscricao` atualizado com `NULLIF(coluna, '')` em todos os 20 campos opcionais das tabelas `responsaveis` e `criancas` |
| 3 | **Segurança do rate limit** | search_path corrigido na função `check_inscricao_rate_limit` (SECURITY DEFINER) |
| 4 | **Prevenção de duplicatas** | Migration `20260612004837_prevencao_duplicatas.sql`: UNIQUE constraint em `criancas(responsavel_id, nome, data_nascimento)`, função `verificar_inscricao_duplicada()`, RPC atualizado |
| 5 | **Frontend contra duplicatas** | Inscricao.tsx agora chama `verificar_inscricao_duplicada` antes de submeter |
| 6 | **Limpeza de dados de teste** | Todos os registros criados durante as auditorias foram removidos do banco de produção |

---

## Arquivos Alterados

| Arquivo | Descrição |
|---------|-----------|
| `AUDIT_PERSISTENCIA.md` | Este relatório |
| `supabase/migrations/20260611000000_validacao_servidor.sql` | Corrigido: variável `i` renomeada para `idx`/`pos` no `validar_cpf`; adicionado `NULLIF` em campos opcionais |
| `supabase/migrations/20260612004837_prevencao_duplicatas.sql` | **Criado**: UNIQUE constraint `criancas(responsavel_id, nome, data_nascimento)`, função `verificar_inscricao_duplicada()`, RPC atualizado |
| `src/integrations/supabase/types.ts` | **Modificado**: adicionado tipo `verificar_inscricao_duplicada` |

---

## Recomendações

1. **Adicionar testes unitários** em `pgTAP` para a função `validar_cpf()` (a extensão já está instalada no banco)
2. **Adicionar validação de CPF também no frontend** (já implementada na auditoria anterior via `src/lib/validators.ts`)
3. **Adicionar testes automatizados** de persistência no pipeline de CI/CD
4. **Monitorar a tabela `inscricao_rate_limits`** para identificar possíveis abusos
