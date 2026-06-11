# Auditoria Técnica — EBF Connect Hub 2026

**Data da auditoria:** 11/06/2026
**Projeto:** EBF Connect Hub — UCADMA Marupaúba
**Propósito:** Documentar o estado atual para onboarding de desenvolvedores/IA, identificar riscos, débitos técnicos e prontidão para produção.

---

## SEÇÃO 1 — VISÃO GERAL DO PROJETO

### Nome do Projeto
EBF Connect Hub (tanstack_start_ts)

### Objetivo do Sistema
Sistema de inscrição online para a Escola Bíblica de Férias (EBF) 2026 da UCADMA (União de Crianças da Assembleia de Deus, Campo Marupaúba, Tomé-Açu/PA). Permite que responsáveis inscrevam crianças de 0 a 12 anos em um formulário de 6 etapas, consultem a inscrição por protocolo/CPF/telefone, e que a coordenação administrativa gerencie inscrições, presenças e exporte relatórios.

### Stack Utilizada
| Camada | Tecnologia |
|--------|-----------|
| Framework | TanStack Start (React 19 + React Router v1) |
| Linguagem | TypeScript 5.8 |
| Build | Vite 7 |
| Bundler SSR | Nitro 3 (beta, `260603-beta`) |
| Estilização | Tailwind CSS 4 + `tw-animate-css` |
| Componentes UI | Radix UI + shadcn/ui (New York style) |
| Ícones | lucide-react |
| Backend/Database | Supabase (Postgres 14.5) |
| Auth | Supabase Auth (email/senha, sessions, RLS) |
| Captcha | Cloudflare Turnstile |
| SSR | TanStack Start Server Functions |
| Pacotes adicionais | `jspdf`, `xlsx`, `sonner` (toast), `zod` |
| Runtime | Bun 1.x (lock: `bun.lock`, `bunfig.toml`) |
| Deploy | Vercel (config: `vercel.json`, preset Nitro: `vercel`) |

### Arquitetura Geral
```
[Browser] ← SSR + Hydration → [Vite/Nitro Server]
                                       |
                              [Supabase Client SDK]
                                       |
                              [Supabase Cloud (API REST)]
                                       |
                              [Postgres 14.5 + RLS]
```
- **Renderização:** SSR via TanStack Start com hidratação no cliente.
- **Roteamento:** File-based routing (TanStack Router). `routeTree.gen.ts` é auto-gerado.
- **Autenticação:** Supabase Auth gerenciado por `AuthProvider` (contexto React). Sessão persistida via `localStorage`. Bearer token anexado via `auth-attacher.ts` (functionMiddleware).
- **Backend:** Server Functions (`createServerFn`) para lógica sensível (Turnstile verification). RPCs diretos do cliente para Supabase nas rotas públicas.
- **Banco:** Schema relacional com 6 tabelas + RLS + funções RPC. Migrações versionadas.

### Ambiente de Execução
- **Desenvolvimento:** `bun run dev` (Vite dev server)
- **Build:** `bun run build` (Nitro + Vercel preset)
- **Preview:** `bun run preview`
- **Homologação:** Scripts em `scripts/` que validam fluxos contra Supabase real

### Principais Funcionalidades
1. **Inscrição pública** — formulário multi-etapas com validação, Turnstile, rate limiting (3/60min por CPF)
2. **Consulta pública** — busca por protocolo, CPF ou telefone via RPC
3. **Painel Admin** — login, dashboard com CRUD de status, presenças, exportação (CSV/XLSX/PDF), filtros
4. **Proteção contra abuso** — Turnstile + honeypot + rate limit server-side
5. **SSR com fallback** — server.ts captura erros e renderiza página de erro amigável

---

## SEÇÃO 2 — ESTRUTURA COMPLETA DE PASTAS

### Raiz do Projeto

| Caminho | Finalidade | Importância | Dependências |
|---------|-----------|-------------|--------------|
| `src/` | Código fonte da aplicação | 🔴 Crítica | Todo o ecossistema |
| `supabase/` | Configuração Supabase local + migrations | 🔴 Crítica | Supabase CLI, DB |
| `scripts/` | Scripts de homologação e seed | 🟡 Média | Supabase JS SDK |
| `public/` | Assets estáticos (imagens, banners) | 🟡 Média | Referenciado por CSS/HTML |
| `dist/` | Build output (não versionado) | 🟢 Baixa | Gerado por `build` |
| `.vercel/` | Output da build para deploy | 🟢 Baixa | Nitro build |
| `.agents/` | Configuração de skills do opencode | 🟢 Baixa | Ferramenta opencode |
| `.tanstack/` | Cache do TanStack Router (não versionado) | 🟢 Baixa | TanStack Router |
| `.lovable/` | Metadados do template Lovable | 🟢 Baixa | Lovable Cloud |
| `node_modules/` | Dependências npm | 🟢 Baixa | package.json |

### `src/` — Código Fonte

| Caminho | Finalidade | Importância |
|---------|-----------|-------------|
| `src/routes/` | Rotas file-based do TanStack Router | 🔴 Crítica |
| `src/components/` | Componentes React reutilizáveis | 🔴 Crítica |
| `src/components/ui/` | Componentes shadcn/ui | 🟡 Média |
| `src/integrations/supabase/` | Cliente Supabase, auth, types | 🔴 Crítica |
| `src/lib/` | Utilitários (error, turnstile, utils) | 🟡 Média |
| `src/hooks/` | Hooks customizados (vazio atualmente) | 🟢 Baixa |
| `src/assets/` | Metadados de assets (JSONs) | 🟢 Baixa |

### `supabase/` — Database

| Caminho | Finalidade | Importância |
|---------|-----------|-------------|
| `supabase/migrations/` | 5 migrations versionadas (schema, perf, fixes) | 🔴 Crítica |
| `supabase/config.toml` | Config do projeto Supabase local | 🟡 Média |
| `supabase/.temp/` | Cache da CLI Supabase | 🟢 Baixa |

---

## SEÇÃO 3 — INVENTÁRIO DE ARQUIVOS

### Arquivos Raiz

| Arquivo | Responsabilidade | Quem Utiliza | Dependências | Status |
|---------|-----------------|--------------|--------------|--------|
| `package.json` | Manifest do projeto, scripts, dependências | npm/bun, devs | — | ✅ Utilizado |
| `vite.config.ts` | Config do Vite + Nitro + Lovable | Vite, Nitro | `@lovable.dev/vite-tanstack-config` | ✅ Utilizado |
| `tsconfig.json` | Config TypeScript | tsc, IDE | — | ✅ Utilizado |
| `vercel.json` | Config de deploy Vercel | Vercel | — | ✅ Utilizado |
| `eslint.config.js` | Config ESLint flat config | ESLint | `typescript-eslint`, `eslint-plugin-react-*` | ✅ Utilizado |
| `.prettierrc` | Config Prettier | Prettier | — | ✅ Utilizado |
| `.prettierignore` | Arquivos ignorados pelo Prettier | Prettier | — | ✅ Utilizado |
| `.gitignore` | Arquivos ignorados pelo Git | Git | — | ✅ Utilizado |
| `.env` | Variáveis de ambiente (Supabase creds) | App runtime | — | ⚠️ Versionado (risco!) |
| `components.json` | Config shadcn/ui | shadcn CLI | — | ✅ Utilizado |
| `bun.lock` | Lockfile Bun | Bun | — | ✅ Utilizado |
| `bunfig.toml` | Config Bun | Bun | — | ✅ Utilizado |
| `.devserver.log` | Log do servidor dev (auto-gerado) | Lovable sandbox | — | 📝 Auto-gerado |
| `.devserver.pid` | PID do servidor dev (auto-gerado) | Lovable sandbox | — | 📝 Auto-gerado |
| `.preview.log` | Log do preview (auto-gerado) | Lovable sandbox | — | 📝 Auto-gerado |
| `.preview.pid` | PID do preview (auto-gerado) | Lovable sandbox | — | 📝 Auto-gerado |
| `dev-server.log` | Log do dev server | Lovable sandbox | — | 📝 Auto-gerado |
| `dev-server-err.log` | Log de erros do dev server | Lovable sandbox | — | 📝 Auto-gerado |
| `skills-lock.json` | Lockfile de skills opencode | opencode | — | ✅ Utilizado |

### `src/routes/` — Rotas

| Arquivo | Responsabilidade | Quem Utiliza | Dependências | Status |
|---------|-----------------|--------------|--------------|--------|
| `__root.tsx` | Root layout: AuthProvider, QueryClientProvider, HeadContent, Scripts | Toda app | `@tanstack/react-query`, `AuthProvider`, `styles.css` | ✅ Utilizado |
| `index.tsx` | Home page: hero, sobre, info, beneficios, FAQ | Visitantes | `SiteHeader`, `SiteFooter`, `Brand`, `Button`, `Accordion` | ✅ Utilizado |
| `inscricao.tsx` | Formulário de inscrição em 6 etapas | Público | `supabase`, `TurnstileWidget`, `verifyTurnstile`, `sonner` | ✅ Utilizado |
| `inscricao.sucesso.tsx` | Página de confirmação pós-inscrição | Público | `SiteHeader`, `SiteFooter`, `zod` | ✅ Utilizado |
| `consulta.tsx` | Página de consulta de inscrição | Público | `supabase`, `sonner` | ✅ Utilizado |
| `admin.tsx` | Login admin + layout (Outlet para dashboard) | Coordenação | `useAuth`, `SiteHeader`, `supabase` | ✅ Utilizado |
| `admin.dashboard.tsx` | Dashboard admin completo (tabela, CRUD, export) | Coordenação | `supabase`, `useAuth`, `xlsx`, `jspdf`, `sonner` | ✅ Utilizado |
| `README.md` | Documentação de routing conventions | Devs | — | ✅ Utilizado |
| `routeTree.gen.ts` | Árvore de rotas auto-gerada | TanStack Router | Todas as rotas | ✅ Auto-gerado |

### `src/integrations/supabase/` — Integração Supabase

| Arquivo | Responsabilidade | Quem Utiliza | Dependências | Status |
|---------|-----------------|--------------|--------------|--------|
| `client.ts` | Singleton do Supabase client (lazy Proxy) | Toda app | `@supabase/supabase-js`, `types.ts` | ✅ Utilizado |
| `auth-provider.tsx` | Provider React: sessão, login, logout, role check | `__root.tsx` | `@supabase/supabase-js`, `auth-context.ts` | ✅ Utilizado |
| `auth-context.ts` | Context + hook `useAuth` | `admin.tsx`, `admin.dashboard.tsx` | React | ✅ Utilizado |
| `auth-attacher.ts` | Middleware para anexar Bearer token a server Fn | `start.ts` | `@tanstack/react-start` | ✅ Utilizado |
| `types.ts` | Tipos Database (auto-gerado pelo Lovable) | `client.ts` | — | ✅ Utilizado |

### `src/components/` — Componentes

| Arquivo | Responsabilidade | Quem Utiliza | Dependências | Status |
|---------|-----------------|--------------|--------------|--------|
| `Brand.tsx` | `LogoUCADMA`, `LogoAD` + `ASSETS` | Todas as páginas | — | ✅ Utilizado |
| `SiteHeader.tsx` | Header com navegação | Todas as páginas | `Brand`, `Button` | ✅ Utilizado |
| `SiteFooter.tsx` | Footer com informações | Todas as páginas | `Brand` | ✅ Utilizado |
| `TurnstileWidget.tsx` | Widget Cloudflare Turnstile | `inscricao.tsx` | — | ✅ Utilizado |

### `src/components/ui/` — shadcn/ui

| Arquivo | Responsabilidade | Status |
|---------|-----------------|--------|
| `button.tsx` | Componente Button com variantes | ✅ Utilizado |
| `accordion.tsx` | Accordion (Radix) | ✅ Utilizado |
| `checkbox.tsx` | Checkbox (Radix) | ✅ Utilizado |
| `dialog.tsx` | Dialog/Modal (Radix) | ✅ Utilizado |
| `input.tsx` | Input field | ✅ Utilizado |
| `label.tsx` | Label (Radix) | ✅ Utilizado |
| `progress.tsx` | Progress bar (Radix) | ✅ Utilizado |
| `radio-group.tsx` | Radio group (Radix) | ✅ Utilizado |
| `select.tsx` | Select/Combobox (Radix) | ✅ Utilizado |
| `textarea.tsx` | Textarea | ✅ Utilizado |

### `src/lib/` — Utilitários

| Arquivo | Responsabilidade | Quem Utiliza | Status |
|---------|-----------------|--------------|--------|
| `utils.ts` | `cn()` (clsx + tailwind-merge) | Todos componentes ui | ✅ Utilizado |
| `error-capture.ts` | Captura global de erros (unhandled rejection, error) | `server.ts` | ✅ Utilizado |
| `error-page.ts` | Página HTML de erro SSR | `server.ts`, `start.ts` | ✅ Utilizado |
| `verify-turnstile.ts` | Server Function para verificar Turnstile | `inscricao.tsx` | ✅ Utilizado |
| `lovable-error-reporting.ts` | Report de erros para Lovable Cloud | `__root.tsx` | ✅ Utilizado |

### `src/` — Raiz do Código Fonte

| Arquivo | Responsabilidade | Dependências | Status |
|---------|-----------------|--------------|--------|
| `router.tsx` | Factory do TanStack Router com QueryClient | `routeTree.gen.ts` | ✅ Utilizado |
| `server.ts` | Server entry (SSR error wrapper, fetch handler) | `@tanstack/react-start/server-entry` | ✅ Utilizado |
| `start.ts` | Configuração do TanStack Start (middleware, attach auth) | `@tanstack/react-start` | ✅ Utilizado |
| `styles.css` | Estilos globais Tailwind + custom properties | `__root.tsx` | ✅ Utilizado |

### `scripts/` — Scripts

| Arquivo | Responsabilidade | Dependências | Status |
|---------|-----------------|--------------|--------|
| `seed-default-admin.mjs` | Cria/atualiza admin padrão via Service Role Key | `@supabase/supabase-js` | ✅ Utilizado |
| `homologation-check.mjs` | Valida login admin, RPCs, session, logout | `@supabase/supabase-js` | ✅ Utilizado |
| `homologation-public-flow.mjs` | Valida criação + consulta de inscrição | `@supabase/supabase-js` | ✅ Utilizado |

### `supabase/migrations/` — Migrations

| Arquivo | Conteúdo | Status |
|---------|----------|--------|
| `20260603...sql` | Schema inicial: tabelas, funções RPC, RLS, grants | ✅ Aplicada |
| `20260609...sql` | Revoke excess grants, keep para authenticated | ✅ Aplicada |
| `20260609210000...sql` | Índices de performance | ✅ Aplicada |
| `20260609210001...sql` | Fix consulta por telefone (regexp_replace em ambos lados) | ✅ Aplicada |
| `20260609210002...sql` | Rate limiting (tabela + função + criar_inscricao refatorada) | ✅ Aplicada |

---

## SEÇÃO 4 — ROTAS DO SISTEMA

| Rota | Finalidade | Autenticação | Componente | Status |
|------|-----------|-------------|------------|--------|
| `/` | Landing page institucional | ❌ Pública | `Home` (`index.tsx`) | ✅ Funcional |
| `/inscricao` | Formulário de inscrição (6 etapas) | ❌ Pública | `InscricaoPage` | ✅ Funcional |
| `/inscricao/sucesso` | Confirmação pós-inscrição | ❌ Pública | `SucessoPage` | ✅ Funcional |
| `/consulta` | Consultar inscrição por termo | ❌ Pública | `ConsultaPage` | ✅ Funcional |
| `/admin` | Login admin (se em `/admin`) ou layout (se rota filha) | ✅ Necessário | `AdminAuth` | ✅ Funcional |
| `/admin/dashboard` | Painel administrativo completo | ✅ Admin | `Dashboard` | ✅ Funcional |

**Layout aninhado:**
```
__root (AuthProvider + QueryClientProvider)
├── / → Home
├── /inscricao → InscricaoPage
│   └── /inscricao/sucesso → SucessoPage
├── /consulta → ConsultaPage
└── /admin → AdminAuth | Outlet
    └── /admin/dashboard → Dashboard
```

---

## SEÇÃO 5 — AUTENTICAÇÃO

### Arquitetura
```
                    ┌─────────────────────────────────┐
                    │         __root.tsx              │
                    │   <AuthProvider>                │
                    │     <QueryClientProvider>        │
                    │        <Outlet />               │
                    └──────────┬──────────────────────┘
                               │
                    ┌──────────▼──────────────────────┐
                    │      auth-provider.tsx          │
                    │  ┌──────────────────────────┐   │
                    │  │  state: user, session,    │   │
                    │  │  isAdmin, isLoading,      │   │
                    │  │  error                    │   │
                    │  │  methods: signIn, signOut,│   │
                    │  │  refreshSession,          │   │
                    │  │  clearError               │   │
                    │  └──────────────────────────┘   │
                    └──────────┬──────────────────────┘
                               │
                    ┌──────────▼──────────────────────┐
                    │      auth-context.ts            │
                    │  AuthContext (createContext)     │
                    │  useAuth() hook                  │
                    └─────────────────────────────────┘
```

### Fluxo de Login
```
Usuário → /admin → preenche email+senha → submit()
  → signIn(email, password)
    → supabase.auth.signInWithPassword()
    → Se erro → setError() + toast()
    → Se sucesso → applySession(session)
      → checkAdminRole(userId)
        → supabase.rpc("has_role", { _user_id, _role: "admin" })
        → Se true → setIsAdmin(true)
        → Se false → signOut() + "Acesso administrativo negado"
      → navigate("/admin/dashboard")
```

### Fluxo de Logout
```
Usuário → clique "Sair" → logout()
  → supabase.auth.signOut()
  → setUser(null), setSession(null), setIsAdmin(false)
  → navigate("/admin")
```

### Persistência de Sessão
- `localStorage` (configurado em `client.ts`)
- `autoRefreshToken: true`
- `onAuthStateChange` listener no `auth-provider.tsx`
- `functionMiddleware` (`auth-attacher.ts`) anexa `Authorization: Bearer <token>` a server functions

### Roles
- `app_role` enum: `admin` | `equipe`
- Tabela `public.user_roles`
- `has_role()` RPC (SECURITY DEFINER)
- `is_staff()` RPC (verifica admin ou equipe)
- Admin dashboard verifica `has_role` diretamente + via AuthContext

### Guards
- `/admin` rota: se `pathname !== "/admin"` → renderiza `<Outlet />`, senão renderiza login
- `/admin/dashboard`: verifica `ctxIsAdmin` do AuthContext, fallback para `supabase.auth.getSession()` + `has_role()` manual
- Se não admin → logout + redirect `/admin`

### Diagrama Textual do Fluxo de Auth
```
[Browser] ←→ [TanStack Start SSR]
    │
    ├── Rota /admin
    │   ├── pathname === "/admin"? → renderiza login form
    │   └── pathname !== "/admin"? → renderiza <Outlet /> (dashboard)
    │
    ├── Rota /admin/dashboard
    │   ├── AuthContext.isAdmin === true? → carrega dashboard
    │   ├── AuthContext.isLoading? → aguarda
    │   └── Fallback: supabase.auth.getSession()
    │       ├── session? → has_role("admin")?
    │       │   ├── true → carrega dashboard
    │       │   └── false → signOut() + redirect /admin
    │       └── no session → redirect /admin
    │
    └── [Server Functions] ← auth-attacher.ts (Bearer token)
```

### Pontos de Atenção
- `noUnusedLocals: false` no tsconfig — erros não aparecem no build
- `is_staff()` não é usada no frontend atualmente (mas usada em RLS)
- Duas fontes de verdade para admin check: AuthContext + fallback manual no dashboard
- `handle_new_user()` trigger cria profile automaticamente no signup

---

## SEÇÃO 6 — SUPABASE

### Tabelas

| Tabela | Finalidade | RLS | Dependências |
|--------|-----------|-----|--------------|
| `profiles` | Perfil de usuários auth | ✅ Sim (self read, staff read) | `auth.users` |
| `user_roles` | Roles (admin/equipe) | ✅ Sim | `auth.users` |
| `responsaveis` | Dados do responsável pela criança | ✅ Sim (staff all) | — |
| `criancas` | Dados da criança + saúde + emergência | ✅ Sim (staff all) | `responsaveis` |
| `inscricoes` | Vínculo criança + protocolo + status | ✅ Sim (staff all) | `criancas` |
| `contatos` | Controle de contato com responsável | ✅ Sim (staff all) | `responsaveis` |
| `presencas` | Registro de presença por dia | ✅ Sim (staff all) | `criancas` |
| `inscricao_rate_limits` | Rate limiting (CPF) | ✅ Sim (insert anon/authenticated) | — |

### Funções RPC

| Função | Finalidade | Chamada por | Security |
|--------|-----------|-------------|----------|
| `criar_inscricao(payload JSONB)` | Cria responsável + criança + inscrição | `inscricao.tsx` (público) | SECURITY DEFINER |
| `consultar_inscricao(termo TEXT)` | Busca inscrição por protocolo/CPF/telefone | `consulta.tsx` (público) | SECURITY DEFINER |
| `has_role(_user_id, _role)` | Verifica se usuário tem role | AuthContext, Dashboard | SECURITY DEFINER |
| `is_staff(_user_id)` | Verifica se é admin ou equipe | RLS policies | SECURITY DEFINER |
| `check_inscricao_rate_limit(p_cpf)` | Rate limit check (max 3/60min) | `criar_inscricao` (internal) | SECURITY DEFINER |
| `handle_new_user()` | Trigger: cria profile no signup | `auth.users` INSERT trigger | SECURITY DEFINER |
| `tg_set_updated_at()` | Trigger: atualiza `updated_at` | `responsaveis`, `criancas` UPDATE trigger | — |

### Policies RLS
- `profiles`: leitura própria ou staff; update próprio
- `user_roles`: leitura staff ou própria; gerenciamento só admin
- `responsaveis`, `criancas`, `inscricoes`, `contatos`, `presencas`: ALL somente staff
- `inscricao_rate_limits`: insert authenticated/anon, select authenticated

### Autenticação
- Provider: Supabase Auth (email/password)
- Session storage: localStorage (client-side)
- Service Role Key: usada apenas em scripts `seed-default-admin.mjs` (não exposta ao client)
- Publishable Key: exposta ao client (VITE_)

### Storage
- **Não utilizado.** Assets (imagens) estão em `public/assets/`, servidos estaticamente.

### Integrações
- **Cloudflare Turnstile:** Widget client-side + server function para verificar token
- **Vercel:** Deploy via Nitro preset `vercel`

### Dependências Críticas
1. `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` — App não funciona sem
2. `SUPABASE_SERVICE_ROLE_KEY` — Scripts de seed/homologação
3. `VITE_TURNSTILE_SITE_KEY` — Proteção anti-bot (opcional: se ausente, Turnstile é pulado)
4. `TURNSTILE_SECRET_KEY` — Server-side verification

---

## SEÇÃO 7 — COMPONENTES PRINCIPAIS

### Componentes de Layout

| Componente | Localização | Função | Dependências | Status |
|-----------|------------|--------|--------------|--------|
| `SiteHeader` | `components/SiteHeader.tsx` | Header sticky com logo + navegação + CTA | `Brand`, `Button` | ✅ Funcional |
| `SiteFooter` | `components/SiteFooter.tsx` | Footer com contato, redes, logo | `Brand` | ✅ Funcional |
| `Brand` | `components/Brand.tsx` | Componentes de logo + constantes de assets | — | ✅ Funcional |

### Widgets

| Componente | Localização | Função | Dependências | Status |
|-----------|------------|--------|--------------|--------|
| `TurnstileWidget` | `components/TurnstileWidget.tsx` | Widget Turnstile (polling para carregar script CF) | — | ✅ Funcional |

### shadcn/ui

| Componente | Localização | Status |
|-----------|------------|--------|
| `Button` | `components/ui/button.tsx` | ✅ Utilizado em toda app |
| `Input` | `components/ui/input.tsx` | ✅ Formulários |
| `Label` | `components/ui/label.tsx` | ✅ Formulários |
| `Select` | `components/ui/select.tsx` | ✅ Dashboard (filtros, status) |
| `Checkbox` | `components/ui/checkbox.tsx` | ✅ Etapa autorizações |
| `RadioGroup` | `components/ui/radio-group.tsx` | ✅ Etapa sexo da criança |
| `Textarea` | `components/ui/textarea.tsx` | ✅ Etapa saúde |
| `Progress` | `components/ui/progress.tsx` | ✅ Barra de progresso (inscrição) |
| `Accordion` | `components/ui/accordion.tsx` | ✅ FAQ na home |
| `Dialog` | `components/ui/dialog.tsx` | ✅ Detalhes da inscrição (dashboard) |

### Componentes Intra-Rota

| Componente | Rota | Função | Status |
|-----------|------|--------|--------|
| `Home` | `/` | Landing page completa | ✅ |
| `Hero` | `/` | Seção hero com CTA | ✅ |
| `Sobre` | `/` | Seção "Sobre a EBF 2026" | ✅ |
| `Info` | `/` | Cards de informação (data, local, etc) | ✅ |
| `Beneficios` | `/` | Grid de benefícios | ✅ |
| `FAQ` | `/` | Accordion de perguntas frequentes | ✅ |
| `InscricaoPage` | `/inscricao` | Formulário 6 etapas + steps components | ✅ |
| `StepResponsavel` | `/inscricao` | Etapa 1: dados do responsável | ✅ |
| `StepCrianca` | `/inscricao` | Etapa 2: dados da criança | ✅ |
| `StepSaude` | `/inscricao` | Etapa 3: dados de saúde | ✅ |
| `StepEmergencia` | `/inscricao` | Etapa 4: contato de emergência | ✅ |
| `StepAutorizacoes` | `/inscricao` | Etapa 5: autorizações | ✅ |
| `StepConfirmacao` | `/inscricao` | Etapa 6: confirmação | ✅ |
| `SucessoPage` | `/inscricao/sucesso` | Tela de confirmação com protocolo | ✅ |
| `ConsultaPage` | `/consulta` | Busca + resultados | ✅ |
| `AdminAuth` | `/admin` | Login form + layout | ✅ |
| `Dashboard` | `/admin/dashboard` | Painel completo | ✅ |

---

## SEÇÃO 8 — ESTADO ATUAL DO ADMIN

### Login
- Formulário em `/admin` com email + senha
- Email padrão: `admin@ebf2026.local`
- Senha padrão: `EBF-admin2026` (definida em `scripts/seed-default-admin.mjs`)
- Valida via `has_role` RPC
- Se falhar (não admin), faz signOut automático

### Dashboard
- Tabela com todas inscrições
- Filtros: texto, faixa etária, turma, sexo, data (de/até)
- CRUD de status: Inscrito → Confirmado → Presente → Cancelado
- Registro de presença por data (upsert em `presencas`)
- Se marcar "presente", status da inscrição muda para "Presente"
- Exportação: CSV, XLSX, PDF (com escopos: filtrada, completa, turma, faixa)
- Modal de detalhes com dados completos
- Estatísticas: total, meninos/meninas, alertas saúde, por faixa, por turma
- Design responsivo, suporte a impressão

### Permissões
- Role `admin` necessária
- Verificação dupla:
  1. AuthContext.isAdmin (rápido, cache)
  2. Fallback: `supabase.auth.getSession()` + `has_role()` RPC
- Se falhar: signOut + redirect

### Problemas Conhecidos (Corrigidos)
1. **`consultar_inscricao` buscava telefone sem normalizar** → Migration 20260609210001 adicionou `regexp_replace` em ambos lados
2. **Grants excessivos para `anon`** → Migration 20260609205104 revogou para funções internas (`has_role`, `is_staff`, `handle_new_user`, `tg_set_updated_at`)
3. **Sem proteção contra abuso** → Migration 20260609210002 adicionou rate limiting
4. **Erros SSR eram engolidos pelo h3** → `server.ts` implementa `normalizeCatastrophicSsrResponse` + `error-capture.ts`

### Correções Já Realizadas (Nesta Sessão)
- Nenhuma — esta é uma auditoria, não houve modificações.

---

## SEÇÃO 9 — CÓDIGO MORTO

### Arquivos Sem Uso Aparente
| Arquivo | Motivo |
|---------|--------|
| `src/hooks/` (pasta vazia) | Pasta definida em `components.json` mas sem hooks customizados |

### Componentes Sem Uso
Nenhum identificado. Todos os componentes são importados por pelo menos uma rota.

### Hooks Sem Uso
Nenhum. A pasta `src/hooks/` está vazia, mas é referenciada nos aliases do `components.json`.

### Providers/Contextos Duplicados
Nenhum. `AuthProvider` é único, instanciado em `__root.tsx`.

### Contextos Duplicados
`AuthContext` é único, definido em `auth-context.ts`.

### Middlewares Sem Uso
- `errorMiddleware` em `start.ts` — não é referenciado externamente, mas é registrado como `requestMiddleware`
- `attachSupabaseAuth` em `auth-attacher.ts` — registrado como `functionMiddleware`

### Páginas Sem Uso
Nenhuma. Todas as 6 rotas são acessíveis e funcionais.

### Observação
- `contatos` (tabela e tipo) — a tabela existe no banco e no schema TypeScript, mas não há UI para criar/gerenciar contatos. Pode ser considerado código morto no frontend, mas existe para uso administrativo futuro.

---

## SEÇÃO 10 — DÉBITOS TÉCNICOS

### 🔴 ALTA PRIORIDADE

| ID | Problema | Localização | Detalhes |
|----|---------|------------|----------|
| A1 | **`.env` versionado no Git** | Raiz | Credenciais Supabase (incluindo SERVICE_ROLE_KEY) estão em `.env` rastreado pelo Git. Risco de vazamento. | 
| A2 | **`noUnusedLocals: false`** | `tsconfig.json` | Permite variáveis não utilizadas sem erro. Reduz qualidade do código. |
| A3 | **`noUnusedParameters: false`** | `tsconfig.json` | Permite parâmetros não utilizados sem erro. |
| A4 | **`@ts-nocheck` no `routeTree.gen.ts`** | `routeTree.gen.ts:3` | Arquivo gerado com type checking desabilitado. Perde proteção de tipos. |

### 🟡 MÉDIA PRIORIDADE

| ID | Problema | Localização | Detalhes |
|----|---------|------------|----------|
| B1 | **AuthContext + fallback duplicado** | `admin.dashboard.tsx:255-322` | Lógica de verificação de admin existe em 2 lugares (AuthContext + fallback manual). Pode causar race conditions. |
| B2 | **Polling para Turnstile** | `TurnstileWidget.tsx:49-60` | Usa `setInterval` de 200ms para detectar window.turnstile. Frágil e ineficiente. |
| B3 | **Status default `confirmada` no banco vs `Inscrito` no frontend** | Migration vs `admin.dashboard.tsx:140` | Migration define `DEFAULT 'confirmada'`, mas normalizeStatus mapeia para `Inscrito`. Inconsistência semântica. |
| B4 | **Nitro beta (`260603-beta`)** | `package.json:60` | `nitro@3.0.260603-beta` — versão beta em produção. Risco de bugs ou breaking changes. |
| B5 | **Honeypot field acessível via tab (apesar de `tabIndex={-1}`)** | `inscricao.tsx:204-217` | Honeypot usa `style` para esconder mas `tabIndex={-1}` pode não ser respeitado por todos leitores de tela. |
| B6 | **Service Role Key exposta em scripts** | `scripts/seed-default-admin.mjs` | Script usa `SUPABASE_SERVICE_ROLE_KEY` via env. Risco se o env vazar em logs. |

### 🟢 BAIXA PRIORIDADE

| ID | Problema | Localização | Detalhes |
|----|---------|------------|----------|
| C1 | **`href="#"` em redes sociais** | `SiteFooter.tsx:34,39` | Links do Instagram e Facebook apontam para `#`. |
| C2 | **Hard-coded admin email no frontend** | `admin.tsx:21` | `admin@ebf2026.local` exibido na UI. |
| C3 | **console.log() statements no dashboard** | `admin.dashboard.tsx:256,260,271,276,280,289,296,303,311` | Logs de debug em produção. |
| C4 | **`lang="en"` no HTML** | `__root.tsx:111` | App em português, mas HTML lang está como "en". |
| C5 | **Meta tags genéricas no root** | `__root.tsx:81-82` | "Lovable App" e "Lovable Generated Project" como fallback. |
| C6 | **Assets JSON em `src/assets/`** | `src/assets/*.png.asset.json` | Arquivos de metadados de imagem (provavelmente auto-gerados pelo Lovable). Sem utilidade clara. |
| C7 | **Pasta `dist/` versionada (não está no .gitignore?)** | `dist/` | Verificar se `dist/` está ou não no `.gitignore`. O `.gitignore` lista `dist` sem barra, então deve estar ignorado. |
| C8 | **Key `admin:seed` usa `--env-file` (Node 20+)** | `package.json:14` | Depende de Node 20+ para `--env-file`. |

---

## SEÇÃO 11 — PRONTIDÃO PARA PRODUÇÃO

### Avaliação por Categoria (0–10)

| Categoria | Nota | Justificativa |
|-----------|------|---------------|
| **Build** | 8/10 | Build funcional com Nitro + Vercel. Beta do Nitro é risco. |
| **Autenticação** | 7/10 | Fluxo funcional, mas dupla verificação de admin é redundante. Service Role Key no .env versionado. |
| **Rotas** | 9/10 | Todas as 6 rotas funcionais. Layout aninhado correto. File-based routing funcional. |
| **Banco** | 8/10 | Migrations versionadas, RLS ativo, índices de performance, rate limiting. Faltam políticas para anon nas tabelas públicas. |
| **Segurança** | 6/10 | Turnstile + rate limit + RLS. Mas .env versionado, service role key exposta em scripts, e RLS policies permitem insert anon em `inscricao_rate_limits` sem controle de IP real. |
| **UX** | 8/10 | Formulário multi-etapas, progresso, toast, suporte a impressão, responsivo. Honeypot + Turnstile são transparentes. |
| **Performance** | 7/10 | Índices aplicados, SSR otimizado. `setInterval` polling no Turnstile é ineficiente. Nenhum lazy loading de componentes pesados. |
| **Observabilidade** | 4/10 | Apenas `console.log` e `console.error`. Sem logs estruturados, sem monitoramento, sem métricas. Lovable error reporting existe mas não há dashboard de erros. |

### Nota Geral: **7.1 / 10**

---

## SEÇÃO 12 — PLANO DE AÇÃO

### PRIORIDADE 1 — Impedem Lançamento

| ID | Ação | Esforço | Impacto |
|----|------|---------|---------|
| 1.1 | **Remover `.env` do Git** e adicionar ao `.gitignore`. Usar variáveis de ambiente na Vercel. | 1h | 🔴 Evita vazamento de SERVICE_ROLE_KEY |
| 1.2 | **Criar política RLS para anon** nas tabelas públicas (`responsaveis`, `criancas`, `inscricoes`). Atualmente, anon não consegue inserir diretamente (confia apenas nas RPCs SECURITY DEFINER). Mas RLS bloqueia inserções diretas legítimas se houver necessidade futura. Verificar se as RPCs são suficientes. | 2h | 🟡 Garantir que fluxo público funciona |
| 1.3 | **Corrigir `lang="en"` para `lang="pt-BR"`** | 5min | 🟢 SEO e acessibilidade |
| 1.4 | **Atualizar meta tags genéricas** no `__root.tsx` para o nome real do projeto | 10min | 🟢 SEO |

### PRIORIDADE 2 — Melhorias Importantes

| ID | Ação | Esforço | Impacto |
|----|------|---------|---------|
| 2.1 | **Refatorar verificação de admin** — unificar AuthContext sem fallback manual no dashboard | 4h | 🟡 Reduz complexidade |
| 2.2 | **Substituir `setInterval` do Turnstile** por evento `onload` ou MutationObserver | 2h | 🟡 Performance e confiabilidade |
| 2.3 | **Remover `console.log` do dashboard** antes de produção | 30min | 🟢 Clean code |
| 2.4 | **Adicionar links reais de redes sociais** no footer | 10min | 🟢 UX |
| 2.5 | **Configurar ESLint com `noUnusedLocals: true`** e limpar warnings | 2h | 🟡 Qualidade de código |
| 2.6 | **Criar UI para tabela `contatos`** ou remover do schema se não for usar | 4h | 🟡 Consistência |
| 2.7 | **Adicionar tratamento de erro 404 customizado** (já existe em `__root.tsx`, mas testar) | 1h | 🟢 UX |

### PRIORIDADE 3 — Otimizações Futuras

| ID | Ação | Esforço | Impacto |
|----|------|---------|---------|
| 3.1 | **Adicionar lazy loading** para `jspdf` e `xlsx` (já são dynamic imports, mas verificar) | 1h | 🟢 Performance |
| 3.2 | **Implementar logs estruturados** (ex: `pino` ou `consola`) | 4h | 🟢 Observabilidade |
| 3.3 | **Adicionar testes automatizados** (Vitest + Testing Library) | 16h+ | 🟡 Qualidade |
| 3.4 | **CI/CD com GitHub Actions** para lint + typecheck + build | 4h | 🟡 Qualidade |
| 3.5 | **Monitoramento de erros** (Sentry ou similar) | 4h | 🟡 Observabilidade |
| 3.6 | **Cache de queries React Query** para dashboard (evitar fetch em toda navegação) | 2h | 🟢 Performance |
| 3.7 | **Página de administração de usuários** (criar/remover admins) | 8h | 🟡 Funcionalidade |
| 3.8 | **Rate limiting por IP real** (atualmente só por CPF) | 4h | 🟡 Segurança |

---

## SEÇÃO 13 — RESUMO EXECUTIVO

### 1. O projeto está funcional?
✅ **Sim.** O sistema de inscrição pública (6 etapas + Turnstile + rate limit), consulta pública, login admin e dashboard completo estão funcionais e integrados ao Supabase.

### 2. O projeto pode ser lançado hoje?
⚠️ **Com ressalvas.** O maior risco é o arquivo `.env` versionado no Git contendo a `SUPABASE_SERVICE_ROLE_KEY`. Isso precisa ser removido **antes** de qualquer deploy público. Fora isso, o core está funcional.

### 3. O que falta para produção?
1. **Remover `.env` do versionamento Git** (prioridade máxima)
2. **Configurar variáveis de ambiente na Vercel** (todas as `SUPABASE_*` e `TURNSTILE_*`)
3. **Trocar `lang="en"` para `lang="pt-BR"`** no `__root.tsx`
4. **Atualizar meta tags do `__root.tsx`** para o projeto real
5. **Homologação completa** via scripts (`homolog:check` + `homolog:public-flow`)
6. **Build de produção** validado (`npm run build`)
7. **Redes sociais com links reais** (ou ocultar se não disponível)

### 4. Quais riscos permanecem?
| Risco | Severidade | Mitigação |
|-------|-----------|-----------|
| `.env` versionado com SERVICE_ROLE_KEY | 🔴 Crítico | Remover do Git + adicionar ao .gitignore |
| Nitro beta em produção | 🟡 Médio | Monitorar atualizações, testar build |
| RLS não protege tabelas públicas contra insert direto (confia em RPCs) | 🟡 Médio | Verificar se RPCs SECURITY DEFINER são suficientes |
| Turnstile é opcional (se `VITE_TURNSTILE_SITE_KEY` não definida) | 🟢 Baixo | Garantir que esteja configurado em produção |
| Sem testes automatizados | 🟡 Médio | Adicionar testes gradualmente |

### 5. Qual o próximo passo recomendado?
1. **Imediato:** `git rm --cached .env` + adicionar `.env` ao `.gitignore` + rodar seed admin em produção
2. **Imediato:** Rodar `npm run homolog:check` e `npm run homolog:public-flow` contra produção
3. **Curto prazo:** Fazer as correções de PRIORIDADE 1 (meta tags, lang, RLS)
4. **Médio prazo:** Refatorar dupla verificação de admin e polling do Turnstile
5. **Contínuo:** Adicionar testes, CI/CD, e monitoramento
