import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PAGE_SIZE_OPTIONS } from "./types";

interface AdminPaginationProps {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  loadingPage: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function AdminPagination({
  currentPage,
  pageSize,
  totalCount,
  loadingPage,
  onPageChange,
  onPageSizeChange,
}: AdminPaginationProps) {
  return (
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
            de <span className="font-semibold text-foreground">{totalCount}</span> inscritos
          </>
        ) : (
          <span>Nenhum inscrito encontrado</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">Por página:</span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="h-8 w-20" aria-label="Itens por página">
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
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1 || loadingPage}
          aria-label="Primeira página"
        >
          Primeira
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1 || loadingPage}
          aria-label="Página anterior"
        >
          Anterior
        </Button>
        <span className="px-3 py-1 text-muted-foreground">Pág. {currentPage}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage * pageSize >= totalCount || loadingPage}
          aria-label="Próxima página"
        >
          Próxima
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, Math.ceil(totalCount / pageSize)))}
          disabled={currentPage * pageSize >= totalCount || loadingPage}
          aria-label="Última página"
        >
          Última
        </Button>
      </div>
    </div>
  );
}
