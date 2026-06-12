export function stripNonDigits(v: string): string {
  return v.replace(/\D/g, "");
}

export function formatCPF(value: string): string {
  const digits = stripNonDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function isValidCPF(cpf: string): boolean {
  const digits = stripNonDigits(cpf);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const nums = digits.split("").map(Number);
  const calc = (factor: number) =>
    nums.slice(0, factor - 1).reduce((sum, n, i) => sum + n * (factor - i), 0);

  const d1 = ((calc(10) * 10) % 11) % 10;
  const d2 = ((calc(11) * 10) % 11) % 10;

  return d1 === nums[9] && d2 === nums[10];
}

export function formatPhone(value: string): string {
  const digits = stripNonDigits(value).slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7)
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isValidPhone(phone: string): boolean {
  const digits = stripNonDigits(phone);
  return digits.length >= 10 && digits.length <= 11;
}

export function calcIdade(dataNascimento: string): number | null {
  if (!dataNascimento) return null;
  const d = new Date(dataNascimento);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export function isValidIdade(idade: number | null): boolean {
  if (idade === null || idade < 0) return false;
  return idade <= 12;
}

export function getMinDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 12);
  return d.toISOString().split("T")[0];
}

export function getMaxDate(): string {
  return new Date().toISOString().split("T")[0];
}

export type FieldError = string | null;

export const MSG = {
  cpfInvalido: "CPF inválido. Verifique os dígitos.",
  cpfSequencia: "CPF inválido. Digite um CPF verdadeiro.",
  cpfObrigatorio: "CPF é obrigatório.",
  telefoneInvalido: "Telefone inválido. Mínimo 10 dígitos.",
  telefoneObrigatorio: "Telefone é obrigatório.",
  idadeInvalida: "A criança deve ter entre 0 e 12 anos para participar da EBF.",
  dataFutura: "Data de nascimento não pode ser futura.",
  campoObrigatorio: (campo: string) => `${campo} é obrigatório.`,
  autorizacaoObrigatoria: "É obrigatório autorizar a participação e confirmar a veracidade.",
  seguranca: "Erro de segurança. Tente novamente.",
  turnstile: "Complete a verificação de segurança.",
  rapido: "Formulário enviado muito rápido. Aguarde alguns segundos.",
};
