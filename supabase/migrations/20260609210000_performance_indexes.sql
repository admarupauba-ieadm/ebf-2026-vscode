-- Performance indexes for production workloads
-- Consulta queries search by telefone and protocolo
CREATE INDEX IF NOT EXISTS idx_responsaveis_telefone ON public.responsaveis (telefone);

-- Admin dashboard orders by data_inscricao DESC
CREATE INDEX IF NOT EXISTS idx_inscricoes_data_inscricao ON public.inscricoes (data_inscricao DESC);

-- Admin dashboard searches by nome and protocolo
CREATE INDEX IF NOT EXISTS idx_criancas_nome ON public.criancas (nome);
CREATE INDEX IF NOT EXISTS idx_inscricoes_protocolo ON public.inscricoes (protocolo);
CREATE INDEX IF NOT EXISTS idx_criancas_responsavel_id ON public.criancas (responsavel_id);
