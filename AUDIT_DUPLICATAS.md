# Auditoria de Prevenção de Duplicatas — `/inscricao`

**Projeto:** EBF 2026 Connect Hub  
**Data:** 12/06/2026  
**Analista:** opencode  

---

## 1. Diagnóstico da Situação Atual

### Proteções existentes antes da auditoria

| Mecanismo | Escopo | O que protege |
|-----------|--------|---------------|
| `UNIQUE INDEX responsaveis_cpf_idx` | `responsaveis.cpf` | Impede CPF duplicado na tabela de responsáveis |
| `UNIQUE CONSTRAINT inscricoes_protocolo_key` | `inscricoes.protocolo` | Impede protocolo duplicado (gerado a partir do UUID) |
| `check_inscricao_rate_limit` | 3 inscrições/CPF/60min | Rate limit, não prevenção de duplicidade |
| Nenhuma | `criancas` | ❌ **Nenhuma proteção contra mesma criança ser reinscrita** |

### Conclusão do diagnóstico

O sistema **não tinha qualquer proteção** contra a mesma criança ser cadastrada múltiplas vezes pelo mesmo responsável. A única barreira era o rate limit (3/CPF/hora), que não distingue crianças diferentes da mesma criança repetida.

---

## 2. Regra de Negócio Identificada

### Fluxo esperado para EBF

1. Um **responsável** (pai/mãe) pode inscrever **múltiplos filhos** (irmãos) — ✅ **PERMITIDO**
2. Uma **mesma criança** não pode ser inscrita **mais de uma vez** pelo mesmo responsável — ❌ **BLOQUEADO**
3. Uma criança pode ser inscrita por **responsáveis diferentes** (ex: pai e avó) — ⚠️ Caso raro, mas tecnicamente possível

### Chave de unicidade

A combinação que identifica unicamente uma criança no contexto de um responsável é:

```
(responsavel_id, nome, data_nascimento)
```

- `responsavel_id` — obtido via CPF único
- `nome` — nome completo da criança
- `data_nascimento` — evita homônimos

---

## 3. Recomendação Técnica

**Opção escolhida: C — Permitir somente em condições específicas**

| Opção | Descrição | Decisão |
|:-----:|-----------|:-------:|
| A | Bloquear completamente duplicidades | ❌ Impediria irmãos |
| B | Permitir múltiplas inscrições sem restrição | ❌ Mesma criança seria reinscrita |
| **C** | **Permitir múltiplas inscrições de crianças diferentes; bloquear mesma criança** | ✅ **Implementado** |

### Justificativa

A regra **C** atende ao caso de uso real da EBF:
- Pais com 2+ filhos precisam inscrever cada um (permitido)
- O mesmo filho não pode ser inscrito duas vezes (bloqueado)
- A chave `(responsavel_id, nome, data_nascimento)` é robusta contra homônimos

---

## 4. Correções Implementadas

### 4.1. Banco de Dados (Migration `prevencao_duplicatas`)

| Item | Descrição |
|------|-----------|
| **UNIQUE CONSTRAINT** | `criancas(responsavel_id, nome, data_nascimento)` — proteção a nível de banco |
| **Função `verificar_inscricao_duplicada`** | RPC pública que retorna `{duplicada: bool, protocolo?, status?}` |
| **RPC `criar_inscricao`** | Agora verifica duplicidade antes de inserir e rejeita com mensagem amigável |

### 4.2. Frontend (Inscricao.tsx)

| Item | Descrição |
|------|-----------|
| **Verificação pré-envio** | Antes de chamar `criar_inscricao`, chama `verificar_inscricao_duplicada` |
| **Mensagem amigável** | Exibe `"Esta criança já foi inscrita. Protocolo: EBF26-XXXX (Status: confirmada)"` |

### 4.3. Tipos TypeScript

- `types.ts` — adicionada definição `verificar_inscricao_duplicada`

---

## 5. Matriz de Testes

### 5.1. Cenários Antes da Correção

| # | Cenário | Entrada | Resultado Esperado | Resultado Obtido | Status |
|:-:|---------|---------|:------------------:|:----------------:|:------:|
| 1 | Mesmo CPF, criança diferente #1 | CPF válido, "João Irmão", 2017-05-10 | ✅ Permitir | ✅ Criou protocolo | ❌ **Falhou** |
| 1b | Mesmo CPF, criança diferente #2 (irmão) | CPF válido, "Maria Irmã", 2019-08-22 | ✅ Permitir | ✅ Criou protocolo | ✅ OK |
| 2 | Mesmo CPF, **mesma** criança | CPF válido, "João Irmão", 2017-05-10 | ❌ **Bloquear** | ✅ **ACEITOU (BUG)** | ❌ **Reprovado** |
| 3 | Responsável diferente, mesma criança | CPF diferente, "João Irmão", 2017-05-10 | ⚠️ Permitir (caso raro) | ✅ Permitiria | ✅ OK |

### 5.2. Cenários Depois da Correção

| # | Cenário | Entrada | Resultado Esperado | Resultado Obtido | Status |
|:-:|---------|---------|:------------------:|:----------------:|:------:|
| 1 | Mesmo CPF, criança diferente #1 | CPF `52998224725`, "João Irmão", 2017-05-10 | ✅ Permitir | ✅ `EBF26-D0121D04` | ✅ Aprovado |
| 1b | Mesmo CPF, criança diferente #2 (irmão) | CPF `52998224725`, "Maria Irmã", 2019-08-22 | ✅ Permitir | ✅ `EBF26-C24A344E` | ✅ Aprovado |
| 2 | Mesmo CPF, **mesma** criança | CPF `52998224725`, "João Irmão", 2017-05-10 | ❌ Bloquear | ❌ `"Esta criança já foi inscrita. Protocolo: EBF26-D0121D04"` | ✅ Aprovado |
| 3 | Função `verificar_inscricao_duplicada` (existente) | CPF + "João Irmão" + 2017-05-10 | `{duplicada: true, protocolo: ...}` | `{duplicada: true, protocolo: "EBF26-D0121D04"}` | ✅ Aprovado |
| 4 | Função `verificar_inscricao_duplicada` (inexistente) | CPF + "X" + 2020-01-01 | `{duplicada: false}` | `{duplicada: false}` | ✅ Aprovado |
| 5 | Função `verificar_inscricao_duplicada` (CPF novo) | CPF inexistente + "X" + 2020-01-01 | `{duplicada: false}` | `{duplicada: false}` | ✅ Aprovado |
| 6 | Inserção direta (bypass RPC) | INSERT com mesmos valores | ❌ Bloquear (UNIQUE) | ❌ `duplicate key value` | ✅ Aprovado |

---

## 6. Arquivos Modificados

| Arquivo | Tipo | Descrição |
|---------|:----:|-----------|
| `src/routes/inscricao.tsx` | Modificado | Adicionada verificação de duplicidade antes do envio |
| `src/integrations/supabase/types.ts` | Modificado | Adicionado tipo `verificar_inscricao_duplicada` |
| `supabase/migrations/20260612000000_prevencao_duplicatas.sql` | Criado | UNIQUE constraint, função de verificação, RPC atualizado |
| `AUDIT_DUPLICATAS.md` | Criado | Este relatório |

---

## 7. Fluxo de Decisão Implementado

```mermaid
graph TD
    A[Usuário preenche formulário] --> B{Clica "Finalizar"}
    B --> C[Validações locais]
    C -->|Erro| D[Exibe erro no campo]
    C -->|OK| E[Chama verificar_inscricao_duplicada]
    E -->|Duplicada| F[Toast: "Já inscrita. Protocolo: XXX"]
    E -->|Não duplicada| G[Chama criar_inscricao]
    G -->|UNIQUE violada| H[Erro servidor]
    G -->|OK| I[Redireciona para sucesso]
```

---

## 8. Mensagens para o Usuário

| Contexto | Mensagem |
|----------|----------|
| Duplicata detectada (frontend) | `"Esta criança já foi inscrita. Protocolo: {protocolo} (Status: {status})"` |
| Duplicata detectada (servidor) | `"Esta criança já foi inscrita. Protocolo existente: {protocolo} (Status: {status})"` |
| Inscrição de siblings | ✅ Permitido sem mensagem de erro |

---

## Checklist Final

| Item | Status |
|------|:------:|
| Diagnóstico da situação atual | ✅ OK |
| Regra de negócio identificada | ✅ OK |
| Recomendação técnica (Opção C) | ✅ Implementada |
| UNIQUE constraint no banco | ✅ Aplicada |
| Função RPC de verificação | ✅ Criada |
| Validação no frontend | ✅ Implementada |
| Mensagens amigáveis | ✅ Implementadas |
| Testes de siblings (irmãos) | ✅ Aprovado |
| Teste de mesma criança | ✅ Aprovado |
| Teste de bypass RPC | ✅ Aprovado |
| Teste de CPF inexistente | ✅ Aprovado |
| Limpeza de dados de teste | ✅ Realizada |
