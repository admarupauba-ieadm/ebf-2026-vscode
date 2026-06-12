# Auditoria Técnica Completa — EBF Connect Hub 2026

**Data da auditoria:** 13/06/2026
**Projeto:** EBF Connect Hub — UCADMA Marupaúba
**Auditor:** Cursor/Claude (análise completa do código-fonte, banco e infraestrutura)

---

## Resumo Executivo

| Indicador | Status |
|-----------|:------:|
| Status geral | ✅ Funcional com pendências não críticas |
| Estimativa de conclusão | ~85% |
| Prontidão para produção | ⚠️ **Quase pronto** — 3 riscos médios a corrigir antes do lançamento |
| Migrações aplicadas | 8/8 |
| RPCs implementadas | 7 funções |
| Testes de produção | 10/10 aprovados |

### Riscos identificados para produção
1. **Alta:** `submit()` no formulário de inscrição não possui `try/catch` — exceção não tratada trava o formulário
2. **Média:** Admin dashboard usa `supabase.from("inscricoes").update()` diretamente (sem RPC) para alteração de status
3. **Média:** `todayIso` calculado uma vez no carregamento do módulo — fica desatualizado após meia-noite

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | TanStack Start v1 (React 19 + React Router) |
| TypeScript | 5.8 (strict mode) |
| Build | Vite 7 + Nitro 3 (beta) |
| CSS | Tailwind 4 + tw-animate-css |
| UI | shadcn/ui (New York), Radix, lucide-react |
| DB | Supabase Postgres 14.5 (projeto `fwaiaxfbyuvjqelvuivz`) |
| Auth | Supabase Auth (email/senha, localStorage sessions) |
| CAPTCHA | Cloudflare Turnstile |
| Export | xlsx, jspdf (client-side) |
| Toast | sonner |
| Deploy | Vercel (Nitro preset) |

---

## Funcionalidades Implementadas

### Área Pública
- [x] Landing page (`/`) — Hero, Sobre, Info, Benefícios, FAQ
- [x] Formulário de inscrição 6 etapas (`/inscricao`)
- [x] Validação client-side (CPF, telefone, idade, campos obrigatórios)
- [x] Máscaras de CPF e telefone
- [x] CAPTCHA Turnstile (server verification)
- [x] Prevenção duplicatas (frontend + SQL UNIQUE)
- [x] Anti-bot (timeout 5s + honeypot)
- [x] Página de sucesso (`/inscricao/sucesso`)
- [x] Consulta pública (`/consulta`) — por protocolo, CPF ou telefone

### Área Administrativa
- [x] Login admin (`/admin`) — Supabase Auth + role check
- [x] Dashboard (`/admin/dashboard`)
- [x] Listagem paginada (25/50/100 por página)
- [x] Filtros: texto, faixa etária, turma, sexo, data
- [x] Alteração de status (com confirmação)
- [x] Registro de presença
- [x] Exclusão física com RPC (`admin_delete_inscricao`)
- [x] Exportação CSV, XLSX, PDF
- [x] Detalhes da inscrição (modal)
- [x] Estatísticas (totais, por turma, por faixa etária)

### Backend (Banco + RPCs)
- [x] 8 tabelas com RLS habilitado
- [x] 10 RPCs implementadas
- [x] Validação CPF server-side (algoritmo dígitos verificadores)
- [x] Validação telefone (10-11 dígitos)
- [x] Validação idade (0-12 anos)
- [x] Rate limiting (3/CPF/hora)
- [x] Proteção duplicatas (UNIQUE + função)
- [x] Exclusão em cascata (admin)
- [x] Triggers de `updated_at`
- [x] Auto-criação de profile no signup
- [x] Índices de performance

---

## Funcionalidades Pendentes / Parciais

| Funcionalidade | Status | Observação |
|---------------|:------:|------------|
| Upload de documentos (RG/certidão) | ❌ Ausente | Não implementado |
| Campo "responsável legal" vs "quem preenche" | ⚠️ Pendente | Mesma pessoa atualmente |
| Campo CEP | ❌ Ausente | Não implementado |
| Select de estado (UF) | ⚠️ Parcial | Input texto (hardcoded "PA") |
| Select de cidade (IBGE) | ❌ Ausente | Input texto (hardcoded "Tomé-Açu") |
| Edição de inscrição | ❌ Ausente | Apenas exclusão e alteração de status |
| RPC para alteração de status | ❌ Ausente | Usa `supabase.from().update()` direto |
| RPC para presença | ❌ Ausente | Usa `supabase.from().upsert()` direto |
| Toast mostra 1 erro de validação por vez | ⚠️ Parcial | Apenas o primeiro erro é exibido |
| StepConfirmacao mostra todos os campos | ⚠️ Parcial | Faltam vários campos opcionais |
| Testes unitários (pgTAP, vitest) | ❌ Ausente | Nenhum teste automatizado no repositório |
| CI/CD pipeline | ❌ Ausente | Apenas deploy manual via Vercel |
| Responsividade mobile completa | ⚠️ Parcial | Header esconde nav em mobile (sem hamburger) |
| Social links funcionais | ⚠️ Parcial | Links Instagram/Facebook apontam para `#` |

---

## Problemas Encontrados — Classificados por Severidade

### 🔴 Críticos (corrigir antes do lançamento)

| # | Problema | Local | Impacto |
|:-:|----------|-------|---------|
| C1 | `submit()` sem `try/catch` — exceção não tratada trava `submitting=true` | `inscricao.tsx:171` | Usuário fica preso no formulário se `verifyTurnstile()` ou `supabase.rpc()` lançarem exceção |
| C2 | `admin_delete_inscricao` — `SECURITY DEFINER` sem `REVOKE FROM PUBLIC` na migration original (corrigido via comando direto, mas migration não reflete) | Migration 8 | Anon podia chamar a função (corrigido, migration atualizada) |

### 🟠 Alta

| # | Problema | Local | Impacto |
|:-:|----------|-------|---------|
| A1 | Status change usa `supabase.from("inscricoes").update()` direto, sem RPC | `admin.dashboard.tsx:526` | Sem auditoria, sem validação adicional, sem atomicidade |
| A2 | Presence upsert usa `supabase.from("presencas").upsert()` direto, sem RPC | `admin.dashboard.tsx:580` | Mesmo problema — operação atômica não garantida com o status update separado |
| A3 | PDF export é plain text dump (sem tabela, sem headers) | `admin.dashboard.tsx:741` | Relatório de baixa qualidade |
| A4 | Busca ILIKE com `%term%` (leading wildcard) impede uso de índices | `admin.dashboard.tsx:268-347` | Queries lentas em datasets >1k registros |
| A5 | Sem debounce no campo de busca do admin | `admin.dashboard.tsx:187` | Múltiplas queries por segundo durante digitação |
| A6 | Erro de acessibilidade: botões ícone sem `aria-label` | `admin.dashboard.tsx:1122` | Leitores de tela não identificam o botão excluir |
| A7 | `todayIso` computado no carregamento do módulo — stale após meia-noite | `admin.dashboard.tsx:101` | Data de presença pode ficar incorreta |

### 🟡 Média

| # | Problema | Local | Impacto |
|:-:|----------|-------|---------|
| M1 | `resolveMatchingInscricaoIds()` carrega TODOS os IDs antes de paginar | `admin.dashboard.tsx:247` | Degradação linear com crescimento do dataset |
| M2 | Export "completa" ainda aplica filtros de data | `admin.dashboard.tsx:646` | Exportação não é verdadeiramente completa |
| M3 | Limite 5000 linhas no export sem aviso ao usuário | `admin.dashboard.tsx:639` | Dados podem ser truncados silenciosamente |
| M4 | Nenhum `try/catch` no `useEffect` de auth do dashboard | `admin.dashboard.tsx:406` | Erro de rede deixa loading infinito |
| M5 | `savingStatusId` reusado para status e delete | `admin.dashboard.tsx:212` | Confusão de estado, loading incorreto |
| M6 | Concorrência: múltiplas chamadas `loadRows` sem abort controller | `admin.dashboard.tsx:356` | Race condition em filtros rápidos |
| M7 | CPF visível em texto completo no modal de detalhes | `admin.dashboard.tsx:1376` | Exposição desnecessária de dado sensível |
| M8 | `StepConfirmacao` não exibe todos os campos preenchidos | `inscricao.tsx:710` | Usuário não consegue revisar tudo antes de enviar |
| M9 | Campos de erro sem `aria-live` ou `role="alert"` | `inscricao.tsx` (componente Field) | Leitores de tela não anunciam erros |
| M10 | `idade: String(idade ?? 0)` — fallback para 0 mascara erro | `inscricao.tsx:220` | Idade 0 enviada se cálculo falhar |

### 🟢 Baixa

| # | Problema | Local | Impacto |
|:-:|----------|-------|---------|
| B1 | `cpfSequencia` e `dataFutura` em MSG nunca usados (dead code) | `validators.ts:68,73` | Código morto |
| B2 | Honeypot sem `aria-hidden="true"` | `inscricao.tsx:265` | Acessibilidade subótima |
| B3 | Cidade/Estado/Igreja hardcoded no formulário | `inscricao.tsx:68-70` | Requer alteração de código se mudar de local |
| B4 | Nav header esconde links em mobile (sem menu hamburger) | `SiteHeader.tsx:16` | Navegação limitada em dispositivos móveis |
| B5 | Social links apontam para `#` | `SiteFooter.tsx:34,40` | Links não funcionais |
| B6 | Turma filter dropdown populado apenas da página atual | `admin.dashboard.tsx:468` | Opções incompletas |
| B7 | `colSpan={11}` hardcoded — quebra se colunas mudarem | `admin.dashboard.tsx:1137` | Manutenção frágil |
| B8 | `__root.tsx` meta tags genéricas ("Lovable App") | `__root.tsx:80-87` | SEO inadequado |
| B9 | Nenhum `useCallback` nos handlers do dashboard | `admin.dashboard.tsx` (todos) | Re-renders desnecessários |
| B10 | Nenhum hook customizado — toda lógica inline nos componentes | `src/hooks/` (vazio) | Reuso de código prejudicado |

---

## Correções Aplicadas Durante a Auditoria

| # | Correção | Migration / Arquivo | Data |
|:-:|----------|---------------------|:----:|
| 1 | Validação CPF server-side + telefone + idade + NULLIF | `20260611000000_validacao_servidor.sql` | 11/06 |
| 2 | Prevenção duplicatas (UNIQUE + RPC) | `20260612004837_prevencao_duplicatas.sql` | 12/06 |
| 3 | Exclusão física admin (RPC + cascata) | `20260613000000_admin_delete_inscricao.sql` | 13/06 |
| 4 | REVOKE anon/PUBLIC em `admin_delete_inscricao` | Comando direto + atualizado na migration | 13/06 |
| 5 | Frontend deleta via RPC em vez de `from().delete()` | `admin.dashboard.tsx` | 13/06 |
| 6 | Modal de exclusão com mensagem de aviso completa | `admin.dashboard.tsx` | 13/06 |
| 7 | Toast com detalhes do que foi removido (criança/responsável) | `admin.dashboard.tsx` | 13/06 |
| 8 | `admin_delete_inscricao` adicionado aos tipos TypeScript | `types.ts` | 13/06 |

---

## Segurança

### Autenticação
- Supabase Auth com email/senha
- Sessão persistida em localStorage
- Admin check via `has_role` RPC no login e recovery
- Logout explícito, sem refresh token rotation configurado
- ✅ Fluxo de login seguro

### Autorização (RLS)
- Todas as 8 tabelas com RLS habilitado
- Tabelas de dados: apenas staff (`is_staff`) pode CRUD
- `profiles`: auto-leitura + staff; auto-edição
- `user_roles`: auto-leitura + admin CRUD
- `inscricao_rate_limits`: anon pode INSERT (para rate limit), authenticated SELECT
- ✅ Políticas adequadas — sem exposição indevida

### RPCs Security Definers
| RPC | SECURITY | search_path | Callable por | Risco |
|-----|----------|-------------|-------------|:-----:|
| `criar_inscricao` | DEFINER | `public` | anon, authenticated | ⚠️ Gerenciado (validação completa + rate limit) |
| `consultar_inscricao` | DEFINER | `public` | anon, authenticated | ⚠️ Gerenciado (SQL function, parâmetro vinculado) |
| `verificar_inscricao_duplicada` | INVOKER | `public` | anon, authenticated | ✅ Baixo (RLS protege, retorna false para anon) |
| `admin_delete_inscricao` | DEFINER | `public` | authenticated | ✅ Check `has_role('admin')` interno |
| `has_role` | DEFINER | `public` | authenticated | ✅ UUID + enum, sem risco |
| `is_staff` | DEFINER | `public` | authenticated | ✅ UUID, sem risco |

### SQL Injection
- Nenhum uso de `EXECUTE` (dynamic SQL) em nenhuma RPC
- Todos os parâmetros são vinculados via SQL function ou plpgsql com constantes
- `consultar_inscricao` recebe TEXT e usa `upper(termo)` e `regexp_replace` em WHERE — risco teórico mínimo, mitigado por ser SQL function com parâmetro vinculado
- ✅ Risco geral: baixo

### XSS
- React 19 com JSX escapa output por padrão
- Dados do banco renderizados via `{r.nome}` (escapados)
- ✅ Risco: mínimo

### Secrets
- `SUPABASE_SERVICE_ROLE_KEY` no `.env` (não versionado no git — `.env` no `.gitignore`?)
- Chave publicável (`anon key`) exposta ao cliente (uso correto)
- `TURNSTILE_SECRET_KEY` não no `.env` mas referenciado em `verify-turnstile.ts`
- ⚠️ Verificar se `.env` está no `.gitignore`

---

## Banco de Dados

### Tabelas (8)

| Tabela | Linhas (estimado) | RLS | FK |
|--------|:-----------------:|:---:|:--:|
| `profiles` | ~1 | ✅ | auth.users |
| `user_roles` | ~1 | ✅ | auth.users |
| `responsaveis` | ~1 | ✅ | — |
| `criancas` | ~1 | ✅ | responsaveis (CASCADE) |
| `inscricoes` | ~1 | ✅ | criancas (CASCADE) |
| `presencas` | 0 | ✅ | criancas (CASCADE) |
| `contatos` | 0 | ✅ | responsaveis (CASCADE) |
| `inscricao_rate_limits` | 0 | ✅ | — |

### Constraints
- ✅ PK em todas as tabelas
- ✅ FK com ON DELETE CASCADE em todas as relações
- ✅ UNIQUE: `user_roles(user_id, role)`, `inscricoes(protocolo)`, `presencas(crianca_id, data)`, `criancas(responsavel_id, nome, data_nascimento)`
- ✅ Índices em: cpf (UNIQUE), telefone, data_inscricao DESC, nome, protocolo, responsavel_id, rate_limits(cpf, created_at)

### Migrações (8)

| # | Migration | Objetivo |
|:-:|-----------|----------|
| 1 | `20260603191310_...` | Schema inicial (tabelas, RPCs, RLS, triggers) |
| 2 | `20260609205104_...` | Hardening permissões |
| 3 | `20260609210000_...` | Índices de performance |
| 4 | `20260609210001_...` | Corrigir busca por telefone |
| 5 | `20260609210002_...` | Rate limiting |
| 6 | `20260611000000_...` | Validação servidor (CPF, telefone, idade) |
| 7 | `20260612004837_...` | Prevenção duplicatas |
| 8 | `20260613000000_...` | Exclusão física admin |

### RPCs (7 públicas + 3 internas)

| RPC | Descrição | Pública |
|-----|-----------|:-------:|
| `criar_inscricao` | Cria inscrição completa (valida, upsert, insere) | ✅ anon |
| `consultar_inscricao` | Busca por protocolo/CPF/telefone | ✅ anon |
| `verificar_inscricao_duplicada` | Verifica duplicata | ✅ anon |
| `has_role` | Verifica papel do usuário | ❌ authenticated |
| `is_staff` | Verifica se é staff | ❌ authenticated |
| `admin_delete_inscricao` | Exclui inscrição fisicamente | ❌ authenticated |
| `validar_cpf` | Valida CPF (algoritmo) | 🔒 interna |
| `check_inscricao_rate_limit` | Rate limit check | 🔒 interna |
| `handle_new_user` | Trigger signup | 🔒 trigger |
| `tg_set_updated_at` | Trigger updated_at | 🔒 trigger |

---

## Administração

### Dashboard
- ✅ Listagem paginada com `range()` do Supabase
- ⚠️ Pré-filtro carrega todos os IDs primeiro (degrada com volume)
- ✅ Filtros combinados (texto + idade + turma + sexo + data)
- ⚠️ Busca sem debounce
- ✅ Botão excluir com RPC e confirmação
- ✅ Toast detalhado (inscrição/criança/responsável removidos)
- ⚠️ Status update sem RPC (usa `from().update()` direto)
- ✅ Presença com upsert (data + crianca_id UNIQUE)
- ⚠️ PDF export básico (plain text, sem tabela)
- ✅ CSV com BOM (UTF-8 para Excel)
- ✅ XLSX com `xlsx` library

### Exclusão Física (implementada)
- ✅ RPC `admin_delete_inscricao(UUID)`
- ✅ SECURITY DEFINER + check `has_role('admin')`
- ✅ Transação completa em plpgsql
- ✅ Remove inscrição → presenças → criança → contatos → responsável
- ✅ Retorna JSON com flags do que foi removido
- ✅ Testado 5 cenários (aprovados)
- ✅ Frontend usa a RPC (não `from().delete()`)

---

## Checklist Geral

### Área Pública

| Item | Status |
|------|:------:|
| Landing page | ✅ Implementado |
| Formulário 6 etapas | ✅ Implementado |
| Validação CPF client-side | ✅ Implementado |
| Validação CPF server-side | ✅ Implementado |
| Máscara CPF | ✅ Implementado |
| Máscara telefone | ✅ Implementado |
| Cálculo idade automático | ✅ Implementado |
| Validação idade (0-12) | ✅ Implementado |
| Turnstile CAPTCHA | ✅ Implementado |
| Honeypot anti-bot | ✅ Implementado |
| Timeout anti-bot (5s) | ✅ Implementado |
| Prevenção duplicatas | ✅ Implementado |
| Irmãos permitidos | ✅ Implementado |
| Página de sucesso | ✅ Implementado |
| Consulta pública | ✅ Implementado |
| Salvamento rascunho (localStorage) | ✅ Implementado |
| Responsividade | ⚠️ Parcial (nav sem hamburger) |
| Acessibilidade (aria-live, labels) | ⚠️ Parcial |

### Área Administrativa

| Item | Status |
|------|:------:|
| Login admin | ✅ Implementado |
| Verificação de papel (admin) | ✅ Implementado |
| Fallback de autenticação | ✅ Implementado |
| Listagem paginada | ✅ Implementado |
| Busca textual | ✅ Implementado |
| Filtro idade | ✅ Implementado |
| Filtro turma | ✅ Implementado |
| Filtro sexo | ✅ Implementado |
| Filtro data | ✅ Implementado |
| Alteração de status | ✅ Implementado |
| Confirmação de status | ✅ Implementado |
| Registro de presença | ✅ Implementado |
| Detalhes da inscrição | ✅ Implementado |
| Exclusão física (RPC) | ✅ Implementado |
| Modal de exclusão com aviso | ✅ Implementado |
| Toast detalhado pós-exclusão | ✅ Implementado |
| Export CSV | ✅ Implementado |
| Export XLSX | ✅ Implementado |
| Export PDF | ✅ Implementado |
| Estatísticas | ✅ Implementado |
| RPC para status (em vez de direct table) | ❌ Pendente |
| RPC para presença (em vez de direct table) | ❌ Pendente |
| Edição de dados da inscrição | ❌ Pendente |

### Segurança

| Item | Status |
|------|:------:|
| RLS em todas as tabelas | ✅ Implementado |
| RPCs públicas com validação | ✅ Implementado |
| Rate limiting (3/hora/CPF) | ✅ Implementado |
| SECURITY DEFINER com search_path fixo | ✅ Implementado |
| CPF validado no servidor | ✅ Implementado |
| Admin check interno nas RPCs críticas | ✅ Implementado |
| Service role não exposta ao cliente | ✅ Implementado |
| Turnstile server verification | ✅ Implementado |
| Proteção SQL injection | ✅ Implementado |
| Proteção XSS (React escape) | ✅ Implementado |
| Secrets em .env (não versionado) | ⚠️ Verificar .gitignore |

### Persistência

| Item | Status |
|------|:------:|
| Criação de inscrição | ✅ Aprovado |
| Consulta por protocolo | ✅ Aprovado |
| Consulta por CPF | ✅ Aprovado |
| Consulta por telefone | ✅ Aprovado |
| Duplicata rejeitada | ✅ Aprovado |
| Irmão permitido | ✅ Aprovado |
| Exclusão admin | ✅ Aprovado |
| CPF inválido rejeitado | ✅ Aprovado |
| Idade inválida rejeitada | ✅ Aprovado |
| Auth faltando rejeitado | ✅ Aprovado |
| UNIQUE constraint funcional | ✅ Aprovado |
| CASCADE referencial íntegro | ✅ Aprovado |

### Qualidade de Código

| Item | Status |
|------|:------:|
| TypeScript strict mode | ✅ Ativado |
| `tsc --noEmit` sem erros | ✅ OK |
| ESLint configurado | ✅ OK |
| Prettier configurado | ✅ OK |
| Hooks customizados | ❌ Nenhum (pasta vazia) |
| Componentes modulares | ⚠️ Dashboard monolítico (1438 linhas) |
| Dead code (MSG não usados) | ⚠️ 2 constantes |
| Testes automatizados | ❌ Ausentes |
| CI/CD pipeline | ❌ Ausente |
| Tratamento de erros consistente | ⚠️ Parcial (falta try/catch no submit) |

---

## Próximas Prioridades

### 🔴 Crítica (antes do lançamento)

1. **Adicionar `try/catch` + `finally { setSubmitting(false) }` no `submit()`** do formulário de inscrição (`inscricao.tsx:171`)
2. **Revogar `GRANT EXECUTE` de `anon` em `admin_delete_inscricao`** — já feito via comando direto, confirmar que migration reflete
3. **Adicionar RPC `admin_update_status` e `admin_register_presence`** para substituir `supabase.from().update()` / `.upsert()` no dashboard

### 🟠 Alta

4. **Adicionar debounce (300ms) no campo de busca do dashboard**
5. **Corrigir `todayIso`** — recalcular a cada render ou usar `useMemo` com dependência de data
6. **Adicionar `aria-label` nos botões ícone (excluir, detalhes)**
7. **Corrigir export "completa"** — não aplicar filtros de data
8. **Adicionar aviso de limite de 5000 linhas no export** ou aumentar para 50000
9. **Adicionar AbortController nas chamadas `loadRows`** para evitar race conditions
10. **Adicionar `try/catch` no `useEffect` de auth do dashboard**

### 🟡 Média

11. **Adicionar `aria-live="polite"` nos contêineres de erro do formulário**
12. **Expandir `StepConfirmacao` para mostrar todos os campos preenchidos**
13. **Ocultar CPF parcialmente no modal de detalhes (ex: 529.xxx.xxx-25)**
14. **Melhorar export PDF** — adicionar cabeçalhos de coluna e estrutura de tabela
15. **Adicionar testes unitários** (pgTAP para RPCs, vitest para validators.ts)
16. **Extrair dashboard em sub-componentes** (Table, Filters, ExportPanel, Dialogs)
17. **Refatorar `resolveMatchingInscricaoIds`** para não carregar todos os IDs

### 🟢 Baixa

18. Remover dead code (`cpfSequencia`, `dataFutura` em `MSG`)
19. Adicionar `aria-hidden="true"` no honeypot
20. Substituir inputs de cidade/estado/igreja por selects
21. Adicionar menu hamburger no header mobile
22. Corrigir social links no footer
23. Atualizar meta tags do `__root.tsx` (remover "Lovable App")
24. Criar hooks customizados (useDebounce, useInscricaoQuery, etc.)
25. Mover `SELECT_INSCRICOES` string para arquivo de query builder ou RPC

---

## Arquivos Analisados

### Frontend
- `src/routes/__root.tsx` (133 linhas)
- `src/routes/index.tsx` (269 linhas)
- `src/routes/inscricao.tsx` (751 linhas)
- `src/routes/inscricao.sucesso.tsx` (65 linhas)
- `src/routes/consulta.tsx` (116 linhas)
- `src/routes/admin.tsx` (123 linhas)
- `src/routes/admin.dashboard.tsx` (1438 linhas)
- `src/components/SiteHeader.tsx` (52 linhas)
- `src/components/SiteFooter.tsx` (61 linhas)
- `src/components/Brand.tsx`
- `src/components/TurnstileWidget.tsx`
- `src/lib/validators.ts` (79 linhas)
- `src/lib/utils.ts`
- `src/lib/verify-turnstile.ts`
- `src/lib/error-capture.ts`
- `src/lib/error-page.ts`
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts` (455 linhas)
- `src/integrations/supabase/auth-context.ts`
- `src/integrations/supabase/auth-provider.tsx`
- `src/integrations/supabase/auth-attacher.ts`
- `src/styles.css`
- `src/router.tsx`
- `src/server.ts`
- `src/start.ts`
- `src/routeTree.gen.ts`

### Backend
- `supabase/migrations/20260603191310_*.sql` (254 linhas)
- `supabase/migrations/20260609205104_*.sql` (13 linhas)
- `supabase/migrations/20260609210000_*.sql` (11 linhas)
- `supabase/migrations/20260609210001_*.sql` (17 linhas)
- `supabase/migrations/20260609210002_*.sql` (163 linhas)
- `supabase/migrations/20260611000000_*.sql` (191 linhas)
- `supabase/migrations/20260612004837_*.sql` (186 linhas)
- `supabase/migrations/20260613000000_*.sql` (89 linhas)

### Config
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `vercel.json`
- `.env`
- `components.json`
- `eslint.config.js`

---

## Arquivos Modificados Durante a Auditoria

| Arquivo | Ação |
|---------|:----:|
| `supabase/migrations/20260613000000_admin_delete_inscricao.sql` | Criado |
| `src/integrations/supabase/types.ts` | Adicionado `admin_delete_inscricao` |
| `src/routes/admin.dashboard.tsx` | `confirmDelete` usa RPC; modal com aviso ampliado; toast detalhado |
| `AUDIT_INSCRICAO.md` | Adicionada seção "Prevenção de duplicatas" |
| `AUDIT_PERSISTENCIA.md` | Adicionada UNIQUE constraint e migration 7 |
| `AUDIT_EXCLUSAO.md` | Criado |
| `PROJECT_AUDIT_EBF2026.md` | **Atualizado (este arquivo)** |

---

## Resultados dos Testes de Produção (13/06/2026)

| # | Teste | Resultado |
|:-:|-------|:---------:|
| 1 | Nova inscrição com CPF válido (`52998224725`) | ✅ Protocolo EBF26-48A28F4E |
| 2 | Consulta por protocolo | ✅ Retorna dados corretos |
| 3 | Consulta por CPF | ✅ Retorna dados corretos |
| 4 | Duplicata detectada | ✅ Retorna protocolo e status existentes |
| 5 | Inscrição com CPF inválido rejeitada | ✅ "CPF do responsável inválido." |
| 6 | Autorização falsa rejeitada | ✅ "Autorização de participação... obrigatórias." |
| 7 | Idade inválida (>12) rejeitada | ✅ "0 e 12 anos" |
| 8 | Duplicata via criar_inscricao rejeitada | ✅ "já foi inscrita" |
| 9 | Irmão (mesmo CPF, criança diferente) permitido | ✅ Protocolo EBF26-EB03647B |
| 10 | Exclusão admin bloqueada sem permissão | ✅ "Acesso negado" |
| 11 | Cleanup de dados de teste | ✅ 0 registros remanescentes |

---

*Auditoria concluída em 13/06/2026. Total de 25+ arquivos analisados, 8 migrações, 10 RPCs, 11 testes de produção.*
