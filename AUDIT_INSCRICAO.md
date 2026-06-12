# Auditoria Técnica — Rota `/inscricao`

**Projeto:** EBF 2026 Connect Hub  
**Data da auditoria:** 11/06/2026  
**Analista:** opencode  
**Escopo:** Rota pública `/inscricao` — formulário de inscrição em 6 etapas

---

## Sumário Executivo

A rota `/inscricao` é funcional, mas apresentava ausência total de validações no frontend e validações insuficientes no backend. As correções implementadas adicionaram:

- Máscaras de CPF e telefone com validação em tempo real
- Algoritmo de validação de CPF (dígitos verificadores + rejeição de sequências)
- Validação de telefone (mínimo/máximo de dígitos)
- Validação de idade (0–12 anos) com data mínima/máxima no campo
- Mensagens de erro padronizadas e específicas por campo
- Validação CPF, telefone e idade também no servidor (RPC + migration)
- Prevenção de inscrições duplicadas (UNIQUE constraint + RPC + frontend)

---

## 1. Campos Obrigatórios

### Situação encontrada

| Etapa | Campo | Obrigatório? | Validação encontrada | Status |
|-------|-------|:---:|---|---|
| Responsável | nome | Sim | Apenas não-vazio (`!r.nome`) | ❌ Falha |
| Responsável | cpf | Sim | Apenas não-vazio (`!r.cpf`) | ❌ Falha |
| Responsável | telefone | Sim | Apenas não-vazio (`!r.telefone`) | ❌ Falha |
| Criança | nome | Sim | Apenas não-vazio (`!c.nome`) | ✅ OK |
| Criança | data_nascimento | Sim | Apenas não-vazio (`!c.data_nascimento`) | ❌ Falha |
| Criança | sexo | Sim | Apenas não-vazio (`!c.sexo`) | ✅ OK |
| Emergência | nome | Sim | Apenas não-vazio (`!e.nome`) | ✅ OK |
| Emergência | telefone | Sim | Apenas não-vazio (`!e.telefone`) | ❌ Falha |
| Autorizações | participacao | Sim | Apenas boolean check | ✅ OK |
| Autorizações | veracidade | Sim | Apenas boolean check | ✅ OK |

### Problemas identificados

1. **CPF sem validação de formato/dígito** — qualquer texto não-vazio passava
2. **Telefone sem validação de dígitos** — "abc" passava como válido
3. **Data de nascimento sem validação de idade** — data futura ou criança com 99 anos passava
4. **Server-side não validava CPF, telefone e idade** — apenas checava se campos estavam preenchidos

### Correções aplicadas

- **`src/lib/validators.ts`** — funções `isValidCPF()`, `isValidPhone()`, `isValidIdade()`, `isValidDate()`
- **`src/routes/inscricao.tsx`** — `validate()` agora valida CPF, telefone e idade com algoritmos reais; exibe mensagens específicas por campo
- **`supabase/migrations/20260611000000_validacao_servidor.sql`** — RPC `criar_inscricao` agora valida CPF, telefone (10-11 dígitos) e idade (0-12) no servidor

**Status:** ✅ Corrigido

---

## 2. Máscaras

### Situação encontrada

Nenhum campo possuía máscara de entrada. Os placeholders existiam apenas como dica visual:

| Campo | Placeholder | Máscara real | Status |
|-------|:---:|:---:|:---:|
| CPF | `000.000.000-00` | ❌ Ausente | ❌ Falha |
| Telefone (responsável) | — | ❌ Ausente | ❌ Falha |
| Telefone (emergência) | — | ❌ Ausente | ❌ Falha |
| WhatsApp | — | ❌ Ausente | ❌ Falha |
| CEP | — | N/A (campo inexistente) | ❌ Ausente |
| Data de nascimento | — | `type="date"` (navegador) | ✅ OK |

### Problemas identificados

1. CPF sem formatação durante digitação — usuário podia digitar qualquer formato inconsistente
2. Telefone sem formatação — aceitava números sem parenteses/espaço/hífen de forma inconsistente
3. **Campo CEP não existe no formulário** — não há campo de CEP na base de dados nem no frontend

### Correções aplicadas

- **`src/lib/validators.ts`** — funções `formatCPF()` e `formatPhone()` aplicam máscara durante a digitação
  - CPF: `000.000.000-00` com `maxLength={14}`
  - Telefone: `(00) 00000-0000` com `maxLength={16}`
- **`src/routes/inscricao.tsx`** — todos os inputs de CPF e telefone usam as funções de máscara no `onChange`
- CPF limpo (sem máscara) é enviado ao servidor via `stripNonDigits()` no `submit()`

**Status:** ✅ Corrigido (CEP não existe — recomendação de adição)

---

## 3. Validação de CPF

### Situação encontrada

- **Frontend:** ✅ Nenhuma validação de CPF existia
- **Backend:** ✅ O CPF era apenas limpado de não-dígitos e verificado se não-vazio
- **Banco:** índice único em `cpf` (prevenia duplicatas, mas não validava)

### Problemas identificados

1. CPFs como `111.111.111-11`, `000.000.000-00` ou `123.456.789-00` eram aceitos
2. Qualquer string de 11 dígitos passava
3. Usuário não recebia feedback de que o CPF era inválido

### Correções aplicadas

- **`src/lib/validators.ts`** — implementação completa do algoritmo de dígitos verificadores do CPF:
  - Verifica 11 dígitos
  - Rejeita sequências repetidas (111.111.111-11, 222.222.222-22, etc.)
  - Calcula e valida os 2 dígitos verificadores (módulo 11)
- **`src/routes/inscricao.tsx`** — validação no clique de "Próximo" + validação no `onBlur` + máscara em tempo real
- **`supabase/migrations/20260611000000_validacao_servidor.sql`** — função `validar_cpf()` em plpgsql com o mesmo algoritmo, chamada dentro do RPC `criar_inscricao`

**Status:** ✅ Corrigido

---

## 4. Validação de Telefone

### Situação encontrada

- **Frontend:** Nenhuma validação de formato ou quantidade de dígitos
- **Backend:** Nenhuma validação de formato ou quantidade de dígitos

### Problemas identificados

1. Qualquer valor (inclusive vazio ou "abc") era aceito
2. Telefones com 8 ou 9 dígitos (incompletos) não eram rejeitados
3. Sem padronização de formato de armazenamento

### Correções aplicadas

- **`src/lib/validators.ts`** — `isValidPhone()` exige 10 ou 11 dígitos após limpeza
- **`src/routes/inscricao.tsx`** — máscara `(00) 00000-0000` em tempo real + validação no `onBlur`
- **`supabase/migrations/20260611000000_validacao_servidor.sql`** — servidor valida `length(regexp_replace(telefone, '\D', '', 'g')) IN (10, 11)`

**Status:** ✅ Corrigido

---

## 5. Validação de Idade

### Situação encontrada

- **Frontend:** Idade era calculada automaticamente no `onChange` da data de nascimento, mas o campo idade era **editável** e SEM VALIDAÇÃO
- **Backend:** Nenhuma validação de idade — qualquer valor inteiro era aceito

### Problemas identificados

1. Criança com 99 anos era aceita (data futura ou manualmente editada)
2. Criança com -1 ano era aceita
3. O campo idade podia ser sobrescrito manualmente para qualquer valor
4. Data de nascimento futura era aceita

### Correções aplicadas

- **`src/lib/validators.ts`** — `calcIdade()` retorna `null` para datas inválidas; `isValidIdade()` rejeita idades < 0 ou > 12; `getMinDate()` retorna 12 anos atrás; `getMaxDate()` retorna hoje
- **`src/routes/inscricao.tsx`** — campo idade agora é `disabled` (apenas leitura), calculado automaticamente; input `date` tem `min` e `max` para prevenir datas inválidas no navegador
- **`supabase/migrations/20260611000000_validacao_servidor.sql`** — servidor valida `v_idade BETWEEN 0 AND 12`

**Status:** ✅ Corrigido

---

## 6. Responsável Legal

### Situação encontrada

O conceito de "responsável legal" não existe como entidade separada. O formulário coleta:

| Campo | Função |
|-------|--------|
| `nome_pai` | Nome do pai da criança (texto livre) |
| `nome_mae` | Nome da mãe da criança (texto livre) |
| Dados do "Responsável" | Pessoa que realiza a inscrição (não necessariamente o responsável legal) |

### Problemas identificados

1. **Não há um campo de "responsável legal" distinto do "responsável pela inscrição"**
2. **Não há validação de obrigatoriedade de responsável legal** — por exemplo, se a criança é menor de idade (todas são, já que EBF é para 0-12 anos), os dados do responsável legal deveriam ser validados de forma distinta
3. **Não há campo para documento do responsável legal** (RG, certidão de nascimento, termo de guarda)
4. `nome_pai` e `nome_mae` são opcionais e não validados

### Recomendações

- Adicionar pergunta "O responsável pela inscrição é o responsável legal da criança?"
- Se não, exibir campos adicionais para dados do responsável legal (nome, CPF, parentesco, documento)
- Tornar `nome_pai` e/ou `nome_mae` obrigatórios, ou substituir por um campo "Responsável legal" único
- Considerar adicionar campo "Tipo de documento" + "Número do documento" com upload

**Status:** ⚠️ Parcial — estrutura atual atende o mínimo, mas carece de distinção entre "responsável pela inscrição" e "responsável legal". Melhorias recomendadas.

---

## 7. Upload de Documentos

### Situação encontrada

**Não existe funcionalidade de upload de documentos** em nenhuma parte do sistema.

### Problemas identificados

1. Ausência total de upload de documentos (RG, certidão de nascimento, comprovante de residência, etc.)
2. Nenhuma infraestrutura para armazenamento de arquivos (sem bucket no Supabase Storage)
3. Nenhuma validação de tipos permitidos, tamanho máximo ou tratamento de erros

### Recomendações

- Criar bucket `documentos` no Supabase Storage com políticas RLS adequadas
- Adicionar campo de upload de documento do responsável legal (RG ou certidão de nascimento da criança)
- Validar tipos: `application/pdf`, `image/jpeg`, `image/png`
- Validar tamanho máximo: 5 MB
- Exibir progresso de upload e mensagens de erro claras

**Status:** ❌ Ausente — funcionalidade não implementada

---

## 8. Prevenção de Inscrições Duplicadas

### Situação encontrada

O sistema **não tinha qualquer proteção** contra a mesma criança ser cadastrada múltiplas vezes pelo mesmo responsável. A única barreira era o rate limit (3/CPF/hora), que não distingue crianças diferentes da mesma criança repetida.

### Problemas identificados

1. Mesmo responsável podia inscrever a **mesma criança** infinitas vezes (respeitando apenas o rate limit)
2. Não havia UNIQUE constraint na tabela `criancas` para impedir duplicatas
3. Usuário não recebia aviso de que a criança já estava inscrita
4. Não havia função RPC para verificar duplicidade antes do envio

### Regra de negócio definida (Opção C)

| Cenário | Comportamento |
|---------|--------------|
| Mesmo CPF + criança diferente (irmãos) | ✅ **Permitido** |
| Mesmo CPF + mesma criança (nome + DOB) | ❌ **Bloqueado** |
| Responsável diferente + mesma criança | ⚠️ Permitido (caso raro) |

### Correções aplicadas

- **Banco:** UNIQUE constraint `criancas(responsavel_id, nome, data_nascimento)` — proteção a nível de banco
- **Função `verificar_inscricao_duplicada`:** RPC pública que retorna `{duplicada: bool, protocolo?, status?}`
- **RPC `criar_inscricao`:** Verifica duplicidade antes de inserir com mensagem amigável
- **Frontend:** Antes de enviar, chama `verificar_inscricao_duplicada` e exibe toast com protocolo existente

### Mensagens para o usuário

| Contexto | Mensagem |
|----------|----------|
| Duplicata detectada (frontend) | `"Esta criança já foi inscrita. Protocolo: {protocolo} (Status: {status})"` |
| Duplicata detectada (servidor) | `"Esta criança já foi inscrita. Protocolo existente: {protocolo} (Status: {status})"` |

**Status:** ✅ Corrigido

---

## 9. Mensagens de Erro

### Situação encontrada

As mensagens de erro eram genéricas e limitadas:

| Uso | Mensagem original | Problema |
|-----|------------------|----------|
| Validação geral | `"Preencha nome, CPF e telefone do responsável."` | Não especifica qual campo |
| Erro do servidor | `"Erro ao enviar: " + error.message` | Expõe mensagem técnica do banco |
| Anti-bot | `"Formulário enviado muito rápido. Aguarde alguns segundos."` | ✅ OK |
| Honeypot | `"Erro de segurança. Tente novamente."` | ✅ OK |
| Turnstile | `"Complete a verificação de segurança."` | ✅ OK |

### Correções aplicadas

- **`src/lib/validators.ts`** — centralizadas em objeto `MSG`:
  - Mensagens específicas por campo (ex: `"CPF inválido. Verifique os dígitos."`)
  - Função `campoObrigatorio(nome)` para padronização
- **`src/routes/inscricao.tsx`** — validação agora produz erros específicos exibidos abaixo de cada campo (via componente `Field` com prop `error`)
- Mensagens mais amigáveis (ex: `"A criança deve ter entre 0 e 12 anos para participar da EBF."`)
- Padronização com caixa alta inicial e ponto final em todas as mensagens

**Status:** ✅ Corrigido

---

## Arquivos Modificados

| Arquivo | Tipo de alteração | Descrição |
|---------|:---:|---|
| `src/lib/validators.ts` | **Criado** | Funções de validação: CPF, telefone, idade, máscaras, constantes de mensagens |
| `src/routes/inscricao.tsx` | **Modificado** | Adicionadas máscaras, validação por campo, exibição de erros, campo idade bloqueado, data com min/max |
| `supabase/migrations/20260611000000_validacao_servidor.sql` | **Criado** | Função `validar_cpf()`, RPC `criar_inscricao` com validação de CPF/telefone/idade, `check_inscricao_rate_limit` com search_path fixo |
| `supabase/migrations/20260612004837_prevencao_duplicatas.sql` | **Criado** | UNIQUE constraint `criancas(responsavel_id, nome, data_nascimento)`, função `verificar_inscricao_duplicada()`, RPC atualizado com verificação de duplicidade |
| `src/routes/inscricao.tsx` | **Modificado** | Adicionada verificação de duplicidade (`verificar_inscricao_duplicada`) antes do envio |
| `src/integrations/supabase/types.ts` | **Modificado** | Adicionado tipo `verificar_inscricao_duplicada` |

---

## Checklist Final

| Item | Subitem | Status |
|------|---------|:------:|
| **1. Campos obrigatórios** | | |
| | Mapeamento completo dos campos | ✅ OK |
| | Sistema impede envio com campos vazios | ✅ Corrigido |
| | Inconsistências corrigidas | ✅ Corrigido |
| **2. Máscaras** | | |
| | CPF (`000.000.000-00`) | ✅ Corrigido |
| | Telefone (`(00) 00000-0000`) | ✅ Corrigido |
| | WhatsApp (`(00) 00000-0000`) | ✅ Corrigido |
| | CEP | ❌ Ausente (campo não existe no formulário) |
| | Data de nascimento | ✅ OK (`type="date"`) |
| | Máscara não impede persistência correta | ✅ Corrigido (CPF limpo enviado ao servidor) |
| **3. Validação de CPF** | | |
| | Algoritmo de dígitos verificadores | ✅ Corrigido |
| | Rejeita CPFs inválidos | ✅ Corrigido |
| | Rejeita sequências (111.111.111-11, etc.) | ✅ Corrigido |
| | Mensagem clara ao usuário | ✅ Corrigido |
| **4. Validação de telefone** | | |
| | Mínimo/máximo de dígitos (10-11) | ✅ Corrigido |
| | Aceita formatos mascarados e não mascarados | ✅ Corrigido |
| | Exibe erro quando inválido | ✅ Corrigido |
| **5. Validação de idade** | | |
| | Cálculo usando data atual | ✅ Corrigido |
| | Regras de negócio respeitadas (0-12 anos) | ✅ Corrigido |
| | Limites mínimo e máximo validados | ✅ Corrigido |
| **6. Responsável legal** | | |
| | Identificação quando exige responsável | ⚠️ Pendente |
| | Obrigatoriedade dos dados do responsável | ⚠️ Parcial |
| | Validações consistentes | ⚠️ Parcial |
| **7. Upload de documentos** | | |
| | Identificar se existe upload | ✅ OK (não existe) |
| | Tipos permitidos | ❌ Ausente |
| | Tamanho máximo | ❌ Ausente |
| | Armazenamento | ❌ Ausente |
| | Tratamento de erro | ❌ Ausente |
| **8. Prevenção de duplicatas** | | |
| | UNIQUE constraint no banco | ✅ Corrigido |
| | Função RPC de verificação | ✅ Corrigido |
| | Validação no frontend | ✅ Corrigido |
| | Mensagem amigável para o usuário | ✅ Corrigido |
| | Irmãos (diferentes crianças) permitidos | ✅ Corrigido |
| | Mesma criança bloqueada | ✅ Corrigido |
| **9. Mensagens de erro** | | |
| | Revisão de todas as mensagens | ✅ Corrigido |
| | Mensagens claras e amigáveis | ✅ Corrigido |
| | Textos padronizados | ✅ Corrigido

---

## Legenda

| Símbolo | Significado |
|:-------:|-------------|
| ✅ OK | Funcionando corretamente |
| ✅ Corrigido | Falha identificada e corrigida nesta auditoria |
| ⚠️ Parcial | Funciona parcialmente, mas com limitações |
| ⚠️ Pendente | Identificado como necessário, mas não implementado |
| ❌ Ausente | Funcionalidade não existe |
| ❌ Falha | Não funcionava antes da correção |

---

## Recomendações (Baixa Prioridade)

1. **Adicionar campo CEP** ao formulário e à tabela `responsaveis` (com busca automática de endereço via ViaCEP)
2. **Upload de documentos** — criar bucket no Supabase Storage para RG/certidão de nascimento
3. **Campo "responsável legal"** — distinguir entre quem preenche e quem é legalmente responsável pela criança
4. **Testes automatizados** — implementar testes unitários para `validators.ts` e testes E2E para o fluxo completo
5. **Máscara de data de nascimento** — considerar input mascara `dd/mm/aaaa` além do `type="date"` para maior compatibilidade entre navegadores
6. **Select de estado** — substituir input texto por `<select>` com lista de UFs
7. **Select de cidade** — integrar com IBGE API ou lista fixa de cidades do Pará (já que igreja é em Tomé-Açu)

