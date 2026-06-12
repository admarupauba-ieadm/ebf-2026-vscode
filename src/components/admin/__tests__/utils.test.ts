import { describe, it, expect } from "vitest";
import {
  normalizeStatus,
  normalizeSexo,
  rangeFromAge,
  csvEscape,
  fmtDate,
  mapMedicalNotes,
  mapEmergency,
} from "@/components/admin/utils";

describe("normalizeStatus", () => {
  it('returns "Confirmado" for confirmed-like input', () => {
    expect(normalizeStatus("Confirmado")).toBe("Confirmado");
    expect(normalizeStatus("confirmed")).toBe("Confirmado");
    expect(normalizeStatus("CONFIRM")).toBe("Confirmado");
  });
  it('returns "Presente" for presence-like input', () => {
    expect(normalizeStatus("Presente")).toBe("Presente");
    expect(normalizeStatus("present")).toBe("Presente");
    expect(normalizeStatus("PRESENTE")).toBe("Presente");
  });
  it('returns "Cancelado" for canceled-like input', () => {
    expect(normalizeStatus("Cancelado")).toBe("Cancelado");
    expect(normalizeStatus("cancelled")).toBe("Cancelado");
    expect(normalizeStatus("CANCEL")).toBe("Cancelado");
  });
  it('returns "Inscrito" for unknown input', () => {
    expect(normalizeStatus(null)).toBe("Inscrito");
    expect(normalizeStatus(undefined)).toBe("Inscrito");
    expect(normalizeStatus("")).toBe("Inscrito");
    expect(normalizeStatus("unknown")).toBe("Inscrito");
  });
});

describe("normalizeSexo", () => {
  it('returns "masculino" for male-like input', () => {
    expect(normalizeSexo("M")).toBe("masculino");
    expect(normalizeSexo("m")).toBe("masculino");
    expect(normalizeSexo("masculino")).toBe("masculino");
    expect(normalizeSexo("Masculino")).toBe("masculino");
  });
  it('returns "feminino" for female-like input', () => {
    expect(normalizeSexo("F")).toBe("feminino");
    expect(normalizeSexo("f")).toBe("feminino");
    expect(normalizeSexo("feminino")).toBe("feminino");
    expect(normalizeSexo("Feminino")).toBe("feminino");
  });
  it("returns original value for unknown", () => {
    expect(normalizeSexo(null)).toBe("-");
    expect(normalizeSexo(undefined)).toBe("-");
    expect(normalizeSexo("other")).toBe("other");
  });
});

describe("rangeFromAge", () => {
  it("classifies ages correctly", () => {
    expect(rangeFromAge(0)).toBe("0-3");
    expect(rangeFromAge(3)).toBe("0-3");
    expect(rangeFromAge(4)).toBe("4-6");
    expect(rangeFromAge(6)).toBe("4-6");
    expect(rangeFromAge(7)).toBe("7-9");
    expect(rangeFromAge(9)).toBe("7-9");
    expect(rangeFromAge(10)).toBe("10-12");
    expect(rangeFromAge(12)).toBe("10-12");
    expect(rangeFromAge(13)).toBe("13+");
    expect(rangeFromAge(99)).toBe("13+");
  });
});

describe("csvEscape", () => {
  it("returns plain text as-is", () => {
    expect(csvEscape("hello")).toBe("hello");
    expect(csvEscape(42)).toBe("42");
    expect(csvEscape(null)).toBe("");
  });
  it("wraps text containing commas", () => {
    expect(csvEscape("a,b")).toBe('"a,b"');
  });
  it("wraps text containing quotes", () => {
    expect(csvEscape('a"b')).toBe('"a""b"');
  });
  it("wraps text containing newlines", () => {
    expect(csvEscape("a\nb")).toBe('"a\nb"');
  });
});

describe("fmtDate", () => {
  it("returns date in DD/MM/YYYY format", () => {
    const result = fmtDate("2026-06-14");
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
  it("contains day/month/year components", () => {
    const result = fmtDate("2026-06-14");
    const parts = result.split("/");
    expect(parts).toHaveLength(3);
    expect(Number(parts[0])).toBeGreaterThanOrEqual(1);
    expect(Number(parts[0])).toBeLessThanOrEqual(31);
    expect(Number(parts[1])).toBe(6);
  });
  it("returns original value for invalid date", () => {
    expect(fmtDate("not-a-date")).toBe("not-a-date");
  });
});

describe("mapMedicalNotes", () => {
  it("returns '-' when no notes", () => {
    expect(
      mapMedicalNotes({
        alergias: null,
        medicamentos: null,
        necessidadesEspeciais: null,
        restricoesAlimentares: null,
      }),
    ).toBe("-");
  });
  it("concatenates available notes", () => {
    expect(
      mapMedicalNotes({
        alergias: "Amendoim",
        medicamentos: null,
        necessidadesEspeciais: "Autismo",
        restricoesAlimentares: null,
      }),
    ).toBe("Alergias: Amendoim | Necessidades especiais: Autismo");
  });
});

describe("mapEmergency", () => {
  it("returns joined emergency contact", () => {
    expect(
      mapEmergency({
        emergenciaNome: "Maria",
        emergenciaParentesco: "Mãe",
        emergenciaTelefone: "11999999999",
      }),
    ).toBe("Maria · Mãe · 11999999999");
  });
  it("returns '-' when no data", () => {
    expect(
      mapEmergency({
        emergenciaNome: null,
        emergenciaParentesco: null,
        emergenciaTelefone: null,
      }),
    ).toBe("-");
  });
});
