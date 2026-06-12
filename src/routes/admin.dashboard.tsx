import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import {
  AdminHeader,
  AdminStats,
  AdminFilters,
  AdminExport,
  AdminAttendance,
  AdminTable,
  AdminPagination,
  AdminCharts,
  StatusChangeDialog,
  DeleteDialog,
  DetailDialog,
} from "@/components/admin";
import { useDebounce, useToday, useAdminAuth, useInscricoes } from "@/hooks";
import type {
  DashboardRow,
  StatusOption,
  AgeRangeFilter,
  ExportScope,
  ExportAction,
  PresenceOption,
} from "@/components/admin/types";
import {
  fmtDate,
  csvEscape,
  mapMedicalNotes,
  mapEmergency,
  rangeFromAge,
} from "@/components/admin/utils";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Painel Administrativo · EBF 2026" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { loading, admin, authUserId, ctxUser, adminName, lastAccess, logout } = useAdminAuth();

  const today = useToday();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [ageFilter, setAgeFilter] = useState<AgeRangeFilter>("all");
  const [turmaFilter, setTurmaFilter] = useState("all");
  const [sexoFilter, setSexoFilter] = useState("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [attendanceDate, setAttendanceDate] = useState(today);

  const { rows, totalCount, loadingPage, turmaOptions, stats, refresh } = useInscricoes(
    {
      search: debouncedSearch,
      ageFilter,
      turmaFilter,
      sexoFilter,
      dateFromFilter,
      dateToFilter,
    },
    currentPage,
    pageSize,
    admin,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, ageFilter, turmaFilter, sexoFilter, dateFromFilter, dateToFilter, pageSize]);

  useEffect(() => {
    setAttendanceDate(today);
  }, [today]);

  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [savingPresenceId, setSavingPresenceId] = useState<string | null>(null);

  const [exportScope, setExportScope] = useState<ExportScope>("filtrada");
  const [exportTurma, setExportTurma] = useState("all");
  const [exportFaixa, setExportFaixa] = useState<AgeRangeFilter>("all");
  const [exportingType, setExportingType] = useState<ExportAction | null>(null);

  const [pendingStatusChange, setPendingStatusChange] = useState<{
    row: DashboardRow;
    newStatus: StatusOption;
  } | null>(null);

  const [pendingDelete, setPendingDelete] = useState<DashboardRow | null>(null);
  const [detailRow, setDetailRow] = useState<DashboardRow | null>(null);

  const SELECT_INSCRICOES =
    "id, protocolo, status, data_inscricao, crianca:criancas(id, nome, idade, sexo, turma, alergias, medicamentos, necessidades_especiais, restricoes_alimentares, emergencia_nome, emergencia_telefone, emergencia_parentesco, responsavel:responsaveis(nome, cpf, telefone, email, igreja), presencas:presencas(data, status))" as const;

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

  async function updateStatus(inscricaoId: string, newStatus: StatusOption) {
    setSavingStatusId(inscricaoId);
    const { error } = await supabase.rpc("admin_update_status", {
      p_inscricao_id: inscricaoId,
      p_novo_status: newStatus,
    });
    setSavingStatusId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    refresh();
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

    let msg = "Inscrição removida.";
    if (result.crianca_removida) msg += " Dados da criança removidos.";
    if (result.responsavel_removido) msg += " Dados do responsável removidos.";
    toast.success(msg);

    refresh();
    setPendingDelete(null);
  }

  async function registerPresence(row: DashboardRow, presenceStatus: PresenceOption) {
    if (!authUserId) return;
    setSavingPresenceId(row.criancaId);
    const { error } = await supabase.rpc("admin_register_presence", {
      p_crianca_id: row.criancaId,
      p_data: attendanceDate,
      p_status: presenceStatus,
      p_registrado_por: authUserId,
    });

    if (error) {
      setSavingPresenceId(null);
      toast.error(error.message);
      return;
    }

    refresh();
    setSavingPresenceId(null);
    toast.success("Presença registrada.");
  }

  async function fetchAllRowsForExport(): Promise<DashboardRow[]> {
    const hasSearch = debouncedSearch.trim().length > 0;
    const hasAgeFilter = ageFilter !== "all";
    const hasTurmaF = turmaFilter !== "all";
    const hasSexoF = sexoFilter !== "all";

    let query = supabase
      .from("inscricoes")
      .select(SELECT_INSCRICOES)
      .order("data_inscricao", { ascending: false })
      .limit(5000);

    if (dateFromFilter) {
      query = query.gte("data_inscricao", `${dateFromFilter}T00:00:00`);
    }
    if (dateToFilter) {
      query = query.lte("data_inscricao", `${dateToFilter}T23:59:59`);
    }

    if (!hasSearch && !hasAgeFilter && !hasTurmaF && !hasSexoF) {
      const { data } = await query;
      return ((data || []) as RawInscricao[])
        .map((item) => {
          const c = item.crianca;
          if (!c) return null;
          return {
            inscricaoId: item.id,
            criancaId: c.id,
            protocolo: item.protocolo,
            status: item.status as StatusOption,
            dataInscricao: item.data_inscricao,
            nomeCrianca: c.nome,
            idade: c.idade,
            sexo: c.sexo || "-",
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
          } as DashboardRow;
        })
        .filter((item): item is DashboardRow => !!item);
    }

    return rows;
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

      const blob = new Blob([`\uFEFF${csv}`], {
        type: "text/csv;charset=utf-8;",
      });
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
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
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

  return (
    <div className="min-h-screen">
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="admin-announcements"
      />
      <AdminHeader adminName={adminName} lastAccess={lastAccess} onLogout={logout} />

      <div className="container mx-auto px-4 py-8 print-area">
        <div className="print-only">
          <h1 className="text-2xl font-bold">EBF 2026 - Lista de Inscrições</h1>
          <p className="text-sm">
            Emissão: {new Date().toLocaleString("pt-BR")} · Registros: {rows.length}
          </p>
        </div>

        <AdminStats stats={stats} totalCount={totalCount} />

        <AdminFilters
          search={search}
          onSearchChange={setSearch}
          ageFilter={ageFilter}
          onAgeFilterChange={setAgeFilter}
          turmaFilter={turmaFilter}
          onTurmaFilterChange={setTurmaFilter}
          sexoFilter={sexoFilter}
          onSexoFilterChange={setSexoFilter}
          dateFromFilter={dateFromFilter}
          onDateFromFilterChange={setDateFromFilter}
          dateToFilter={dateToFilter}
          onDateToFilterChange={setDateToFilter}
          turmaOptions={turmaOptions}
        />

        <AdminExport
          exportScope={exportScope}
          onExportScopeChange={setExportScope}
          exportTurma={exportTurma}
          onExportTurmaChange={setExportTurma}
          exportFaixa={exportFaixa}
          onExportFaixaChange={setExportFaixa}
          turmaOptions={turmaOptions}
          exportingType={exportingType}
          onExportCsv={exportCsv}
          onExportXlsx={exportXlsx}
          onExportPdf={exportPdf}
        />

        <AdminAttendance
          attendanceDate={attendanceDate}
          onAttendanceDateChange={setAttendanceDate}
        />

        <AdminTable
          rows={rows}
          loadingPage={loadingPage}
          attendanceDate={attendanceDate}
          savingStatusId={savingStatusId}
          savingPresenceId={savingPresenceId}
          onStatusChange={(row, newStatus) => setPendingStatusChange({ row, newStatus })}
          onPresenceChange={registerPresence}
          onViewDetails={setDetailRow}
          onDelete={setPendingDelete}
        />

        <AdminPagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalCount={totalCount}
          loadingPage={loadingPage}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />

        <AdminCharts stats={stats} />
      </div>

      <StatusChangeDialog
        pending={pendingStatusChange}
        savingId={savingStatusId}
        onConfirm={confirmStatusChange}
        onClose={() => setPendingStatusChange(null)}
      />

      <DeleteDialog
        pending={pendingDelete}
        savingId={savingStatusId}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />

      <DetailDialog row={detailRow} onClose={() => setDetailRow(null)} />
    </div>
  );
}
