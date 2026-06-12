import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { fmtDate } from "./utils";

interface AdminAttendanceProps {
  attendanceDate: string;
  onAttendanceDateChange: (value: string) => void;
}

export function AdminAttendance({ attendanceDate, onAttendanceDateChange }: AdminAttendanceProps) {
  return (
    <div className="no-print glass-card rounded-2xl p-4 mb-6">
      <h3 className="font-display font-bold text-lg mb-3">Presença do evento</h3>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="date"
          value={attendanceDate}
          onChange={(e) => onAttendanceDateChange(e.target.value)}
          className="max-w-[220px]"
          aria-label="Data da presença"
        />
        <span className="text-sm text-muted-foreground">Data: {fmtDate(attendanceDate)}</span>
        <Button onClick={() => window.print()} variant="outline" aria-label="Imprimir lista atual">
          <Printer className="h-4 w-4 mr-1.5" /> Imprimir lista atual
        </Button>
      </div>
    </div>
  );
}
