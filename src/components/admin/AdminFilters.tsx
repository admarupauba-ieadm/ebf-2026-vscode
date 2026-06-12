import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AGE_RANGE_OPTIONS } from "./types";
import type { AgeRangeFilter } from "./types";

interface AdminFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  ageFilter: AgeRangeFilter;
  onAgeFilterChange: (value: AgeRangeFilter) => void;
  turmaFilter: string;
  onTurmaFilterChange: (value: string) => void;
  sexoFilter: string;
  onSexoFilterChange: (value: string) => void;
  dateFromFilter: string;
  onDateFromFilterChange: (value: string) => void;
  dateToFilter: string;
  onDateToFilterChange: (value: string) => void;
  turmaOptions: string[];
}

export function AdminFilters({
  search,
  onSearchChange,
  ageFilter,
  onAgeFilterChange,
  turmaFilter,
  onTurmaFilterChange,
  sexoFilter,
  onSexoFilterChange,
  dateFromFilter,
  onDateFromFilterChange,
  dateToFilter,
  onDateToFilterChange,
  turmaOptions,
}: AdminFiltersProps) {
  return (
    <div className="no-print glass-card rounded-2xl p-4 mb-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Protocolo, criança, responsável, CPF, telefone"
            aria-label="Buscar inscrições"
          />
        </div>

        <Select value={ageFilter} onValueChange={(v) => onAgeFilterChange(v as AgeRangeFilter)}>
          <SelectTrigger aria-label="Filtrar por faixa etária">
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

        <Select value={turmaFilter} onValueChange={onTurmaFilterChange}>
          <SelectTrigger aria-label="Filtrar por turma">
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

        <Select value={sexoFilter} onValueChange={onSexoFilterChange}>
          <SelectTrigger aria-label="Filtrar por sexo">
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
          onChange={(e) => onDateFromFilterChange(e.target.value)}
          aria-label="Data inicial"
        />
        <Input
          type="date"
          value={dateToFilter}
          onChange={(e) => onDateToFilterChange(e.target.value)}
          aria-label="Data final"
        />
      </div>
    </div>
  );
}
