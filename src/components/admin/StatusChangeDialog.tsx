import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { DashboardRow, StatusOption } from "./types";

interface StatusChangeDialogProps {
  pending: { row: DashboardRow; newStatus: StatusOption } | null;
  savingId: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function StatusChangeDialog({
  pending,
  savingId,
  onConfirm,
  onClose,
}: StatusChangeDialogProps) {
  return (
    <Dialog open={!!pending} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Alterar status</DialogTitle>
          <DialogDescription>Confirme a alteração de status da inscrição.</DialogDescription>
        </DialogHeader>

        {pending && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <div className="space-y-0.5">
                <p>
                  <span className="font-medium">{pending.row.nomeCrianca}</span>
                </p>
                <p className="text-xs text-muted-foreground">Protocolo: {pending.row.protocolo}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 text-center">
                <div className="text-xs text-muted-foreground mb-1">Status atual</div>
                <div className="font-semibold">{pending.row.status}</div>
              </div>
              <div className="text-muted-foreground">→</div>
              <div className="flex-1 text-center">
                <div className="text-xs text-muted-foreground mb-1">Novo status</div>
                <div className="font-semibold text-[color:var(--gold-deep)]">
                  {pending.newStatus}
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={onConfirm} disabled={savingId === pending?.row.inscricaoId}>
            {savingId === pending?.row.inscricaoId ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Salvando...
              </>
            ) : (
              "Confirmar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
