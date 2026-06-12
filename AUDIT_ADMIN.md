# Auditoria Cirúrgica — Área Administrativa EBF 2026

**Arquivos analisados:**
- `src/routes/admin.tsx` (125 linhas)
- `src/routes/admin.dashboard.tsx` (1426 linhas)
- `src/integrations/supabase/auth-provider.tsx` (188 linhas)
- `src/integrations/supabase/auth-context.ts` (29 linhas)
- `src/integrations/supabase/client.ts` (40 linhas)
- `src/integrations/supabase/types.ts` (451 linhas)
- `src/routes/__root.tsx` (133 linhas)
- `scripts/seed-default-admin.mjs` (83 linhas)
- `supabase/migrations/20260603191310_*.sql` (migration inicial)
- `supabase/migrations/20260609210002_rate_limit.sql` (rate limit)

**Objetivo:** NÃO investigar login/auth — apenas EXPERIÊNCIA E FUNCIONALIDADE do painel.

---

## INVENTÁRIO COMPLETO DO DASHBOARD

### Páginas Administrativas (2)

| Página | Rota | Arquivo | Status |
|--------|------|---------|--------|
| Login Admin | `/admin` | `admin.tsx` | ✅ Funcional |
| Dashboard | `/admin/dashboard` | `admin.dashboard.tsx` | ✅ Funcional |

### Componentes do Login (`admin.tsx`)

| Componente | Tipo | Finalidade | Status |
|-----------|------|-----------|--------|
| `SiteHeader` | Layout | Header do site | ✅ |
| `SiteFooter` | Layout | Footer do site | ✅ |
| `LogoAD` | Imagem | Logo da Assembleia de Deus | ✅ |
| Formulário de login | Form | Email + senha + submit | ✅ |
| `Input[type=email]` | Campo | Email do admin (default: `admin@ebf2026.local`) | ✅ |
| `Input[type=password]` | Campo | Senha (min 6 caracteres) | ✅ |
| `Button[type=submit]` | Botão | "Entrar" / "Entrando..." | ✅ |
| Error alert | Div | Mensagem de erro de autenticação (bg-red-50) | ✅ |
| Link "Voltar ao site" | Link | Navega para `/` | ✅ |

### Componentes do Dashboard (`admin.dashboard.tsx`)

#### Header
| Componente | Tipo | Finalidade | Status |
|-----------|------|-----------|--------|
| `LogoUCADMA` | Imagem | Logo UCADMA no header | ✅ |
| `LogoAD` | Imagem | Logo AD (hidden em mobile `<sm`) | ✅ |
| Link header | Link | Logo leva para `/` | ✅ |
| Nome/Email do admin | Texto | `adminName` (metadata.name → full_name → email) | ✅ |
| Último acesso | Texto | `lastAccess` formatado de `user.last_sign_in_at` | ✅ |
| `Button "Sair"` | Botão | Logout + redirect `/admin` | ✅ |

#### Stats Cards (4 cards)
| Card | Ícone | Rótulo | Status |
|------|-------|--------|--------|
| Nesta página | `Baby` | Contagem de `rows` da página atual | ✅ |
| Total (filtros) | `Users` | Contagem total via `totalCount` do Supabase | ✅ |
| Meninos / Meninas | `BadgeCheck` | `stats.masc / stats.fem` | ✅ |
| Com alerta de saúde | `Heart` | `stats.comAlergia` | ⚠️ Funcional mas métrica incompleta |

#### Barra de Filtros (7 controles)
| Filtro | Tipo | Finalidade | Status |
|--------|------|-----------|--------|
| Busca textual | `Input` | Protocolo, criança, responsável, CPF, telefone | ✅ |
| Faixa etária | `Select` | all / 0-3 / 4-6 / 7-9 / 10-12 / 13+ | ✅ |
| Turma | `Select` | all + turmas dinâmicas | ✅ |
| Sexo | `Select` | all / masculino / feminino | ✅ |
| Data início | `Input[type=date]` | Filtro data inicial | ✅ |
| Data fim | `Input[type=date]` | Filtro data final | ✅ |

#### Seção de Exportação
| Controle | Tipo | Finalidade | Status |
|----------|------|-----------|--------|
| Escopo de exportação | `Select` | filtrada / completa / turma / faixa | ✅ |
| Turma para exportar | `Select` | (disabled quando escopo ≠ turma) | ✅ |
| Faixa para exportar | `Select` | (disabled quando escopo ≠ faixa) | ✅ |
| `Button XLSX` | Botão | Exporta para Excel | ✅ |
| `Button CSV` | Botão | Exporta para CSV | ✅ |
| `Button PDF` | Botão | Exporta para PDF | ✅ |

#### Seção de Presença
| Controle | Tipo | Finalidade | Status |
|----------|------|-----------|--------|
| Data da presença | `Input[type=date]` | Seleciona dia para registrar/visualizar | ✅ |
| `Button "Imprimir lista"` | Botão | `window.print()` | ✅ |

#### Tabela de Inscrições (11 colunas)
| Coluna | Conteúdo | Editável? | Status |
|--------|---------|-----------|--------|
| Protocolo | `row.protocolo` (font-mono, gold) | ❌ | ✅ |
| Criança | `row.nomeCrianca` | ❌ | ✅ |
| Idade | `row.idade` | ❌ | ✅ |
| Sexo | `row.sexo` | ❌ | ✅ |
| Turma | `row.turma` ou "—" | ❌ | ✅ |
| Responsável | `row.responsavelNome` ou "—" | ❌ | ✅ |
| Telefone | `row.responsavelTelefone` ou "—" | ❌ | ✅ |
| Status | `Select` com STATUS_OPTIONS | ✅ (updateStatus) | ✅ |
| Presença (data) | Texto: status do dia ou "—" | ❌ | ✅ |
| Presença (ação) | `Select` para registrar | ✅ (registerPresence) | ⚠️**
| Ações | `Button "Detalhes"` + `Button "Excluir"` | Abre modal / confirma exclusão | ✅ |

** ver ETAPA 2 para problema específico

#### Modal de Detalhes
| Seção | Conteúdo | Status |
|-------|---------|--------|
| Criança | Nome, idade, sexo, turma, status, data inscrição | ✅ |
| Responsável | Nome, CPF, telefone, email, igreja | ✅ |
| Saúde | Alergias, medicamentos, necessidades, restrições | ✅ |
| Emergência | Nome, parentesco, telefone | ✅ |
| Presenças | Lista de registros com data e status | ✅ |

#### Cards de Estatística (rodapé)
| Card | Conteúdo | Status |
|------|---------|--------|
| Total por faixa etária | Lista: faixa → contagem | ✅ |
| Total por turma | Lista: turma → contagem | ✅ |

---

## ETAPA 2 — FUNCIONALIDADES: TESTES E RESULTADOS

### ✅ Login
- **Teste:** Análise de fluxo `signIn()` em `admin.tsx:35-52`
- **Resultado:** Chama `signIn()` do AuthProvider que faz `supabase.auth.signInWithPassword()` → verifica `has_role()` → se admin, navega para `/admin/dashboard`
- **Problemas:** NENHUM (conforme solicitado, não auditamos login)

### ✅ Logout
- **Teste:** `logout()` em `admin.dashboard.tsx:324-327`
- **Resultado:** `supabase.auth.signOut()` + `navigate({ to: "/admin" })`
- **Problemas:** NENHUM

### ✅ Consulta de Inscritos (loadRows)
- **Teste:** `loadRows()` em `admin.dashboard.tsx:206-274`
- **Resultado:** Faz `supabase.from("inscricoes").select(...)` com `.range()` e `{ count: "exact" }`. Filtros são resolvidos server-side (fase 1: coleta de IDs via queries auxiliares para filtros cross-table; fase 2: query paginada com `.in()`).
- **Correção:** ✅ **Paginação implementada (11/06/2026).** `loadRows(page, size)` agora usa `.range((page - 1) * size, page * size - 1)` e `{ count: "exact" }`. Tamanhos de página: 25, 50, 100.

### ✅ Busca (filtro textual)
- **Teste:** Busca integrada ao `loadRows()` paginado em `admin.dashboard.tsx:206-274`
- **Resultado:** `resolveMatchingInscricaoIds()` busca protocolo, nome da criança e nome do responsável via OR (UNION de queries). CPF e telefone são filtrados server-side com `ilike`.
- **Correção:** ✅ **Filtro migrado para server-side (11/06/2026).** `filteredRows` useMemo removido. Agora a query usa `.in("id", matchingIds)` para aplicar o filtro textual diretamente no servidor.

### ✅ Filtros (idade, turma, sexo, data)
- **Teste:** Filtros integrados ao `loadRows()` paginado
- **Resultado:** Idade e turma são resolvidos via `resolveMatchingInscricaoIds()` e aplicados com `.in()`. Sexo aplicado diretamente na query. Data usa `.gte()` / `.lte()`.
- **Correção:** ✅ **Filtros migrados para server-side (11/06/2026).** `filteredRows` useMemo removido. Filtragem agora acontece no PostgreSQL via Supabase queries paginadas.

### ✅ Alteração de Status
- **Teste:** `updateStatus()` via `pendingStatusChange` + `confirmStatusChange()`
- **Resultado:** Select define `pendingStatusChange` state. Modal `Dialog` exibe nome da criança, protocolo, status atual → novo status. Confirmação chama `updateStatus()`. Cancelamento descarta.
- **Correção ID 002:** ✅ **Confirmação implementada (11/06/2026).** Modal shadcn/ui Dialog com `DialogFooter` + botões "Confirmar"/"Cancelar". Select apenas prepara a mudança, não executa.
- **Problema ID 003 — 🟡 MÉDIO:** O array `STATUS_OPTIONS` permite qualquer transição (ex: "Cancelado" → "Inscrito" → "Presente"). Não há máquina de estados impedindo transições inválidas. (Ainda pendente)

### ⚠️ Registro de Presença
- **Teste:** `registerPresence()` em `admin.dashboard.tsx:423-458`
- **Resultado:** `supabase.from("presencas").upsert()` com `onConflict: "crianca_id,data"`
- **Problema ID 004 — 🟡 MÉDIO:** Se `registerPresence` for chamado com "presente" e o `update` do status falhar (linha 443), a presença já foi registrada mas o status não atualizou. **Inconsistência de dados**.
- **Problema ID 005 — 🟢 BAIXO:** O `Select` de presença começa com valor vazio/placeholder, mas se já existe presença para a data, o `value` é setado corretamente.

### ✅ Exclusão de Inscrições
- **Teste:** `confirmDelete()` via `pendingDelete` state
- **Resultado:** Botão `Trash2` na coluna Ações → modal Dialog com nome da criança, protocolo, aviso de irreversibilidade → "Sim, remover" chama `supabase.from("inscricoes").delete().eq("id", ...)`. Linha removida do state local.
- **Problemas:** NENHUM. Funcional com confirmação obrigatória.

### ✅ Exportação CSV
- **Teste:** `exportCsv()` em `admin.dashboard.tsx:505-529`
- **Resultado:** Gera CSV com BOM UTF-8, faz download
- **Problemas:** NENHUM

### ✅ Exportação XLSX
- **Teste:** `exportXlsx()` em `admin.dashboard.tsx:531-552`
- **Resultado:** Dynamic import de `xlsx`, gera planilha, faz download
- **Problemas:** NENHUM

### ✅ Exportação PDF
- **Teste:** `exportPdf()` em `admin.dashboard.tsx:554-593`
- **Resultado:** Dynamic import de `jspdf`, gera PDF paisagem A4 com linhas de texto
- **Problema ID 006 — 🟢 BAIXO:** PDF usa uma única linha de texto por registro com `splitTextToSize`. Para registros com muitas observações médicas, a linha pode ficar muito longa e difícil de ler.

### ⚠️ Botão "Detalhes" (Modal)
- **Teste:** `setDetailRow(row)` → Dialog
- **Resultado:** Modal exibe todas informações da inscrição
- **Problemas:** NENHUM. Funcional.

### ⚠️ Estatísticas
- **Teste:** `stats` useMemo em `admin.dashboard.tsx:371-398`
- **Resultado:** Calcula total, masc/fem, comAlergia, faixa etária, turma
- **Problema ID 007 — 🟢 BAIXO:** O contador "Com alerta de saúde" só verifica `alergias` e `necessidades_especiais`. Não considera `medicamentos` nem `restricoes_alimentares` como alertas de saúde.

---

## ETAPA 3 — AUDITORIA VISUAL

### Layout e Alinhamentos

| Item | Problema | Severidade |
|------|---------|-----------|
| Tabela com 11 colunas | 🟢 BAIXO: Coluna "Presença (data)" + "Presença (ação)" são redundantes e ocupam espaço. Podem ser consolidadas. |
| Stats cards | ✅ Alinhados com grid `sm:grid-cols-2 lg:grid-cols-4` |
| Header | ✅ Sticky, backdrop-blur, z-40 |
| Modal de detalhes | ✅ `max-w-3xl`, grid de 2 colunas |
| Cards de estatística (rodapé) | ✅ Grid 2 colunas |

### Responsividade

| Item | Problema | Severidade |
|------|---------|-----------|
| Tabela | ✅ `overflow-x-auto` na tabela permite scroll horizontal |
| Stats cards | ✅ `sm:grid-cols-2 lg:grid-cols-4` — empilha em mobile |
| Filtros | ✅ `md:grid-cols-2 lg:grid-cols-3` |
| Header `LogoAD` | ✅ `hidden sm:block` — esconde em mobile |
| Header "Coordenação" texto | ✅ Sem quebras |

### Estados de Carregamento

| Estado | Onde | Problema | Severidade |
|--------|------|---------|-----------|
| Loading | Dashboard principal | 🟢 BAIXO: Apenas texto "Carregando painel administrativo..." sem spinner/skeleton |
| Saving status | Linha da tabela | ✅ `disabled={savingStatusId === row.inscricaoId}` — desabilita o Select |
| Saving presence | Linha da tabela | ✅ `disabled={savingPresenceId === row.criancaId}` — desabilita o Select |
| Exporting | Botões de export | ✅ Texto muda para "Exportando..." com spinner `Loader2` animado |
| Login loading | admin.tsx | ✅ Botão mostra "Entrando..." |

### Estados Vazios

| Situação | Mensagem | Problema |
|----------|---------|---------|
| Nenhum registro (filtros) | "Nenhuma inscrição encontrada para os filtros informados." | ✅ OK |
| Nenhuma turma definida | "Sem turmas definidas." | ✅ OK |
| Nenhuma presença no modal | "Nenhuma presença registrada." | ✅ OK |
| Stats cards com 0 registros | Mostra "0" | ✅ OK |
| Nenhum registro para exportar | Toast "Nenhum registro para exportar." | ✅ OK |

### Tipografia e Contraste

| Item | Problema | Severidade |
|------|---------|-----------|
| Textos em português | ✅ Dashboard predominantemente em português |
| Status "Confirmado" vs DB "confirmada" | 🟢 BAIXO: Inconsistência semântica (português/inglês) |
| Nomes de exportação | 🟢 BAIXO: `ebf-2026-inscricoes-filtrada.csv` — "filtrada" em português, inconsistente com "completa" |

### Problemas Visuais Adicionais

| ID | Problema | Local | Evidência | Severidade |
|----|---------|-------|-----------|-----------|
| V1 | Botões de exportação não mudam texto quando ocupados | linha 786-799 | ✅ **Corrigido (11/06/2026).** Botões mostram `Loader2` + "Exportando..." | 🟢 Baixo |
| V2 | `print-only` classes não removem header sticky | linha 624 | Header tem `no-print` mas `sticky top-0` pode interferir na impressão em alguns browsers | 🟢 Baixo |
| V3 | Nenhum breadcrumb ou indicador de localização | Dashboard | Usuário não sabe onde está além do título "Painel EBF 2026" | 🟢 Baixo |

---

## ETAPA 4 — AUDITORIA DE DADOS

### Consultas Supabase

| Query | Local | Problema | Severidade |
|-------|-------|---------|-----------|
| `loadRows()` — paginado com `.range()` | linha 248-274 | ✅ **Corrigido (11/06/2026).** Agora usa `.range()`, `{ count: "exact" }`, filtros server-side. | ✅ Corrigido |
| `updateStatus()` — update por id | linha 406-409 | ✅ Correta. Filtra por `id`. | |
| `registerPresence()` — upsert | linha 426-434 | ✅ Correta. `onConflict: "crianca_id,data"` | |
| Auto-update status p/ "Presente" | linha 442-443 | ⚠️ Pode falhar silenciosamente (ver ID 004) | 🟡 Médio |

### Filtros e Ordenação

| Funcionalidade | Problema | Severidade |
|---------------|---------|-----------|
| Ordenação descendente por `data_inscricao` | ✅ OK | |
| Filtro de busca por texto/dígitos | ✅ OK | |
| Filtro por data | ✅ Usa timestamps para comparação | |
| Filtro por turma | ✅ Usa string match exata | |
| Sem ordenação customizável (clicar coluna) | 🟢 BAIXO: Usuário não pode ordenar por nome, idade, etc. |

### Sincronização com Banco

| Aspecto | Problema | Severidade |
|---------|---------|-----------|
| Status DB: `DEFAULT 'confirmada'` | A migration define `confirmada` como padrão. O frontend usa `normalizeStatus()` que mapeia para "Confirmado" (via `startsWith("confirm")`). **Funciona, mas é uma amarra frágil.** Se o DB mudar o default para `'pendente'`, o frontend trata como "Inscrito". | 🟡 Médio |
| `normalizeStatus` lógica | Usa `startsWith`. "Confirmado" e "confirmada" funcionam; "Pres" para "Presente" funciona (mas "Pres" é prefixo curto e pode gerar falso positivo se status "Presencial" for adicionado) | 🟢 Baixo |
| Status "Inscrito" salvo como "Inscrito" no DB | O frontend envia o mesmo valor do Select. O DB aceita qualquer string. **Sem validação** no DB para os valores permitidos. | 🟢 Baixo |

---

## ETAPA 5 — SEGURANÇA ADMIN

### Rotas Protegidas

| Rota | Proteção | Evidência | Status |
|------|---------|-----------|--------|
| `/admin` | Se já logado + admin, redireciona para `/admin/dashboard`. Senão, mostra login. | `admin.tsx:25-33` | ✅ |
| `/admin/dashboard` | Dupla verificação: 1. AuthContext.isAdmin 2. supabase session + has_role() fallback | `admin.dashboard.tsx:258-317` | ✅ |

### Acesso sem Login

| Rota | Comportamento | Status |
|------|--------------|--------|
| `/admin/dashboard` sem sessão | Fallback detecta `!session` → `navigate({ to: "/admin" })` | ✅ |
| `/admin/dashboard` com sessão mas sem role admin | Faz `signOut()` + redirect | ✅ |

### Exposição Indevida de Dados

| Item | Problema | Severidade |
|------|---------|-----------|
| CPF na tabela do dashboard | O CPF do responsável é carregado (`responsavelCpf`) mas **não é exibido na tabela**. Só aparece no modal de detalhes. ✅ Correto. | 🟢 OK |
| CPF na exportação | 🟢 BAIXO: CPF não está no `ExportRow`, não é exportado. ✅ Correto. | 🟢 OK |
| Telefone na tabela | ✅ Exibido como texto normal. | 🟢 OK |
| Service Role Key no .env | ⚠️ Já identificado no PROJECT_AUDIT_EBF2026.md — não auditamos aqui. | |

### Validação de Dados nas Ações Admin

| Ação | Validação | Problema |
|------|----------|---------|
| `updateStatus` | Nenhuma validação frontend. Envia o que o Select devolver. | 🟢 Pode enviar string inválida (ex: "qualquer coisa"). O DB aceita qualquer texto. |
| `registerPresence` | Verifica `authUserId` | ✅ |

---

## ETAPA 6 — CÓDIGO MORTO DA ÁREA ADMIN

### Variáveis/Estados Não Utilizados

| Item | Local | Evidência | Status |
|------|-------|-----------|--------|
| `ctxSession` | `admin.dashboard.tsx:176` | `session: ctxSession` destruturado de `useAuth()` mas nunca usado. | ✅ Removido (11/06/2026) |
| `sessionData` | `admin.dashboard.tsx:277` | Só usado para extrair `sessionData.session`. A variável em si não é referenciada. | 🧟 Parcialmente |
| `is_staff` RPC | `types.ts:321` | Tipada, existe no banco, mas **nunca chamada pelo frontend** (só usada em RLS) | 🧟 Morto no frontend |
| `contatos` tabela | `types.ts:11-48` + migration | Tipada e migrada, mas **sem UI** para criar/visualizar | 🧟 Incompleto |

### Código Removido (11/06/2026)

| Item | Local | Motivo |
|------|-------|--------|
| `filteredRows` (useMemo) | `admin.dashboard.tsx` | Filtragem client-side substituída por filtragem server-side nas queries paginadas |
| `exportRowsModel()` | `admin.dashboard.tsx` | Substituído por `fetchAllRowsForExport()` com escopo inline |
| `ExportRow` (type) | `admin.dashboard.tsx` | Não mais necessário — mapeamento feito inline |
| `normalizeDigits()` | `admin.dashboard.tsx` | Nunca chamada — CPF/telefone filtrados via `ilike` direto |
| `session: ctxSession` | `admin.dashboard.tsx:176` | Destruturado de `useAuth()` mas nunca usado no componente |

### Imports Mortos

| Import | Arquivo | Evidência |
|--------|---------|-----------|
| `zod` | `admin.tsx` | ❌ **Não importado.** Usado apenas em `inscricao.sucesso.tsx` — OK, não morto aqui. |

### Rotas Não Utilizadas

| Rota | Justificativa | Status |
|------|--------------|--------|
| Nenhuma. Todas as rotas da área admin são funcionais. | | ✅ |

### Funções Não Utilizadas (Fora do Escopo Admin)

N/A — focamos apenas na área admin.

---

## ETAPA 7 — MELHORIAS RECOMENDADAS

### ✅ CORREÇÕES REALIZADAS (11/06/2026)

| ID | Problema | Local | Ação |
|----|---------|-------|------|
| C1 | `loadRows()` sem paginação | `admin.dashboard.tsx:206-274` | Paginação implementada: `.range()`, `{ count: "exact" }`, filtros server-side, navegação Primeira/Anterior/Próxima/Última |
| M1 | Loading state sem spinner | `admin.dashboard.tsx:990-996` | Spinner animado adicionado no loading inicial + overlay semitransparente na troca de páginas |
| M6 | `ctxSession` não utilizado | linha 176 | Removido destructuring de `ctxSession` |
| — | `normalizeDigits()` não utilizada | linha 129 | Função removida — CPF/telefone filtrados via `ilike` |
| — | `console.error` dev-only (4 ocorrências) | `admin.tsx:48`, `dashboard:685,741`, `__root.tsx:39` | Removidos — erros já tratados via toast / Lovable error reporting |
| — | `catch(error)` → `catch` sem bind | `dashboard:684,740` | Parâmetro `error` removido dos catch das exportações (não usado) |
| A1 | `updateStatus` sem confirmação | `admin.dashboard.tsx` | Modal Dialog com status atual → novo status, confirmar/cancelar |
| A5 | Nome do admin logado não aparece no header | `admin.dashboard.tsx` | `adminName` useMemo exibido no header ao lado do botão Sair |
| A6 | Botões de exportação sem feedback textual de "carregando" | `admin.dashboard.tsx` | `exportingType` state + `Loader2` animado + texto "Exportando..." |
| — | Exclusão de inscrições | `admin.dashboard.tsx` | Botão `Trash2` na tabela + modal Dialog de confirmação com aviso de irreversibilidade |
| — | Último acesso no header | `admin.dashboard.tsx` | `lastAccess` useMemo lê `user.last_sign_in_at` formatado DD/MM/AAAA HH:mm |
| — | `buildExportModel()` fatorado | `admin.dashboard.tsx` | Lógica de mapeamento de exportação extraída para função reutilizável |

### 🟡 ALTO — Afeta Uso do Sistema

| ID | Problema | Local | Ação | Esforço |
|----|---------|-------|------|---------|
| A2 | `registerPresence` pode deixar dados inconsistentes se `update` falhar | `admin.dashboard.tsx` | Envolver ambas operações em uma única chamada RPC ou usar transação no backend | 4h |
| A4 | Sem validação de transições de status | `admin.dashboard.tsx` | Criar máquina de estados: Inscrito → Confirmado → Presente; Inscrito/Confirmado → Cancelado | 3h |

### 🟢 MÉDIO — Melhora Experiência

| ID | Problema | Local | Ação | Esforço |
|----|---------|-------|------|---------|
| M2 | "Com alerta de saúde" ignora medicamentos/restrições | stats useMemo | Incluir `medicamentos` e `restricoes_alimentares` no filtro | 30min |
| M3 | Tabela não permite ordenação por coluna | Dashboard | Adicionar sort state ao clicar no cabeçalho | 4h |
| M4 | Export PDF difícil de ler com muitas observações | `admin.dashboard.tsx` | Usar layout de tabela no PDF (colunas fixas) em vez de linha única | 4h |
| M5 | Nome do arquivo exportado "filtrada" em português | export functions | Usar "filtered" ou "filtro" para consistência | 5min |
| M7 | Sem breadcrumb ou navegação secundária | Dashboard | Adicionar indicador de localização | 1h |
| M8 | Filtro de data sem label/instrução visual | filter bar | Adicionar placeholder ou label "De" / "Até" nos inputs de data | 30min |

### 🔵 BAIXO — Refinamentos Futuros

| ID | Problema | Local | Ação | Esforço |
|----|---------|-------|------|---------|
| B2 | Status "Inscrito" não distingue entre "novo" e "revisado" | Geral | Considerar adicionar mais estados (ex: "Pré-inscrito") | — |
| B3 | `is_staff` RPC nunca chamada pelo frontend | types.ts | Remover do types ou implementar UI para equipe | — |
| B4 | `contatos` tabela sem UI | types.ts + migration | Implementar módulo de contatos ou remover do schema | — |
| B5 | `normalizeStatus` usa `startsWith` frágil | linha 138-144 | Usar `===` com valores normalizados | 1h |

---

## CHECKLIST DE LANÇAMENTO — ÁREA ADMIN

### ✅ Já Funcionando
- [x] Login com verificação de role admin
- [x] Logout com limpeza de sessão
- [x] Dashboard carrega dados do Supabase
- [x] Filtros: texto, faixa etária, turma, sexo, data (server-side)
- [x] Paginação server-side (25/50/100 por página) com navegação completa
- [x] Spinner de loading inicial + overlay semitransparente na troca de páginas
- [x] Alteração de status por inscrição
- [x] Registro de presença por dia
- [x] Exportação CSV, XLSX, PDF (com fetch completo sem paginação)
- [x] Modal de detalhes da inscrição
- [x] Estatísticas: página atual, total filtros, meninos/meninas, alertas saúde, faixa, turma
- [x] Suporte a impressão (print.css)
- [x] Responsivo (mobile com scroll horizontal)
- [x] Proteção de rota (admin check duplo)
- [x] Removidos `console.error` dev-only (admin.tsx, dashboard, __root.tsx)
- [x] Removido `ctxSession` morto do destructuring
- [x] Removida `normalizeDigits()` não utilizada
- [x] Confirmação antes de alterar status (A1)
- [x] Nome do admin logado no header (A5)
- [x] Feedback textual nos botões de exportação (A6)
- [x] Exclusão de inscrições com confirmação
- [x] Último acesso exibido no header

### 🟡 CORRIGIR EM PRÓXIMA ITERAÇÃO
- [ ] Consistência de dados em registerPresence (A2)
- [ ] Máquina de estados para status (A4)

### 🔵 FAZER DEPOIS
- [ ] Ordenação por coluna na tabela (M3)
- [ ] Melhorar legibilidade do PDF (M4)
- [ ] Incluir medicamentos/restrições em alertas de saúde (M2)

---

## NOTA DE PRONTIDÃO DO PAINEL ADMINISTRATIVO

| Categoria | Nota | Justificativa |
|-----------|------|---------------|
| **Funcionalidades Core** | 8/10 | CRUD incompleto (sem editar). Status, presença, exclusão funcionam. |
| **UX** | 8/10 | Paginação + overlay + confirmação de status + feedback exportação + admin info + último acesso. |
| **Exportação** | 9/10 | CSV, XLSX, PDF funcionais com feedback visual "Exportando...". PDF poderia ser mais legível. |
| **Filtros e Busca** | 8/10 | 6 filtros server-side. Sem ordenação por coluna. |
| **Responsividade** | 7/10 | Funciona em mobile com scroll. Header adaptável. |
| **Segurança** | 8/10 | Rotas protegidas. Role check duplo. Dados sensíveis não expostos na tabela. |
| **Performance** | 7/10 | Paginação implementada — consultas de ~25 registros vs dataset completo. Sem lazy loading. |
| **Completude** | 6/10 | Faltam: editar inscrição, batch operations, gestão de contatos. Exclusão implementada. |

### Nota Geral: **7.6 / 10**

### Resumo
O painel administrativo está **maduro para produção**. Paginação, confirmação de status, feedback de exportação, nome do admin e último acesso foram implementados. Os próximos passos são a máquina de estados para transições de status e a consistência de dados no registro de presença.

**Próximo passo recomendado:** Implementar máquina de estados de status (impedir transições inválidas como Cancelado → Inscrito) e resolver a inconsistência entre presença e status no `registerPresence`.
