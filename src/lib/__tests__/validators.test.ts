import { describe, it, expect } from "vitest";
import {
  isValidCPF,
  formatCPF,
  isValidPhone,
  formatPhone,
  calcIdade,
  isValidIdade,
  getMinDate,
  getMaxDate,
  stripNonDigits,
  MSG,
} from "@/lib/validators";

describe("stripNonDigits", () => {
  it("removes non-digit characters", () => {
    expect(stripNonDigits("529.982.247-25")).toBe("52998224725");
  });
  it("returns empty string for no digits", () => {
    expect(stripNonDigits("abc-./")).toBe("");
  });
  it("preserves only digits", () => {
    expect(stripNonDigits("123abc456")).toBe("123456");
  });
});

describe("formatCPF", () => {
  it("formats 11 digits as CPF", () => {
    expect(formatCPF("52998224725")).toBe("529.982.247-25");
  });
  it("formats partial input", () => {
    expect(formatCPF("529")).toBe("529");
    expect(formatCPF("5299")).toBe("529.9");
    expect(formatCPF("529982")).toBe("529.982");
  });
  it("truncates to 11 digits", () => {
    expect(formatCPF("52998224725123")).toBe("529.982.247-25");
  });
  it("strips non-digits before formatting", () => {
    expect(formatCPF("529.982.247-25")).toBe("529.982.247-25");
  });
});

describe("isValidCPF", () => {
  it("accepts valid CPF 52998224725", () => expect(isValidCPF("52998224725")).toBe(true));
  it("accepts valid formatted CPF", () => expect(isValidCPF("529.982.247-25")).toBe(true));
  it("rejects invalid CPF", () => expect(isValidCPF("52998224724")).toBe(false));
  it("rejects all same digits", () => {
    expect(isValidCPF("11111111111")).toBe(false);
    expect(isValidCPF("00000000000")).toBe(false);
  });
  it("rejects short CPF", () => expect(isValidCPF("123")).toBe(false));
  it("rejects empty string", () => expect(isValidCPF("")).toBe(false));
  it("rejects CPF with letters", () => expect(isValidCPF("abc")).toBe(false));
});

describe("formatPhone", () => {
  it("formats 11-digit mobile", () => expect(formatPhone("11987654321")).toBe("(11) 98765-4321"));
  it("formats 10-digit landline", () => expect(formatPhone("1132324455")).toBe("(11) 32324-455"));
  it("formats partial input", () => {
    expect(formatPhone("11")).toBe("(11");
    expect(formatPhone("1198")).toBe("(11) 98");
  });
});

describe("isValidPhone", () => {
  it("accepts 10 digits", () => expect(isValidPhone("1132324455")).toBe(true));
  it("accepts 11 digits", () => expect(isValidPhone("11987654321")).toBe(true));
  it("accepts formatted", () => expect(isValidPhone("(11) 98765-4321")).toBe(true));
  it("rejects short", () => expect(isValidPhone("119876543")).toBe(false));
  it("rejects empty", () => expect(isValidPhone("")).toBe(false));
});

describe("calcIdade", () => {
  it("calculates age from birth date", () => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");
    const idade = calcIdade(`${ano - 5}-${mes}-${dia}`);
    expect(idade).toBeGreaterThanOrEqual(4);
    expect(idade).toBeLessThanOrEqual(5);
  });
  it("returns null for empty string", () => expect(calcIdade("")).toBeNull());
  it("returns null for invalid date", () => expect(calcIdade("not-a-date")).toBeNull());
  it("returns reasonable age for 2019-01-01", () => {
    const idade = calcIdade("2019-01-01");
    expect(idade).not.toBeNull();
    expect(idade).toBeGreaterThanOrEqual(6);
    expect(idade).toBeLessThanOrEqual(8);
  });
});

describe("isValidIdade", () => {
  it("accepts 5", () => expect(isValidIdade(5)).toBe(true));
  it("accepts 0", () => expect(isValidIdade(0)).toBe(true));
  it("accepts 12", () => expect(isValidIdade(12)).toBe(true));
  it("rejects 13", () => expect(isValidIdade(13)).toBe(false));
  it("rejects null", () => expect(isValidIdade(null)).toBe(false));
  it("rejects negative", () => expect(isValidIdade(-1)).toBe(false));
});

describe("getMinDate / getMaxDate", () => {
  it("getMinDate returns 12 years ago", () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 12);
    expect(getMinDate()).toBe(d.toISOString().split("T")[0]);
  });
  it("getMaxDate returns today", () => {
    expect(getMaxDate()).toBe(new Date().toISOString().split("T")[0]);
  });
});

describe("MSG constants", () => {
  it("campoObrigatorio interpolates field name", () => {
    expect(MSG.campoObrigatorio("Nome")).toBe("Nome é obrigatório.");
  });
  it("has all expected messages", () => {
    expect(MSG.cpfInvalido).toBe("CPF inválido. Verifique os dígitos.");
    expect(MSG.telefoneInvalido).toBe("Telefone inválido. Mínimo 10 dígitos.");
    expect(MSG.idadeInvalida).toBe("A criança deve ter entre 0 e 12 anos para participar da EBF.");
  });
});
