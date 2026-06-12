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
import type { DashboardRow } from "./types";

interface DeleteDialogProps {
  pending: DashboardRow | null;
  savingId: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteDialog({ pending, savingId, onConfirm, onClose }: DeleteDialogProps) {
  return (
    <Dialog open={!!pending} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir inscrição</DialogTitle>
          <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
        </DialogHeader>

        {pending && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div className="space-y-0.5">
                <p className="font-medium">{pending.nomeCrianca}</p>
                <p className="text-xs text-muted-foreground">Protocolo: {pending.protocolo}</p>
              </div>
            </div>

            <p className="text-muted-foreground text-xs leading-relaxed">
              <strong>ATENÇÃO:</strong> Esta ação excluirá permanentemente a inscrição e poderá
              remover também os dados da criança e do responsável caso não existam outros vínculos.
              Esta ação não pode ser desfeita.
            </p>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={savingId === pending?.inscricaoId}
          >
            {savingId === pending?.inscricaoId ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Excluindo...
              </>
            ) : (
              "Sim, excluir"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
