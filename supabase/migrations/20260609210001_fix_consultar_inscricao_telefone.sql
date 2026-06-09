-- Fix consultar_inscricao: telefone search must strip formatting from both sides
CREATE OR REPLACE FUNCTION public.consultar_inscricao(termo TEXT)
RETURNS TABLE(
  protocolo TEXT, status TEXT, data_inscricao TIMESTAMPTZ,
  crianca_nome TEXT, crianca_idade INT, crianca_sexo TEXT,
  responsavel_nome TEXT, responsavel_telefone TEXT, igreja TEXT
) LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.protocolo, i.status, i.data_inscricao,
         c.nome, c.idade, c.sexo,
         r.nome, r.telefone, r.igreja
  FROM public.inscricoes i
  JOIN public.criancas c ON c.id = i.crianca_id
  JOIN public.responsaveis r ON r.id = c.responsavel_id
  WHERE i.protocolo = upper(termo)
     OR r.cpf = regexp_replace(termo,'\D','','g')
     OR regexp_replace(r.telefone, '\D', '', 'g') = regexp_replace(termo, '\D', '', 'g')
$$;
