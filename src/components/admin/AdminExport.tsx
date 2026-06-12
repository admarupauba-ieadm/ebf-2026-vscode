import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, FileType2, Loader2 } from "lucide-react";
import type { ExportScope, AgeRangeFilter, ExportAction } from "./types";
import { AGE_RANGE_OPTIONS } from "./types";

interface AdminExportProps {
  exportScope: ExportScope;
  onExportScopeChange: (value: ExportScope) => void;
  exportTurma: string;
  onExportTurmaChange: (value: string) => void;
  exportFaixa: AgeRangeFilter;
  onExportFaixaChange: (value: AgeRangeFilter) => void;
  turmaOptions: string[];
  exportingType: ExportAction | null;
  onExportCsv: () => void;
  onExportXlsx: () => void;
  onExportPdf: () => void;
}

export function AdminExport({
  exportScope,
  onExportScopeChange,
  exportTurma,
  onExportTurmaChange,
  exportFaixa,
  onExportFaixaChange,
  turmaOptions,
  exportingType,
  onExportCsv,
  onExportXlsx,
  onExportPdf,
}: AdminExportProps) {
  return (
    <div className="no-print glass-card rounded-2xl p-4 mb-6">
      <h3 className="font-display font-bold text-lg mb-3">Exportação administrativa</h3>
      <div className="grid lg:grid-cols-4 gap-3">
        <Select value={exportScope} onValueChange={(v) => onExportScopeChange(v as ExportScope)}>
          <SelectTrigger aria-label="Escopo da exportação">
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
          onValueChange={onExportTurmaChange}
          disabled={exportScope !== "turma"}
        >
          <SelectTrigger aria-label="Turma para exportar">
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
          onValueChange={(v) => onExportFaixaChange(v as AgeRangeFilter)}
          disabled={exportScope !== "faixa"}
        >
          <SelectTrigger aria-label="Faixa para exportar">
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
          <Button
            onClick={onExportXlsx}
            disabled={!!exportingType}
            className="flex-1"
            aria-label="Exportar XLSX"
          >
            {exportingType === "xlsx" ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Exportando...
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4 mr-1.5" /> XLSX
              </>
            )}
          </Button>
          <Button
            onClick={onExportCsv}
            disabled={!!exportingType}
            variant="secondary"
            className="flex-1"
            aria-label="Exportar CSV"
          >
            {exportingType === "csv" ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Exportando...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-1.5" /> CSV
              </>
            )}
          </Button>
          <Button
            onClick={onExportPdf}
            disabled={!!exportingType}
            variant="outline"
            className="flex-1"
            aria-label="Exportar PDF"
          >
            {exportingType === "pdf" ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Exportando...
              </>
            ) : (
              <>
                <FileType2 className="h-4 w-4 mr-1.5" /> PDF
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
