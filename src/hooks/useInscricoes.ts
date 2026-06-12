import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  DashboardRow,
  StatusOption,
  AgeRangeFilter,
  PresenceOption,
} from "@/components/admin/types";
import { normalizeStatus, normalizeSexo, rangeFromAge } from "@/components/admin/utils";
import { AGE_RANGE_MAP } from "@/components/admin/types";

type RawPresence = { data: string | null; status: PresenceOption | null };
type RawResponsavel = {
  nome: string | null;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  igreja: string | null;
} | null;
type RawCrianca = {
  id: string;
  nome: string;
  idade: number;
  sexo: string | null;
  turma: string | null;
  alergias: string | null;
  medicamentos: string | null;
  necessidades_especiais: string | null;
  restricoes_alimentares: string | null;
  emergencia_nome: string | null;
  emergencia_telefone: string | null;
  emergencia_parentesco: string | null;
  responsavel: RawResponsavel;
  presencas: RawPresence[] | null;
} | null;
type RawInscricao = {
  id: string;
  protocolo: string;
  status: string | null;
  data_inscricao: string;
  crianca: RawCrianca;
};

const SELECT_INSCRICOES =
  "id, protocolo, status, data_inscricao, crianca:criancas(id, nome, idade, sexo, turma, alergias, medicamentos, necessidades_especiais, restricoes_alimentares, emergencia_nome, emergencia_telefone, emergencia_parentesco, responsavel:responsaveis(nome, cpf, telefone, email, igreja), presencas:presencas(data, status))" as const;

function mapRawToRow(item: RawInscricao): DashboardRow | null {
  const c = item.crianca;
  if (!c) return null;
  return {
    inscricaoId: item.id,
    criancaId: c.id,
    protocolo: item.protocolo,
    status: normalizeStatus(item.status),
    dataInscricao: item.data_inscricao,
    nomeCrianca: c.nome,
    idade: c.idade,
    sexo: normalizeSexo(c.sexo),
    turma: c.turma,
    alergias: c.alergias,
    medicamentos: c.medicamentos,
    necessidadesEspeciais: c.necessidades_especiais,
    restricoesAlimentares: c.restricoes_alimentares,
    emergenciaNome: c.emergencia_nome,
    emergenciaTelefone: c.emergencia_telefone,
    emergenciaParentesco: c.emergencia_parentesco,
    responsavelNome: c.responsavel?.nome || null,
    responsavelCpf: c.responsavel?.cpf || null,
    responsavelTelefone: c.responsavel?.telefone || null,
    responsavelEmail: c.responsavel?.email || null,
    responsavelIgreja: c.responsavel?.igreja || null,
    presencas: (c.presencas || [])
      .filter((p): p is { data: string; status: PresenceOption } => !!p.data && !!p.status)
      .map((p) => ({ data: p.data, status: p.status })),
  } satisfies DashboardRow;
}

async function resolveMatchingInscricaoIds(
  search: string,
  ageFilter: AgeRangeFilter,
  turmaFilter: string,
  sexoFilter: string,
): Promise<{ inscricaoIds: string[] | null; hasFilters: boolean }> {
  const hasSearch = search.trim().length > 0;
  const hasAgeFilter = ageFilter !== "all";
  const hasTurmaFilter = turmaFilter !== "all";
  const hasSexoFilter = sexoFilter !== "all";

  if (!hasSearch && !hasAgeFilter && !hasTurmaFilter && !hasSexoFilter) {
    return { inscricaoIds: null, hasFilters: false };
  }

  const idSet = new Set<string>();

  if (hasSearch) {
    const term = search.trim();

    const { data: pData } = await supabase
      .from("inscricoes")
      .select("id")
      .ilike("protocolo", `%${term}%`);
    for (const r of pData || []) idSet.add(r.id);

    const { data: cData } = await supabase.from("criancas").select("id").ilike("nome", `%${term}%`);
    if (cData?.length) {
      const { data: ciData } = await supabase
        .from("inscricoes")
        .select("id")
        .in(
          "crianca_id",
          cData.map((c) => c.id),
        );
      for (const r of ciData || []) idSet.add(r.id);
    }

    const { data: rData } = await supabase
      .from("responsaveis")
      .select("id")
      .or(`nome.ilike.%${term}%,cpf.ilike.%${term}%,telefone.ilike.%${term}%`);
    if (rData?.length) {
      const { data: rcData } = await supabase
        .from("criancas")
        .select("id")
        .in(
          "responsavel_id",
          rData.map((r) => r.id),
        );
      if (rcData?.length) {
        const { data: riData } = await supabase
          .from("inscricoes")
          .select("id")
          .in(
            "crianca_id",
            rcData.map((c) => c.id),
          );
        for (const r of riData || []) idSet.add(r.id);
      }
    }
  }

  if (hasAgeFilter || hasTurmaFilter || hasSexoFilter) {
    let cq = supabase.from("criancas").select("id");

    if (hasAgeFilter) {
      const range = AGE_RANGE_MAP[ageFilter as Exclude<AgeRangeFilter, "all">];
      cq = cq.gte("idade", range.min);
      if (range.max !== undefined) cq = cq.lte("idade", range.max);
    }
    if (hasTurmaFilter) {
      cq = cq.eq("turma", turmaFilter);
    }
    if (hasSexoFilter) {
      cq = cq.eq("sexo", sexoFilter);
    }

    const { data: filteredCriancas } = await cq;
    const validCriancaIds = new Set(filteredCriancas?.map((c) => c.id) || []);

    if (validCriancaIds.size === 0) {
      return { inscricaoIds: [], hasFilters: true };
    }

    if (idSet.size > 0) {
      const { data: matchedInscricoes } = await supabase
        .from("inscricoes")
        .select("id, crianca_id")
        .in("id", [...idSet]);

      const surviving = new Set<string>();
      for (const ins of matchedInscricoes || []) {
        if (validCriancaIds.has(ins.crianca_id)) surviving.add(ins.id);
      }
      return { inscricaoIds: [...surviving], hasFilters: true };
    }

    const { data: insData } = await supabase
      .from("inscricoes")
      .select("id")
      .in("crianca_id", [...validCriancaIds]);
    for (const r of insData || []) idSet.add(r.id);
  }

  return { inscricaoIds: [...idSet], hasFilters: true };
}

export interface InscricaoFilters {
  search: string;
  ageFilter: AgeRangeFilter;
  turmaFilter: string;
  sexoFilter: string;
  dateFromFilter: string;
  dateToFilter: string;
}

interface Stats {
  total: number;
  masc: number;
  fem: number;
  comAlergia: number;
  faixa: Record<Exclude<AgeRangeFilter, "all">, number>;
  turma: Record<string, number>;
}

export interface UseInscricoesResult {
  rows: DashboardRow[];
  totalCount: number;
  loadingPage: boolean;
  turmaOptions: string[];
  stats: Stats;
  refresh: () => void;
}

export function useInscricoes(
  filters: InscricaoFilters,
  page: number,
  pageSize: number,
  admin: boolean,
): UseInscricoesResult {
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingPage, setLoadingPage] = useState(false);
  const refreshRef = useRef(0);

  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!admin) return;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    const { search, ageFilter, turmaFilter, sexoFilter, dateFromFilter, dateToFilter } = filters;

    let cancelled = false;

    (async () => {
      setLoadingPage(true);

      try {
        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;

        const { inscricaoIds, hasFilters } = await resolveMatchingInscricaoIds(
          search,
          ageFilter,
          turmaFilter,
          sexoFilter,
        );

        if (controller.signal.aborted) return;
        if (cancelled) return;

        if (hasFilters && inscricaoIds !== null && inscricaoIds.length === 0) {
          setRows([]);
          setTotalCount(0);
          setLoadingPage(false);
          return;
        }

        let query = supabase
          .from("inscricoes")
          .select(SELECT_INSCRICOES, { count: "exact" })
          .order("data_inscricao", { ascending: false })
          .range(start, end);

        if (inscricaoIds !== null) {
          query = query.in("id", inscricaoIds);
        }

        if (dateFromFilter) {
          query = query.gte("data_inscricao", `${dateFromFilter}T00:00:00`);
        }
        if (dateToFilter) {
          query = query.lte("data_inscricao", `${dateToFilter}T23:59:59`);
        }

        const { data, error, count } = await query;
        if (cancelled) return;

        if (error) {
          toast.error(error.message);
          return;
        }

        const mapped: DashboardRow[] = ((data || []) as RawInscricao[])
          .map((item) => mapRawToRow(item))
          .filter((item): item is DashboardRow => !!item);

        setRows(mapped);
        setTotalCount(count ?? 0);
      } finally {
        if (!cancelled) setLoadingPage(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    admin,
    page,
    pageSize,
    filters.search,
    filters.ageFilter,
    filters.turmaFilter,
    filters.sexoFilter,
    filters.dateFromFilter,
    filters.dateToFilter,
    refreshRef.current,
  ]);

  const turmaOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      if (row.turma && row.turma.trim()) set.add(row.turma.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [rows]);

  const stats = useMemo(() => {
    const source = rows;
    const total = source.length;
    const masc = source.filter((r) => r.sexo === "masculino").length;
    const fem = source.filter((r) => r.sexo === "feminino").length;
    const comAlergia = source.filter(
      (r) =>
        (r.alergias && r.alergias.trim().length > 0) ||
        (r.necessidadesEspeciais && r.necessidadesEspeciais.trim().length > 0),
    ).length;

    const faixa = {
      "0-3": 0,
      "4-6": 0,
      "7-9": 0,
      "10-12": 0,
      "13+": 0,
    } as Record<Exclude<AgeRangeFilter, "all">, number>;

    const turma: Record<string, number> = {};
    for (const r of source) {
      faixa[rangeFromAge(r.idade)] += 1;
      const key = r.turma?.trim() || "Não definida";
      turma[key] = (turma[key] || 0) + 1;
    }

    return { total, masc, fem, comAlergia, faixa, turma };
  }, [rows]);

  const refresh = useCallback(() => {
    refreshRef.current += 1;
  }, []);

  return { rows, totalCount, loadingPage, turmaOptions, stats, refresh };
}
