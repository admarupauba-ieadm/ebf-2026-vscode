import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";
import type { DashboardRow } from "./types";
import { fmtDate, mapMedicalNotes, mapEmergency } from "./utils";

interface DetailDialogProps {
  row: DashboardRow | null;
  onClose: () => void;
}

export function DetailDialog({ row, onClose }: DetailDialogProps) {
  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalhes da inscrição</DialogTitle>
          <DialogDescription>Protocolo: {row?.protocolo}</DialogDescription>
        </DialogHeader>

        {row && (
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <h5 className="font-semibold">Criança</h5>
              <p>Nome: {row.nomeCrianca}</p>
              <p>Idade: {row.idade}</p>
              <p>Sexo: {row.sexo}</p>
              <p>Turma: {row.turma || "Não definida"}</p>
              <p>Status: {row.status}</p>
              <p>Data da inscrição: {fmtDate(row.dataInscricao)}</p>
            </div>
            <div className="space-y-1">
              <h5 className="font-semibold">Responsável</h5>
              <p>Nome: {row.responsavelNome || "—"}</p>
              <p>CPF: {row.responsavelCpf || "—"}</p>
              <p>Telefone: {row.responsavelTelefone || "—"}</p>
              <p>E-mail: {row.responsavelEmail || "—"}</p>
              <p>Igreja: {row.responsavelIgreja || "—"}</p>
            </div>
            <div className="md:col-span-2 space-y-1">
              <h5 className="font-semibold">Saúde e observações médicas</h5>
              <p>{mapMedicalNotes(row)}</p>
            </div>
            <div className="md:col-span-2 space-y-1">
              <h5 className="font-semibold">Contato de emergência</h5>
              <p>{mapEmergency(row)}</p>
            </div>
            <div className="md:col-span-2">
              <h5 className="font-semibold mb-1">Presenças registradas</h5>
              {row.presencas.length === 0 ? (
                <p className="text-muted-foreground">Nenhuma presença registrada.</p>
              ) : (
                <ul className="space-y-1">
                  {row.presencas
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
  );
}
