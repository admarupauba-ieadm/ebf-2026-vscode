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
  DialogContent,
  DialogDescription,
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

const STATUS_OPTIONS: StatusOption[] = ["Inscrito", "Confirmado", "Presente", "Cancelado"];
const PRESENCE_OPTIONS: PresenceOption[] = ["presente", "faltou", "justificado"];

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

type ExportRow = {
  protocolo: string;
  crianca: string;
  idade: number;
  sexo: string;
  responsavel: string;
  telefone: string;
  observacoes_medicas: string;
  contato_emergencia: string;
  status: StatusOption;
  turma: string;
  data_inscricao: string;
};

function normalizeDigits(input: string | null | undefined) {
  return (input || "").replace(/\D/g, "");
}

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
    session: ctxSession,
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

  const [exportScope, setExportScope] = useState<ExportScope>("filtrada");
  const [exportTurma, setExportTurma] = useState("all");
  const [exportFaixa, setExportFaixa] = useState<AgeRangeFilter>("all");
  const [exporting, setExporting] = useState(false);

  async function loadRows() {
    const { data, error } = await supabase
      .from("inscricoes")
      .select(
        "id, protocolo, status, data_inscricao, crianca:criancas(id, nome, idade, sexo, turma, alergias, medicamentos, necessidades_especiais, restricoes_alimentares, emergencia_nome, emergencia_telefone, emergencia_parentesco, responsavel:responsaveis(nome, cpf, telefone, email, igreja), presencas:presencas(data, status))",
      )
      .order("data_inscricao", { ascending: false });

    if (error) {
      toast.error(error.message);
      return;
    }

    const mapped: DashboardRow[] = ((data || []) as RawInscricao[])
      .map((item) => {
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
      })
      .filter((item: DashboardRow | null): item is DashboardRow => !!item);

    setRows(mapped);
  }

  useEffect(() => {
    console.log("[Dashboard] entrada no dashboard");
    let active = true;
    (async () => {
      // 1. Try AuthContext first (fast path, avoids race condition)
      if (ctxIsAdmin && ctxUser) {
        console.log("[Dashboard] auth context já tem admin:", ctxUser.id);
        setAdmin(true);
        setAuthUserId(ctxUser.id);
        await loadRows();
        if (!active) return;
        setLoading(false);
        return;
      }

      // 2. If AuthContext is still loading, wait briefly
      if (ctxLoading) {
        console.log("[Dashboard] aguardando AuthContext carregar...");
      }

      // 3. Fallback: check session directly via supabase client
      console.log("[Dashboard] verificando sessão via supabase client...");
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;

      if (sessionError) {
        console.log("[Dashboard] erro ao carregar sessão:", sessionError.message);
        toast.error(sessionError.message);
        navigate({ to: "/admin" });
        return;
      }

      const session = sessionData.session;
      if (!session) {
        console.log("[Dashboard] sessão não encontrada, redirecionando para /admin");
        navigate({ to: "/admin" });
        return;
      }

      console.log("[Dashboard] sessão carregada:", session.user.id);
      const uid = session.user.id;
      console.log("[Dashboard] verificando papel admin...");
      const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
        _user_id: uid,
        _role: "admin",
      });
      if (!active) return;

      if (roleError || !isAdmin) {
        console.log("[Dashboard] papel admin negado:", roleError?.message);
        await supabase.auth.signOut();
        toast.error("Acesso administrativo negado.");
        navigate({ to: "/admin" });
        return;
      }

      console.log("[Dashboard] papel admin confirmado");
      setAdmin(true);
      setAuthUserId(uid);
      await loadRows();
      if (!active) return;
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [navigate, ctxIsAdmin, ctxLoading, ctxUser]);

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

  const filteredRows = useMemo(() => {
    const lower = search.trim().toLowerCase();
    const digits = normalizeDigits(search);

    return rows.filter((row) => {
      if (lower) {
        const matchesText =
          row.protocolo.toLowerCase().includes(lower) ||
          row.nomeCrianca.toLowerCase().includes(lower) ||
          (row.responsavelNome || "").toLowerCase().includes(lower);
        const matchesDigits =
          (digits && normalizeDigits(row.responsavelCpf).includes(digits)) ||
          (digits && normalizeDigits(row.responsavelTelefone).includes(digits));
        if (!matchesText && !matchesDigits) return false;
      }

      if (ageFilter !== "all" && rangeFromAge(row.idade) !== ageFilter) return false;
      if (turmaFilter !== "all" && (row.turma || "") !== turmaFilter) return false;
      if (sexoFilter !== "all" && row.sexo !== sexoFilter) return false;

      if (dateFromFilter) {
        const fromTs = new Date(`${dateFromFilter}T00:00:00`).getTime();
        if (new Date(row.dataInscricao).getTime() < fromTs) return false;
      }

      if (dateToFilter) {
        const toTs = new Date(`${dateToFilter}T23:59:59`).getTime();
        if (new Date(row.dataInscricao).getTime() > toTs) return false;
      }

      return true;
    });
  }, [rows, search, ageFilter, turmaFilter, sexoFilter, dateFromFilter, dateToFilter]);

  const stats = useMemo(() => {
    const source = filteredRows;
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
  }, [filteredRows]);

  function currentPresenceStatus(row: DashboardRow) {
    return row.presencas.find((p) => p.data === attendanceDate)?.status || "";
  }

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

  function rowsForExportScope(): DashboardRow[] {
    if (exportScope === "completa") return rows;
    if (exportScope === "filtrada") return filteredRows;
    if (exportScope === "turma") {
      if (exportTurma === "all") return rows;
      return rows.filter((r) => (r.turma || "") === exportTurma);
    }
    if (exportFaixa === "all") return rows;
    return rows.filter((r) => rangeFromAge(r.idade) === exportFaixa);
  }

  function exportRowsModel(): ExportRow[] {
    return rowsForExportScope().map((row) => ({
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
    setExporting(true);
    try {
      const model = exportRowsModel();
      if (model.length === 0) {
        toast.error("Nenhum registro para exportar.");
        return;
      }

      const headers = Object.keys(model[0]) as (keyof ExportRow)[];
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
    } finally {
      setExporting(false);
    }
  }

  async function exportXlsx() {
    setExporting(true);
    try {
      const model = exportRowsModel();
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
    } catch (error) {
      console.error(error);
      toast.error("Falha ao gerar Excel.");
    } finally {
      setExporting(false);
    }
  }

  async function exportPdf() {
    setExporting(true);
    try {
      const model = exportRowsModel();
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
    } catch (error) {
      console.error(error);
      toast.error("Falha ao gerar PDF.");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando painel administrativo...
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
            Emissão: {new Date().toLocaleString("pt-BR")} · Registros: {filteredRows.length}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Baby, label: "Total inscritos (filtro)", value: stats.total },
            { icon: Users, label: "Total geral", value: rows.length },
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
              <Button onClick={exportXlsx} disabled={exporting} className="flex-1">
                <FileSpreadsheet className="h-4 w-4 mr-1.5" /> XLSX
              </Button>
              <Button
                onClick={exportCsv}
                disabled={exporting}
                variant="secondary"
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-1.5" /> CSV
              </Button>
              <Button onClick={exportPdf} disabled={exporting} variant="outline" className="flex-1">
                <FileType2 className="h-4 w-4 mr-1.5" /> PDF
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

        <div className="glass-card rounded-2xl p-4">
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
                {filteredRows.map((row) => (
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
                          onValueChange={(v) => updateStatus(row.inscricaoId, v as StatusOption)}
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
                      <Button size="sm" variant="outline" onClick={() => setDetailRow(row)}>
                        <Eye className="h-4 w-4 mr-1.5" /> Detalhes
                      </Button>
                    </td>
                  </tr>
                ))}

                {filteredRows.length === 0 && (
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
