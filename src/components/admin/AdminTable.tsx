import { Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_OPTIONS, PRESENCE_OPTIONS } from "./types";
import { fmtDate } from "./utils";
import type { DashboardRow, StatusOption, PresenceOption } from "./types";

interface AdminTableProps {
  rows: DashboardRow[];
  loadingPage: boolean;
  attendanceDate: string;
  savingStatusId: string | null;
  savingPresenceId: string | null;
  onStatusChange: (row: DashboardRow, newStatus: StatusOption) => void;
  onPresenceChange: (row: DashboardRow, presenceStatus: PresenceOption) => void;
  onViewDetails: (row: DashboardRow) => void;
  onDelete: (row: DashboardRow) => void;
}

function currentPresenceStatus(row: DashboardRow, attendanceDate: string) {
  return row.presencas.find((p) => p.data === attendanceDate)?.status || "";
}

export function AdminTable({
  rows,
  loadingPage,
  attendanceDate,
  savingStatusId,
  savingPresenceId,
  onStatusChange,
  onPresenceChange,
  onViewDetails,
  onDelete,
}: AdminTableProps) {
  return (
    <div className="glass-card rounded-2xl p-4 relative">
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {loadingPage ? "Carregando inscrições..." : `${rows.length} registro(s) exibido(s).`}
      </div>
      {loadingPage && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-black/60 rounded-2xl">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-[color:var(--gold)]/30 border-t-[color:var(--gold-deep)]" />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm admin-table" role="table" aria-label="Lista de inscrições">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-[color:var(--gold)]/20">
            <tr>
              <th className="py-3 px-2" scope="col">
                Protocolo
              </th>
              <th className="py-3 px-2" scope="col">
                Criança
              </th>
              <th className="py-3 px-2" scope="col">
                Idade
              </th>
              <th className="py-3 px-2" scope="col">
                Sexo
              </th>
              <th className="py-3 px-2" scope="col">
                Turma
              </th>
              <th className="py-3 px-2" scope="col">
                Responsável
              </th>
              <th className="py-3 px-2" scope="col">
                Telefone
              </th>
              <th className="py-3 px-2" scope="col">
                Status
              </th>
              <th className="py-3 px-2" scope="col">
                Presença ({fmtDate(attendanceDate)})
              </th>
              <th className="py-3 px-2 no-print" scope="col">
                Presença
              </th>
              <th className="py-3 px-2 no-print" scope="col">
                Ações
              </th>
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
                      onValueChange={(v) => onStatusChange(row, v as StatusOption)}
                      disabled={savingStatusId === row.inscricaoId}
                    >
                      <SelectTrigger className="h-8" aria-label={`Status de ${row.nomeCrianca}`}>
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
                <td className="py-3 px-2">{currentPresenceStatus(row, attendanceDate) || "—"}</td>
                <td className="py-3 px-2 no-print min-w-[180px]">
                  <Select
                    value={currentPresenceStatus(row, attendanceDate) || undefined}
                    onValueChange={(v) => onPresenceChange(row, v as PresenceOption)}
                    disabled={savingPresenceId === row.criancaId}
                  >
                    <SelectTrigger className="h-8" aria-label={`Presença de ${row.nomeCrianca}`}>
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewDetails(row)}
                      aria-label={`Detalhes de ${row.nomeCrianca}`}
                    >
                      <Eye className="h-4 w-4 mr-1.5" /> Detalhes
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(row)}
                      aria-label={`Excluir inscrição de ${row.nomeCrianca}`}
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
  );
}
