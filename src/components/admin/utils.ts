import type { StatusOption, AgeRangeFilter } from "./types";

export function normalizeStatus(input: string | null | undefined): StatusOption {
  const value = (input || "").trim().toLowerCase();
  if (value.startsWith("confirm")) return "Confirmado";
  if (value.startsWith("pres")) return "Presente";
  if (value.startsWith("cancel")) return "Cancelado";
  return "Inscrito";
}

export function normalizeSexo(input: string | null | undefined) {
  const value = (input || "").trim().toLowerCase();
  if (value.startsWith("m")) return "masculino";
  if (value.startsWith("f")) return "feminino";
  return value || "-";
}

export function rangeFromAge(age: number): Exclude<AgeRangeFilter, "all"> {
  if (age <= 3) return "0-3";
  if (age <= 6) return "4-6";
  if (age <= 9) return "7-9";
  if (age <= 12) return "10-12";
  return "13+";
}

export function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function fmtDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

export function mapMedicalNotes(row: {
  alergias: string | null;
  medicamentos: string | null;
  necessidadesEspeciais: string | null;
  restricoesAlimentares: string | null;
}) {
  const parts = [
    row.alergias ? `Alergias: ${row.alergias}` : "",
    row.medicamentos ? `Medicamentos: ${row.medicamentos}` : "",
    row.necessidadesEspeciais ? `Necessidades especiais: ${row.necessidadesEspeciais}` : "",
    row.restricoesAlimentares ? `Intolerância alimentar: ${row.restricoesAlimentares}` : "",
  ].filter(Boolean);
  return parts.join(" | ") || "-";
}

export function mapEmergency(row: {
  emergenciaNome: string | null;
  emergenciaParentesco: string | null;
  emergenciaTelefone: string | null;
}) {
  const parts = [row.emergenciaNome, row.emergenciaParentesco, row.emergenciaTelefone].filter(
    Boolean,
  );
  return parts.join(" · ") || "-";
}
