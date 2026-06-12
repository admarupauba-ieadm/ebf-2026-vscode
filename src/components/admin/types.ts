export type StatusOption = "Inscrito" | "Confirmado" | "Presente" | "Cancelado";
export type PresenceOption = "presente" | "faltou" | "justificado";
export type AgeRangeFilter = "all" | "0-3" | "4-6" | "7-9" | "10-12" | "13+";
export type ExportScope = "completa" | "filtrada" | "turma" | "faixa";
export type ExportAction = "csv" | "xlsx" | "pdf";

export interface DashboardRow {
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
}

export const STATUS_OPTIONS: StatusOption[] = ["Inscrito", "Confirmado", "Presente", "Cancelado"];

export const PRESENCE_OPTIONS: PresenceOption[] = ["presente", "faltou", "justificado"];

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export const AGE_RANGE_MAP: Record<
  Exclude<AgeRangeFilter, "all">,
  { min: number; max?: number }
> = {
  "0-3": { min: 0, max: 3 },
  "4-6": { min: 4, max: 6 },
  "7-9": { min: 7, max: 9 },
  "10-12": { min: 10, max: 12 },
  "13+": { min: 13 },
};

export const AGE_RANGE_OPTIONS: { value: AgeRangeFilter; label: string }[] = [
  { value: "all", label: "Todas as idades" },
  { value: "0-3", label: "0 a 3 anos" },
  { value: "4-6", label: "4 a 6 anos" },
  { value: "7-9", label: "7 a 9 anos" },
  { value: "10-12", label: "10 a 12 anos" },
  { value: "13+", label: "13+ anos" },
];
