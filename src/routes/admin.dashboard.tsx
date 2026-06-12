import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth-context";
import { LogoUCADMA, LogoAD } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Baby,
  BadgeCheck,
  Heart,
  LogOut,
  Search,
  ShieldAlert,
  Eye,
  FileSpreadsheet,
  FileText,
  FileType2,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Painel Administrativo · EBF 2026" }] }),
  component: Dashboard,
});

type DashboardRow = {
  inscricaoId: string;
  criancaId: string;
  protocolo: string;
  status: StatusOption;
  dataInscricao: string;
  nomeCrianca: string;
  idade: number;
  sexo: string;
  turma: string | null;
  alergias: string | null;
  medicamentos: string | null;
  necessidadesEspeciais: string | null;
  restricoesAlimentares: string | null;
  emergenciaNome: string | null;
  emergenciaTelefone: string | null;
  emergenciaParentesco: string | null;
  responsavelNome: string | null;
  responsavelCpf: string | null;
  responsavelTelefone: string | null;
  responsavelEmail: string | null;
  responsavelIgreja: string | null;
  presencas: { data: string; status: PresenceOption }[];
};

type ExportScope = "completa" | "filtrada" | "turma" | "faixa";
type AgeRangeFilter = "all" | "0-3" | "4-6" | "7-9" | "10-12" | "13+";
type StatusOption = "Inscrito" | "Confirmado" | "Presente" | "Cancelado";
type PresenceOption = "presente" | "faltou" | "justificado";
type ExportAction = "csv" | "xlsx" | "pdf";

const STATUS_OPTIONS: StatusOption[] = ["Inscrito", "Confirmado", "Presente", "Cancelado"];
const PRESENCE_OPTIONS: PresenceOption[] = ["presente", "faltou", "justificado"];
const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

const AGE_RANGE_MAP: Record<Exclude<AgeRangeFilter, "all">, { min: number; max?: number }> = {
  "0-3": { min: 0, max: 3 },
  "4-6": { min: 4, max: 6 },
  "7-9": { min: 7, max: 9 },
  "10-12": { min: 10, max: 12 },
  "13+": { min: 13 },
};

const AGE_RANGE_OPTIONS: { value: AgeRangeFilter; label: string }[] = [
  { value: "all", label: "Todas as idades" },
  { value: "0-3", label: "0 a 3 anos" },
  { value: "4-6", label: "4 a 6 anos" },
  { value: "7-9", label: "7 a 9 anos" },
  { value: "10-12", label: "10 a 12 anos" },
  { value: "13+", label: "13+ anos" },
];

const todayIso = new Date().toISOString().slice(0, 10);

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

function normalizeStatus(input: string | null | undefined): StatusOption {
  const value = (input || "").trim().toLowerCase();
  if (value.startsWith("confirm")) return "Confirmado";
  if (value.startsWith("pres")) return "Presente";
  if (value.startsWith("cancel")) return "Cancelado";
  return "Inscrito";
}

function normalizeSexo(input: string | null | undefined) {
  const value = (input || "").trim().toLowerCase();
  if (value.startsWith("m")) return "masculino";
  if (value.startsWith("f")) return "feminino";
  return value || "-";
}

function rangeFromAge(age: number): Exclude<AgeRangeFilter, "all"> {
  if (age <= 3) return "0-3";
  if (age <= 6) return "4-6";
  if (age <= 9) return "7-9";
  if (age <= 12) return "10-12";
  return "13+";
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function fmtDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

function Dashboard() {
  const navigate = useNavigate();
  const {
    isAdmin: ctxIsAdmin,
    isLoading: ctxLoading,
    user: ctxUser,
  } = useAuth();
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<DashboardRow[]>([]);

  const [search, setSearch] = useState("");
  const [ageFilter, setAgeFilter] = useState<AgeRangeFilter>("all");
  const [turmaFilter, setTurmaFilter] = useState("all");
  const [sexoFilter, setSexoFilter] = useState("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");

  const [attendanceDate, setAttendanceDate] = useState(todayIso);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [savingPresenceId, setSavingPresenceId] = useState<string | null>(null);

  const [detailRow, setDetailRow] = useState<DashboardRow | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingPage, setLoadingPage] = useState(false);

  const [exportScope, setExportScope] = useState<ExportScope>("filtrada");
  const [exportTurma, setExportTurma] = useState("all");
  const [exportFaixa, setExportFaixa] = useState<AgeRangeFilter>("all");
  const [exportingType, setExportingType] = useState<ExportAction | null>(null);

  const [pendingStatusChange, setPendingStatusChange] = useState<{
    row: DashboardRow;
    newStatus: StatusOption;
  } | null>(null);

  const [pendingDelete, setPendingDelete] = useState<DashboardRow | null>(null);

  const SELECT_INSCRICOES = `id, protocolo, status, data_inscricao, crianca:criancas(id, nome, idade, sexo, turma, alergias, medicamentos, necessidades_especiais, restricoes_alimentares, emergencia_nome, emergencia_telefone, emergencia_parentesco, responsavel:responsaveis(nome, cpf, telefone, email, igreja), presencas:presencas(data, status))` as const;

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

  async function resolveMatchingInscricaoIds(): Promise<{
    inscricaoIds: string[] | null;
    hasFilters: boolean;
  }> {
    const hasSearch = search.trim().length > 0;
    const hasAgeFilter = ageFilter !== "all";
    const hasTurmaFilter = turmaFilter !== "all";
    const hasSexoFilter = sexoFilter !== "all";

    if (!hasSearch && !hasAgeFilter && !hasTurmaFilter && !hasSexoFilter) {
      return { inscricaoIds: null, hasFilters: false };
    }

    const idSet = new Set<string>();

    // Phase 1a: text search — OR across protocolo, crianca.nome, responsavel.{nome,cpf,telefone}
    if (hasSearch) {
      const term = search.trim();

      // Search protocolo on inscricoes
      const { data: pData } = await supabase
        .from("inscricoes")
        .select("id")
        .ilike("protocolo", `%${term}%`);
      for (const r of pData || []) idSet.add(r.id);

      // Search crianca.nome
      const { data: cData } = await supabase
        .from("criancas")
        .select("id")
        .ilike("nome", `%${term}%`);
      if (cData?.length) {
        const { data: ciData } = await supabase
          .from("inscricoes")
          .select("id")
          .in("crianca_id", cData.map((c) => c.id));
        for (const r of ciData || []) idSet.add(r.id);
      }

      // Search responsavel.{nome,cpf,telefone}
      const { data: rData } = await supabase
        .from("responsaveis")
        .select("id")
        .or(
          `nome.ilike.%${term}%,cpf.ilike.%${term}%,telefone.ilike.%${term}%`,
        );
      if (rData?.length) {
        const { data: rcData } = await supabase
          .from("criancas")
          .select("id")
          .in("responsavel_id", rData.map((r) => r.id));
        if (rcData?.length) {
          const { data: riData } = await supabase
            .from("inscricoes")
            .select("id")
            .in("crianca_id", rcData.map((c) => c.id));
          for (const r of riData || []) idSet.add(r.id);
        }
      }
    }

    // Phase 1b: age/turma/sexo filters — AND com text search e entre si
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

      // Intersect: se idSet tem IDs de text search, filtrar por crianca_id
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

      // Only age/turma/sexo (no text search)
      const { data: insData } = await supabase
        .from("inscricoes")
        .select("id")
        .in("crianca_id", [...validCriancaIds]);
      for (const r of insData || []) idSet.add(r.id);
    }

    return { inscricaoIds: [...idSet], hasFilters: true };
  }

  async function loadRows(page: number, size: number) {
    setLoadingPage(true);

    const start = (page - 1) * size;
    const end = start + size - 1;

    const { inscricaoIds, hasFilters } = await resolveMatchingInscricaoIds();

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
    setLoadingPage(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    const mapped: DashboardRow[] = ((data || []) as RawInscricao[])
      .map((item) => mapRawToRow(item))
      .filter((item: DashboardRow | null): item is DashboardRow => !!item);

    setRows(mapped);
    setTotalCount(count ?? 0);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      if (!admin) {
        if (ctxIsAdmin && ctxUser) {
          setAdmin(true);
          setAuthUserId(ctxUser.id);
          if (!active) return;
          setLoading(false);
          return;
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (!active) return;

        if (sessionError || !sessionData.session) {
          navigate({ to: "/admin" });
          return;
        }

        const uid = sessionData.session.user.id;
        const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
          _user_id: uid,
          _role: "admin",
        });
        if (!active) return;

        if (roleError || !isAdmin) {
          await supabase.auth.signOut();
          toast.error("Acesso administrativo negado.");
          navigate({ to: "/admin" });
          return;
        }

        setAdmin(true);
        setAuthUserId(uid);
      }

      if (!active) return;
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [navigate, ctxIsAdmin, ctxLoading, ctxUser]);

  useEffect(() => {
    if (!admin) return;
    const timer = setTimeout(() => {
      void loadRows(currentPage, pageSize);
    }, 0);
    return () => clearTimeout(timer);
  }, [admin, currentPage, pageSize, search, ageFilter, turmaFilter, sexoFilter, dateFromFilter, dateToFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, ageFilter, turmaFilter, sexoFilter, dateFromFilter, dateToFilter, pageSize]);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/admin" });
  }

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

  function currentPresenceStatus(row: DashboardRow) {
    return row.presencas.find((p) => p.data === attendanceDate)?.status || "";
  }

  const adminName = useMemo(() => {
    return ctxUser?.user_metadata?.name
      || ctxUser?.user_metadata?.full_name
      || ctxUser?.email
      || "";
  }, [ctxUser]);

  const lastAccess = useMemo(() => {
    if (!ctxUser?.last_sign_in_at) return null;
    const d = new Date(ctxUser.last_sign_in_at);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }, [ctxUser]);

  async function updateStatus(inscricaoId: string, newStatus: StatusOption) {
    setSavingStatusId(inscricaoId);
    const { error } = await supabase
      .from("inscricoes")
      .update({ status: newStatus })
      .eq("id", inscricaoId);
    setSavingStatusId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    setRows((old) =>
      old.map((row) => (row.inscricaoId === inscricaoId ? { ...row, status: newStatus } : row)),
    );
    toast.success("Status atualizado.");
  }

  async function confirmStatusChange() {
    if (!pendingStatusChange) return;
    await updateStatus(pendingStatusChange.row.inscricaoId, pendingStatusChange.newStatus);
    setPendingStatusChange(null);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setSavingStatusId(pendingDelete.inscricaoId);
    const { data, error } = await supabase.rpc("admin_delete_inscricao", {
      p_inscricao_id: pendingDelete.inscricaoId,
    });
    setSavingStatusId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    const result = data as {
      success: boolean;
      inscricao_removida: boolean;
      crianca_removida: boolean;
      responsavel_removido: boolean;
    };

    setRows((old) => old.filter((r) => r.inscricaoId !== pendingDelete.inscricaoId));

    let msg = "Inscrição removida.";
    if (result.crianca_removida) msg += " Dados da criança removidos.";
    if (result.responsavel_removido) msg += " Dados do responsável removidos.";
    toast.success(msg);
    setPendingDelete(null);
  }

  async function registerPresence(row: DashboardRow, presenceStatus: PresenceOption) {
    if (!authUserId) return;
    setSavingPresenceId(row.criancaId);
    const { error } = await supabase.from("presencas").upsert(
      {
        crianca_id: row.criancaId,
        data: attendanceDate,
        status: presenceStatus,
        registrado_por: authUserId,
      },
      { onConflict: "crianca_id,data" },
    );

    if (error) {
      setSavingPresenceId(null);
      toast.error(error.message);
      return;
    }

    if (presenceStatus === "presente" && row.status !== "Presente") {
      await supabase.from("inscricoes").update({ status: "Presente" }).eq("id", row.inscricaoId);
    }

    setRows((old) =>
      old.map((item) => {
        if (item.criancaId !== row.criancaId) return item;
        const others = item.presencas.filter((p) => p.data !== attendanceDate);
        return {
          ...item,
          status: presenceStatus === "presente" ? "Presente" : item.status,
          presencas: [...others, { data: attendanceDate, status: presenceStatus }],
        };
      }),
    );
    setSavingPresenceId(null);
    toast.success("Presença registrada.");
  }

  function mapMedicalNotes(row: DashboardRow) {
    const parts = [
      row.alergias ? `Alergias: ${row.alergias}` : "",
      row.medicamentos ? `Medicamentos: ${row.medicamentos}` : "",
      row.necessidadesEspeciais ? `Necessidades especiais: ${row.necessidadesEspeciais}` : "",
      row.restricoesAlimentares ? `Restrições alimentares: ${row.restricoesAlimentares}` : "",
    ].filter(Boolean);
    return parts.join(" | ") || "-";
  }

  function mapEmergency(row: DashboardRow) {
    const parts = [row.emergenciaNome, row.emergenciaParentesco, row.emergenciaTelefone].filter(
      Boolean,
    );
    return parts.join(" · ") || "-";
  }

  async function fetchAllRowsForExport(): Promise<DashboardRow[]> {
    const { inscricaoIds } = await resolveMatchingInscricaoIds();

    let query = supabase
      .from("inscricoes")
      .select(SELECT_INSCRICOES)
      .order("data_inscricao", { ascending: false })
      .limit(5000);

    if (inscricaoIds !== null) {
      if (inscricaoIds.length === 0) return [];
      query = query.in("id", inscricaoIds);
    }

    if (dateFromFilter) {
      query = query.gte("data_inscricao", `${dateFromFilter}T00:00:00`);
    }
    if (dateToFilter) {
      query = query.lte("data_inscricao", `${dateToFilter}T23:59:59`);
    }

    const { data } = await query;
    return ((data || []) as RawInscricao[])
      .map((item) => mapRawToRow(item))
      .filter((item): item is DashboardRow => !!item);
  }

  function filterExportRows(allRows: DashboardRow[]): DashboardRow[] {
    if (exportScope === "completa") return allRows;
    if (exportScope === "filtrada") return allRows;
    if (exportScope === "turma") {
      if (exportTurma === "all") return allRows;
      return allRows.filter((r) => (r.turma || "") === exportTurma);
    }
    if (exportFaixa === "all") return allRows;
    return allRows.filter((r) => rangeFromAge(r.idade) === exportFaixa);
  }

  function buildExportModel(allRows: DashboardRow[]) {
    const scoped = filterExportRows(allRows);
    return scoped.map((row) => ({
      protocolo: row.protocolo,
      crianca: row.nomeCrianca,
      idade: row.idade,
      sexo: row.sexo,
      responsavel: row.responsavelNome || "-",
      telefone: row.responsavelTelefone || "-",
      observacoes_medicas: mapMedicalNotes(row),
      contato_emergencia: mapEmergency(row),
      status: row.status,
      turma: row.turma || "-",
      data_inscricao: fmtDate(row.dataInscricao),
    }));
  }

  async function exportCsv() {
    setExportingType("csv");
    try {
      const allRows = await fetchAllRowsForExport();
      const model = buildExportModel(allRows);

      if (model.length === 0) {
        toast.error("Nenhum registro para exportar.");
        return;
      }

      const headers = Object.keys(model[0]) as (keyof (typeof model)[0])[];
      const body = model.map((row) => headers.map((h) => csvEscape(row[h])).join(","));
      const csv = [headers.join(","), ...body].join("\n");

      const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ebf-2026-inscricoes-${exportScope}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exportado.");
    } catch {
      toast.error("Falha ao gerar CSV.");
    } finally {
      setExportingType(null);
    }
  }

  async function exportXlsx() {
    setExportingType("xlsx");
    try {
      const allRows = await fetchAllRowsForExport();
      const model = buildExportModel(allRows);

      if (model.length === 0) {
        toast.error("Nenhum registro para exportar.");
        return;
      }

      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(model);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inscricoes");
      XLSX.writeFile(wb, `ebf-2026-inscricoes-${exportScope}.xlsx`);
      toast.success("Excel exportado.");
    } catch {
      toast.error("Falha ao gerar Excel.");
    } finally {
      setExportingType(null);
    }
  }

  async function exportPdf() {
    setExportingType("pdf");
    try {
      const allRows = await fetchAllRowsForExport();
      const model = buildExportModel(allRows);

      if (model.length === 0) {
        toast.error("Nenhum registro para exportar.");
        return;
      }

      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFontSize(13);
      doc.text(`EBF 2026 - Exportacao ${exportScope}`, 10, 12);
      doc.setFontSize(9);
      doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 10, 17);

      let y = 24;
      for (const row of model) {
        const line = `${row.protocolo} | ${row.crianca} | ${row.idade} | ${row.sexo} | ${row.responsavel} | ${row.telefone} | ${row.observacoes_medicas} | ${row.contato_emergencia} | ${row.status}`;
        const lines = doc.splitTextToSize(line, 280);
        for (const ln of lines) {
          if (y > 195) {
            doc.addPage();
            y = 12;
          }
          doc.text(ln, 10, y);
          y += 5;
        }
        y += 1;
      }

      doc.save(`ebf-2026-inscricoes-${exportScope}.pdf`);
      toast.success("PDF exportado.");
    } catch {
      toast.error("Falha ao gerar PDF.");
    } finally {
      setExportingType(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--gold)]/30 border-t-[color:var(--gold-deep)]" />
          <span>Carregando painel administrativo...</span>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card rounded-3xl p-8 max-w-md text-center">
          <ShieldAlert className="h-16 w-16 mx-auto text-[color:var(--gold-deep)] mb-4" />
          <h1 className="font-display font-bold text-2xl mb-2">Acesso negado</h1>
          <p className="text-muted-foreground mb-4">
            Somente usuários com papel <code>admin</code> podem acessar este painel.
          </p>
          <Button onClick={logout} variant="outline">
            Sair
          </Button>
        </div>
      </div>
    );
  }

  const totalByTurma = Object.entries(stats.turma).sort((a, b) => b[1] - a[1]);

  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-[color:var(--gold)]/20 bg-background/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <LogoUCADMA className="h-10 w-10" />
            <div>
              <div className="font-display font-bold gold-text">Painel EBF 2026</div>
              <div className="text-xs text-muted-foreground">Coordenação · UCADMA Marupaúba</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <LogoAD className="h-10 w-10 hidden sm:block" />
            <div className="hidden sm:block text-right text-xs leading-tight">
              <div className="font-medium text-foreground truncate max-w-[180px]">
                {adminName}
              </div>
              {lastAccess && (
                <div className="text-muted-foreground">
                  Último acesso: {lastAccess}
                </div>
              )}
            </div>
            <Button onClick={logout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-1.5" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 print-area">
        <div className="print-only">
          <h1 className="text-2xl font-bold">EBF 2026 - Lista de Inscrições</h1>
          <p className="text-sm">
            Emissão: {new Date().toLocaleString("pt-BR")} · Registros: {rows.length}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Baby, label: "Nesta página", value: stats.total },
            { icon: Users, label: "Total (filtros)", value: totalCount },
            { icon: BadgeCheck, label: "Meninos / Meninas", value: `${stats.masc} / ${stats.fem}` },
            { icon: Heart, label: "Com alerta de saúde", value: stats.comAlergia },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-[image:var(--gradient-gold)] flex items-center justify-center text-[color:var(--royal-deep)]">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-widest">
                    {label}
                  </div>
                  <div className="font-display font-bold text-2xl">{value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="no-print glass-card rounded-2xl p-4 mb-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Protocolo, criança, responsável, CPF, telefone"
              />
            </div>

            <Select value={ageFilter} onValueChange={(v) => setAgeFilter(v as AgeRangeFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Faixa etária" />
              </SelectTrigger>
              <SelectContent>
                {AGE_RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={turmaFilter} onValueChange={setTurmaFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                {turmaOptions.map((turma) => (
                  <SelectItem key={turma} value={turma}>
                    {turma}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sexoFilter} onValueChange={setSexoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Sexo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os sexos</SelectItem>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
            />
            <Input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="no-print glass-card rounded-2xl p-4 mb-6">
          <h3 className="font-display font-bold text-lg mb-3">Exportação administrativa</h3>
          <div className="grid lg:grid-cols-4 gap-3">
            <Select value={exportScope} onValueChange={(v) => setExportScope(v as ExportScope)}>
              <SelectTrigger>
                <SelectValue placeholder="Escopo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="filtrada">Lista filtrada</SelectItem>
                <SelectItem value="completa">Lista completa</SelectItem>
                <SelectItem value="turma">Lista por turma</SelectItem>
                <SelectItem value="faixa">Lista por faixa etária</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={exportTurma}
              onValueChange={setExportTurma}
              disabled={exportScope !== "turma"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Turma para exportar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                {turmaOptions.map((turma) => (
                  <SelectItem key={turma} value={turma}>
                    {turma}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={exportFaixa}
              onValueChange={(v) => setExportFaixa(v as AgeRangeFilter)}
              disabled={exportScope !== "faixa"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Faixa para exportar" />
              </SelectTrigger>
              <SelectContent>
                {AGE_RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex flex-wrap gap-2">
              <Button onClick={exportXlsx} disabled={!!exportingType} className="flex-1">
                {exportingType === "xlsx" ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Exportando...</>
                ) : (
                  <><FileSpreadsheet className="h-4 w-4 mr-1.5" /> XLSX</>
                )}
              </Button>
              <Button
                onClick={exportCsv}
                disabled={!!exportingType}
                variant="secondary"
                className="flex-1"
              >
                {exportingType === "csv" ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Exportando...</>
                ) : (
                  <><FileText className="h-4 w-4 mr-1.5" /> CSV</>
                )}
              </Button>
              <Button
                onClick={exportPdf}
                disabled={!!exportingType}
                variant="outline"
                className="flex-1"
              >
                {exportingType === "pdf" ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Exportando...</>
                ) : (
                  <><FileType2 className="h-4 w-4 mr-1.5" /> PDF</>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="no-print glass-card rounded-2xl p-4 mb-6">
          <h3 className="font-display font-bold text-lg mb-3">Presença do evento</h3>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="max-w-[220px]"
            />
            <Button onClick={() => window.print()} variant="outline">
              <Printer className="h-4 w-4 mr-1.5" /> Imprimir lista atual
            </Button>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 relative">
          {loadingPage && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-black/60 rounded-2xl">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-[color:var(--gold)]/30 border-t-[color:var(--gold-deep)]" />
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm admin-table">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-[color:var(--gold)]/20">
                <tr>
                  <th className="py-3 px-2">Protocolo</th>
                  <th className="py-3 px-2">Criança</th>
                  <th className="py-3 px-2">Idade</th>
                  <th className="py-3 px-2">Sexo</th>
                  <th className="py-3 px-2">Turma</th>
                  <th className="py-3 px-2">Responsável</th>
                  <th className="py-3 px-2">Telefone</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2">Presença ({fmtDate(attendanceDate)})</th>
                  <th className="py-3 px-2 no-print">Presença</th>
                  <th className="py-3 px-2 no-print">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.inscricaoId}
                    className="border-b border-[color:var(--gold)]/10 hover:bg-[color:var(--gold)]/5"
                  >
                    <td className="py-3 px-2 font-mono text-xs font-bold text-[color:var(--gold-deep)]">
                      {row.protocolo}
                    </td>
                    <td className="py-3 px-2 font-medium">{row.nomeCrianca}</td>
                    <td className="py-3 px-2">{row.idade}</td>
                    <td className="py-3 px-2">{row.sexo}</td>
                    <td className="py-3 px-2">{row.turma || "—"}</td>
                    <td className="py-3 px-2">{row.responsavelNome || "—"}</td>
                    <td className="py-3 px-2">{row.responsavelTelefone || "—"}</td>
                    <td className="py-3 px-2 min-w-[170px]">
                      <span className="print-only">{row.status}</span>
                      <div className="no-print">
                        <Select
                          value={row.status}
                          onValueChange={(v) =>
                            setPendingStatusChange({ row, newStatus: v as StatusOption })
                          }
                          disabled={savingStatusId === row.inscricaoId}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                    <td className="py-3 px-2">{currentPresenceStatus(row) || "—"}</td>
                    <td className="py-3 px-2 no-print min-w-[180px]">
                      <Select
                        value={currentPresenceStatus(row) || undefined}
                        onValueChange={(v) => registerPresence(row, v as PresenceOption)}
                        disabled={savingPresenceId === row.criancaId}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Registrar" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRESENCE_OPTIONS.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 px-2 no-print">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" onClick={() => setDetailRow(row)}>
                          <Eye className="h-4 w-4 mr-1.5" /> Detalhes
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setPendingDelete(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-muted-foreground">
                      Nenhuma inscrição encontrada para os filtros informados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="no-print flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 text-sm">
          <div className="text-muted-foreground">
            {totalCount > 0 ? (
              <>
                Mostrando{" "}
                <span className="font-semibold text-foreground">
                  {(currentPage - 1) * pageSize + 1}
                  {"–"}
                  {Math.min(currentPage * pageSize, totalCount)}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-foreground">{totalCount}</span>{" "}
                inscritos
              </>
            ) : (
              <span>Nenhum inscrito encontrado</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Por página:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => setPageSize(Number(v))}
            >
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1 || loadingPage}
            >
              Primeira
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loadingPage}
            >
              Anterior
            </Button>
            <span className="px-3 py-1 text-muted-foreground">
              Pág. {currentPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage * pageSize >= totalCount || loadingPage}
            >
              Próxima
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, Math.ceil(totalCount / pageSize)))}
              disabled={currentPage * pageSize >= totalCount || loadingPage}
            >
              Última
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 mt-6">
          <div className="glass-card rounded-2xl p-4">
            <h4 className="font-display font-bold mb-2">Total por faixa etária</h4>
            <ul className="text-sm space-y-1">
              {Object.entries(stats.faixa).map(([range, count]) => (
                <li
                  key={range}
                  className="flex items-center justify-between border-b border-[color:var(--gold)]/10 py-1"
                >
                  <span>{range} anos</span>
                  <span className="font-semibold">{count}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-card rounded-2xl p-4">
            <h4 className="font-display font-bold mb-2">Total por turma</h4>
            {totalByTurma.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem turmas definidas.</p>
            ) : (
              <ul className="text-sm space-y-1">
                {totalByTurma.map(([turma, count]) => (
                  <li
                    key={turma}
                    className="flex items-center justify-between border-b border-[color:var(--gold)]/10 py-1"
                  >
                    <span>{turma}</span>
                    <span className="font-semibold">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Status change confirmation */}
      <Dialog
        open={!!pendingStatusChange}
        onOpenChange={(open) => !open && setPendingStatusChange(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar status</DialogTitle>
            <DialogDescription>
              Confirme a alteração de status da inscrição.
            </DialogDescription>
          </DialogHeader>

          {pendingStatusChange && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <div className="space-y-0.5">
                  <p>
                    <span className="font-medium">{pendingStatusChange.row.nomeCrianca}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Protocolo: {pendingStatusChange.row.protocolo}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Status atual</div>
                  <div className="font-semibold">{pendingStatusChange.row.status}</div>
                </div>
                <div className="text-muted-foreground">→</div>
                <div className="flex-1 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Novo status</div>
                  <div className="font-semibold text-[color:var(--gold-deep)]">
                    {pendingStatusChange.newStatus}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              onClick={confirmStatusChange}
              disabled={savingStatusId === pendingStatusChange?.row.inscricaoId}
            >
              {savingStatusId === pendingStatusChange?.row.inscricaoId ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Salvando...</>
              ) : (
                "Confirmar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir inscrição</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          {pendingDelete && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <div className="space-y-0.5">
                  <p className="font-medium">{pendingDelete.nomeCrianca}</p>
                  <p className="text-xs text-muted-foreground">
                    Protocolo: {pendingDelete.protocolo}
                  </p>
                </div>
              </div>

              <p className="text-muted-foreground text-xs leading-relaxed">
                <strong>ATENÇÃO:</strong> Esta ação excluirá permanentemente a
                inscrição e poderá remover também os dados da criança e do
                responsável caso não existam outros vínculos. Esta ação não pode
                ser desfeita.
              </p>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={savingStatusId === pendingDelete?.inscricaoId}
            >
              {savingStatusId === pendingDelete?.inscricaoId ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Excluindo...</>
              ) : (
                "Sim, excluir"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailRow} onOpenChange={(open) => !open && setDetailRow(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes da inscrição</DialogTitle>
            <DialogDescription>Protocolo: {detailRow?.protocolo}</DialogDescription>
          </DialogHeader>

          {detailRow && (
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <h5 className="font-semibold">Criança</h5>
                <p>Nome: {detailRow.nomeCrianca}</p>
                <p>Idade: {detailRow.idade}</p>
                <p>Sexo: {detailRow.sexo}</p>
                <p>Turma: {detailRow.turma || "Não definida"}</p>
                <p>Status: {detailRow.status}</p>
                <p>Data da inscrição: {fmtDate(detailRow.dataInscricao)}</p>
              </div>
              <div className="space-y-1">
                <h5 className="font-semibold">Responsável</h5>
                <p>Nome: {detailRow.responsavelNome || "—"}</p>
                <p>CPF: {detailRow.responsavelCpf || "—"}</p>
                <p>Telefone: {detailRow.responsavelTelefone || "—"}</p>
                <p>E-mail: {detailRow.responsavelEmail || "—"}</p>
                <p>Igreja: {detailRow.responsavelIgreja || "—"}</p>
              </div>
              <div className="md:col-span-2 space-y-1">
                <h5 className="font-semibold">Saúde e observações médicas</h5>
                <p>{mapMedicalNotes(detailRow)}</p>
              </div>
              <div className="md:col-span-2 space-y-1">
                <h5 className="font-semibold">Contato de emergência</h5>
                <p>{mapEmergency(detailRow)}</p>
              </div>
              <div className="md:col-span-2">
                <h5 className="font-semibold mb-1">Presenças registradas</h5>
                {detailRow.presencas.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma presença registrada.</p>
                ) : (
                  <ul className="space-y-1">
                    {detailRow.presencas
                      .sort((a, b) => a.data.localeCompare(b.data))
                      .map((p) => (
                        <li
                          key={`${p.data}-${p.status}`}
                          className="flex items-center justify-between border-b border-[color:var(--gold)]/10 py-1"
                        >
                          <span>{fmtDate(p.data)}</span>
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> {p.status}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
