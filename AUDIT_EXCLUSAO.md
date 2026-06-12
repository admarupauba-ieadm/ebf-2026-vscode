# Auditoria: Exclusão Física de Inscrições (Admin)

**Data:** 13/06/2026
**Projeto:** EBF 2026 Connect Hub
**Objetivo:** Implementar exclusão física segura de inscrições no painel administrativo

---

## Funcionalidade

Permitir que administradores removam permanentemente uma inscrição, com remoção em cascata da criança (se sem outras inscrições) e do responsável (se sem outros filhos).

### Fluxo de exclusão

```
Inscrição → Criança → Responsável

1. Localizar inscrição
2. Obter criança vinculada
3. Obter responsável vinculado
4. Excluir inscrição
5. Se criança sem outras inscrições → excluir criança (e presenças)
6. Se responsável sem outras crianças → excluir responsável (e contatos)
```

---

## Arquivos Alterados / Criados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/migrations/20260613000000_admin_delete_inscricao.sql` | **Criado** | RPC `admin_delete_inscricao(UUID)` |
| `src/integrations/supabase/types.ts` | **Modificado** | Adicionado `admin_delete_inscricao` ao schema Functions |
| `src/routes/admin.dashboard.tsx` | **Modificado** | `confirmDelete` usa RPC; modal com mensagem de aviso |

---

## Checklist de Requisitos

### 1. Interface

| Item | Status |
|------|:------:|
| Botão "Excluir" na tabela (ícone lixeira, `Trash2`) | ✅ OK (existente) |
| Modal de confirmação com mensagem de aviso | ✅ OK |
| Mensagem: "ATENÇÃO: Esta ação excluirá permanentemente..." | ✅ OK |
| Botão "Sim, excluir" desabilitado durante operação | ✅ OK |
| Feedback visual (toast com resultado) | ✅ OK |

### 2. Segurança

| Item | Status |
|------|:------:|
| Apenas admin pode chamar a RPC | ✅ Corrigido |
| Validação de permissão no backend (`has_role(auth.uid(), 'admin')`) | ✅ OK |
| RPC com `SECURITY DEFINER` (acesso controlado) | ✅ OK |
| `GRANT EXECUTE` apenas para `authenticated` | ✅ OK |
| Proteção via RLS (tabelas já protegidas para staff) | ✅ OK |

### 3. Exclusão em cascata

| Item | Status |
|------|:------:|
| Inscrição sempre removida | ✅ OK |
| Criança removida se não houver outras inscrições | ✅ OK |
| Presenças da criança removidas | ✅ OK |
| Responsável removido se não houver outras crianças | ✅ OK |
| Contatos do responsável removidos | ✅ OK |

### 4. Banco de dados

| Item | Status |
|------|:------:|
| RPC `admin_delete_inscricao(p_inscricao_id UUID)` | ✅ OK |
| Executa tudo em transação (plpgsql block) | ✅ OK |
| Retorna JSON com `success`, `inscricao_removida`, `crianca_removida`, `responsavel_removido` | ✅ OK |
| Migration versionada | ✅ OK |

### 5. Tratamento de erros

| Item | Status |
|------|:------:|
| Inscrição inexistente → RAISE com hint | ✅ OK |
| Permissão insuficiente → RAISE com hint | ✅ OK |
| Falha de banco → propagada automaticamente | ✅ OK |
| Relacionamentos inesperados → tratados pela transação | ✅ OK |

### 6. Testes

| # | Cenário | Resultado |
|:-:|---------|:---------:|
| 1 | Excluir inscrição única (responsável + criança isolados) | ✅ Aprovado |
| 2 | Excluir inscrição de responsável com múltiplos filhos | ✅ Aprovado |
| 3 | Criança com múltiplas inscrições (excluir 1, manter criança) | ✅ Aprovado |
| 4 | Tentativa sem permissão de admin | ✅ Aprovado |
| 5 | Tentativa com id de inscrição inexistente | ✅ Aprovado |

---

## Resultado dos Testes

### Teste 1: Exclusão única

```
Entrada: Responsável com 1 criança e 1 inscrição
Esperado: inscricao_removida=true, crianca_removida=true, responsavel_removido=true
Resultado: ✅ Todos os 3 flags true. Registros fisicamente removidos.
```

### Teste 2: Responsável com múltiplos filhos

```
Entrada: Responsável com 2 crianças (cada uma com 1 inscrição), excluir 1
Esperado: inscricao_removida=true, crianca_removida=true, responsavel_removido=false
Resultado: ✅ Apenas 1 filho removido. Responsável e outro filho preservados.
```

### Teste 3: Criança com múltiplas inscrições

```
Entrada: 1 criança com 2 inscrições, excluir 1
Esperado: inscricao_removida=true, crianca_removida=false, responsavel_removido=false
Resultado: ✅ Apenas 1 inscrição removida. Criança e outra inscrição preservados.
```

### Teste 4: Sem permissão

```
Entrada: Chamar admin_delete_inscricao sem ser admin
Esperado: Exceção "Acesso negado. Apenas administradores podem excluir inscrições."
Resultado: ✅ Exceção lançada corretamente. Nenhum dado alterado.
```

### Teste 5: ID inexistente

```
Entrada: Chamar admin_delete_inscricao com UUID inexistente
Esperado: Exceção "Inscrição não encontrada: {id}"
Resultado: ✅ Exceção lançada corretamente.
```

---

## Exemplo de uso (RPC)

```sql
-- Chamada bem-sucedida (admin)
SELECT public.admin_delete_inscricao('uuid-da-inscricao');
-- Retorno: {"success": true, "inscricao_removida": true, "crianca_removida": true, "responsavel_removido": false}
```

## Exemplo de resposta no frontend

```json
{
  "success": true,
  "inscricao_removida": true,
  "crianca_removida": true,
  "responsavel_removido": false
}
```

Toast exibido ao admin: *"Inscrição removida. Dados da criança removidos."*

---

## Observações

- A RPC é `SECURITY DEFINER` e valida permissão internamente via `public.has_role(auth.uid(), 'admin')`
- As FKs das tabelas possuem `ON DELETE CASCADE`, mas a RPC faz a exclusão manualmente (passo a passo) para controle total e relatório do que foi removido
- Presenças e contatos são explicitamente removidos antes da criança/responsável para evitar erros de FK
- Nenhum registro de teste permanece no banco (limpeza executada após cada cenário)
- Migration aplicada com sucesso no projeto `fwaiaxfbyuvjqelvuivz`
