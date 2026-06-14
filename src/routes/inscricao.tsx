import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogoUCADMA, LogoAD } from "@/components/Brand";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { verifyTurnstile } from "@/lib/verify-turnstile";
import {
  formatCPF,
  formatPhone,
  isValidCPF,
  isValidPhone,
  calcIdade,
  isValidIdade,
  getMinDate,
  getMaxDate,
  stripNonDigits,
  MSG,
} from "@/lib/validators";

export const Route = createFileRoute("/inscricao")({
  head: () => ({
    meta: [
      { title: "Inscrição · EBF 2026 UCADMA" },
      { name: "description", content: "Preencha a inscrição da sua criança para a EBF 2026." },
    ],
  }),
  component: InscricaoPage,
});

type FormData = {
  responsavel: Record<string, string>;
  crianca: Record<string, string>;
  saude: Record<string, string>;
  emergencia: Record<string, string>;
  autorizacoes: { participacao: boolean; imagem: boolean; veracidade: boolean };
};

type StepProps<K extends keyof FormData> = {
  data: FormData[K];
  onChange: (patch: Partial<FormData[K]>) => void;
};

type Errors = Record<string, string>;

type CriarInscricaoResult = {
  protocolo?: string;
};

const EMPTY: FormData = {
  responsavel: {
    nome: "",
    cpf: "",
    telefone: "",
    whatsapp: "",
    email: "",
    endereco: "",
    bairro: "",
    cidade: "Tomé-Açu",
    estado: "PA",
    igreja: "AD Campo Marupaúba",
  },
  crianca: {
    nome: "",
    data_nascimento: "",
    idade: "",
    sexo: "",
  },
  saude: { alergias: "", medicamentos: "", necessidades_especiais: "", restricoes_alimentares: "" },
  emergencia: { nome: "", telefone: "", parentesco: "" },
  autorizacoes: { participacao: false, imagem: false, veracidade: false },
};

const STORAGE_KEY = "ebf2026-form-draft";
const STEPS = ["Responsável", "Criança", "Saúde", "Emergência", "Autorizações", "Confirmação"];

function InscricaoPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [protocoloResult, setProtocoloResult] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const startTimeRef = useRef(Date.now());
  const honeypotRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved)
      try {
        setData(JSON.parse(saved));
      } catch {
        /* invalid draft data */
      }
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const update = <K extends keyof FormData>(section: K, patch: Partial<FormData[K]>) =>
    setData((d) => ({ ...d, [section]: { ...d[section], ...patch } }));

  const clearError = (field: string) =>
    setErrors((e) => {
      const next = { ...e };
      delete next[field];
      return next;
    });

  const addError = (field: string, msg: string) => setErrors((e) => ({ ...e, [field]: msg }));

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  function validate(): string | null {
    const newErrors: Errors = {};

    if (step === 0) {
      const r = data.responsavel;
      if (!r.nome) newErrors["resp_nome"] = MSG.campoObrigatorio("Nome do responsável");
      if (!r.cpf) newErrors["resp_cpf"] = MSG.cpfObrigatorio;
      else if (!isValidCPF(r.cpf)) newErrors["resp_cpf"] = MSG.cpfInvalido;
      if (!r.telefone) newErrors["resp_telefone"] = MSG.telefoneObrigatorio;
      else if (!isValidPhone(r.telefone)) newErrors["resp_telefone"] = MSG.telefoneInvalido;
    }

    if (step === 1) {
      const c = data.crianca;
      if (!c.nome) newErrors["crianca_nome"] = MSG.campoObrigatorio("Nome da criança");
      if (!c.data_nascimento)
        newErrors["crianca_data_nascimento"] = MSG.campoObrigatorio("Data de nascimento");
      else {
        const idade = calcIdade(c.data_nascimento);
        if (idade === null) newErrors["crianca_data_nascimento"] = "Data de nascimento inválida.";
        else if (!isValidIdade(idade)) newErrors["crianca_data_nascimento"] = MSG.idadeInvalida;
      }
      if (!c.sexo) newErrors["crianca_sexo"] = MSG.campoObrigatorio("Sexo");
    }

    if (step === 3) {
      const e = data.emergencia;
      if (!e.nome) newErrors["emergencia_nome"] = MSG.campoObrigatorio("Nome do contato");
      if (!e.telefone) newErrors["emergencia_telefone"] = MSG.telefoneObrigatorio;
      else if (!isValidPhone(e.telefone)) newErrors["emergencia_telefone"] = MSG.telefoneInvalido;
    }

    if (step === 4) {
      const a = data.autorizacoes;
      if (!a.participacao || !a.veracidade) newErrors["autorizacoes"] = MSG.autorizacaoObrigatoria;
    }

    setErrors(newErrors);
    const first = Object.values(newErrors)[0] ?? null;
    return first;
  }

  async function submit() {
    if (submitted) return;
    if (Date.now() - startTimeRef.current < 5000) {
      toast.error(MSG.rapido);
      return;
    }
    if (honeypotRef.current?.value) {
      toast.error(MSG.seguranca);
      return;
    }
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (siteKey) {
      if (!turnstileToken) {
        toast.error(MSG.turnstile);
        return;
      }
      setSubmitting(true);
      try {
        const result = await verifyTurnstile({ data: { token: turnstileToken } });
        if (!result.success) {
          toast.error(result.error || MSG.seguranca);
          return;
        }
      } catch (e) {
        toast.error(MSG.seguranca);
        return;
      } finally {
        setSubmitting(false);
      }
    }

    setSubmitting(true);
    try {
      const c = data.crianca;
      const idade = calcIdade(c.data_nascimento);

      const { data: dupCheck, error: dupError } = await supabase.rpc(
        "verificar_inscricao_duplicada",
        {
          p_responsavel_cpf: stripNonDigits(data.responsavel.cpf),
          p_crianca_nome: c.nome.trim(),
          p_data_nascimento: c.data_nascimento,
        },
      );
      if (dupError) {
        toast.error("Erro ao verificar duplicidade: " + dupError.message);
        return;
      }
      if ((dupCheck as { duplicada?: boolean })?.duplicada) {
        const info = dupCheck as { protocolo?: string; status?: string };
        toast.error(
          `Esta criança já foi inscrita. Protocolo: ${info.protocolo ?? "—"} (Status: ${info.status ?? "—"})`,
        );
        return;
      }

      const payload = {
        ...data,
        responsavel: { ...data.responsavel, cpf: stripNonDigits(data.responsavel.cpf) },
        crianca: { ...c, idade: String(idade ?? 0) },
      };
      const { data: res, error } = await supabase.rpc("criar_inscricao", { payload });
      if (error) {
        toast.error(error.message);
        return;
      }
      const protocolo = (res as CriarInscricaoResult | null)?.protocolo ?? "";
      localStorage.removeItem(STORAGE_KEY);
      toast.success("✅ Inscrição enviada com sucesso!");
      setProtocoloResult(protocolo);
      setSubmitted(true);
    } catch (e) {
      toast.error("Erro inesperado ao enviar inscrição. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="flex items-center justify-center gap-4 mb-6">
          <LogoUCADMA className="h-14 w-14" />
          <div className="text-center">
            <h1 className="font-display font-bold text-3xl md:text-4xl gold-text">
              Inscrição EBF 2026
            </h1>
            <p className="text-sm text-muted-foreground">
              Cristo, o Ungido de Deus · Lucas 4:18-19
            </p>
          </div>
          <LogoAD className="h-14 w-14" />
        </div>

        <div className="mb-6">
          <Progress
            value={((step + 1) / STEPS.length) * 100}
            className="h-2 bg-[color:var(--gold)]/20"
          />
          <div className="flex justify-between mt-2 text-[11px] font-semibold text-muted-foreground">
            {STEPS.map((s, i) => (
              <span key={s} className={i === step ? "text-[color:var(--gold-deep)]" : ""}>
                {i + 1}. {s}
              </span>
            ))}
          </div>
        </div>

        <div
          className="glass-card rounded-3xl p-6 md:p-8"
          aria-label={`Etapa ${step + 1} de ${STEPS.length}: ${STEPS[step]}`}
        >
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {Object.keys(errors).length > 0
              ? `${Object.keys(errors).length} erro(s) no formulário.`
              : ""}
          </div>
          <input
            ref={honeypotRef}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "-9999px",
              opacity: 0,
              height: 0,
              width: 0,
              overflow: "hidden",
            }}
            defaultValue=""
          />
          {step === 0 && (
            <StepResponsavel
              data={data.responsavel}
              onChange={(p) => update("responsavel", p)}
              errors={errors}
              onClearError={clearError}
              onAddError={addError}
            />
          )}
          {step === 1 && (
            <StepCrianca
              data={data.crianca}
              onChange={(p) => update("crianca", p)}
              errors={errors}
              onClearError={clearError}
              onAddError={addError}
            />
          )}
          {step === 2 && <StepSaude data={data.saude} onChange={(p) => update("saude", p)} />}
          {step === 3 && (
            <StepEmergencia
              data={data.emergencia}
              onChange={(p) => update("emergencia", p)}
              errors={errors}
              onClearError={clearError}
              onAddError={addError}
            />
          )}
          {step === 4 && (
            <StepAutorizacoes
              data={data.autorizacoes}
              onChange={(p) => update("autorizacoes", p)}
              errors={errors}
              onClearError={clearError}
            />
          )}
          {step === 5 && (
            <>
              {submitted ? (
                <SuccessCard protocolo={protocoloResult} />
              ) : (
                <>
                  <StepConfirmacao data={data} />
                  {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
                    <div className="mt-6 pt-6 border-t border-[color:var(--gold)]/20">
                      <p className="text-sm text-muted-foreground mb-3 text-center">
                        Verificação de segurança
                      </p>
                      <TurnstileWidget
                        siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                        onToken={setTurnstileToken}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t border-[color:var(--gold)]/20">
            {submitted ? (
              <div />
            ) : (
              <Button variant="outline" onClick={prev} disabled={step === 0}>
                Voltar
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => {
                  const e = validate();
                  if (e) toast.error(e);
                  else next();
                }}
                className="bg-[image:var(--gradient-gold)] text-[color:var(--royal-deep)] font-bold border-0 shine-on-hover"
              >
                Próximo
              </Button>
            ) : (
              <Button
                onClick={submit}
                disabled={submitting || submitted}
                className={`bg-[image:var(--gradient-gold)] text-[color:var(--royal-deep)] font-bold border-0 ${submitted ? "opacity-70 cursor-not-allowed" : "shine-on-hover"}`}
              >
                {submitted
                  ? "✓ Inscrição Enviada"
                  : submitting
                    ? "Enviando..."
                    : "✨ Finalizar Inscrição"}
              </Button>
            )}
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function Field({
  label,
  children,
  required,
  error,
  id,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string | null;
  id?: string;
}) {
  const errorId = id ? `${id}-error` : undefined;
  return (
    <div className="space-y-1.5" role="group" aria-labelledby={id ? `${id}-label` : undefined}>
      <Label id={id ? `${id}-label` : undefined} className="text-sm font-semibold">
        {label}{" "}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children}
      <div id={errorId} role="alert" aria-live="polite" aria-atomic="true">
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display font-bold text-2xl mb-4 gold-text">{children}</h2>;
}

function StepResponsavel({
  data,
  onChange,
  errors,
  onClearError,
  onAddError,
}: StepProps<"responsavel"> & {
  errors: Errors;
  onClearError: (f: string) => void;
  onAddError: (f: string, m: string) => void;
}) {
  return (
    <div>
      <SectionTitle>Dados do Responsável</SectionTitle>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Nome completo" required error={errors["resp_nome"]}>
          <Input
            aria-required="true"
            value={data.nome}
            onChange={(e) => {
              onChange({ nome: e.target.value });
              onClearError("resp_nome");
            }}
          />
        </Field>
        <Field label="CPF" required error={errors["resp_cpf"]}>
          <Input
            aria-required="true"
            value={data.cpf}
            onChange={(e) => {
              const v = formatCPF(e.target.value);
              onChange({ cpf: v });
              if (v && isValidCPF(v)) onClearError("resp_cpf");
            }}
            onBlur={() => {
              if (data.cpf && !isValidCPF(data.cpf)) onAddError("resp_cpf", MSG.cpfInvalido);
            }}
            placeholder="000.000.000-00"
            maxLength={14}
          />
        </Field>
        <Field label="Telefone" required error={errors["resp_telefone"]}>
          <Input
            aria-required="true"
            value={data.telefone}
            onChange={(e) => {
              const v = formatPhone(e.target.value);
              onChange({ telefone: v });
              if (v && isValidPhone(v)) onClearError("resp_telefone");
            }}
            onBlur={() => {
              if (data.telefone && !isValidPhone(data.telefone))
                onAddError("resp_telefone", MSG.telefoneInvalido);
            }}
            placeholder="(00) 00000-0000"
            maxLength={16}
          />
        </Field>
        <Field label="WhatsApp">
          <Input
            value={data.whatsapp}
            onChange={(e) => {
              const v = formatPhone(e.target.value);
              onChange({ whatsapp: v });
            }}
            placeholder="(00) 00000-0000"
            maxLength={16}
          />
        </Field>
        <Field label="E-mail">
          <Input
            type="email"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
          />
        </Field>
        <Field label="Igreja / Congregação">
          <Input value={data.igreja} onChange={(e) => onChange({ igreja: e.target.value })} />
        </Field>
        <Field label="Endereço">
          <Input value={data.endereco} onChange={(e) => onChange({ endereco: e.target.value })} />
        </Field>
        <Field label="Bairro">
          <Input value={data.bairro} onChange={(e) => onChange({ bairro: e.target.value })} />
        </Field>
        <Field label="Cidade">
          <Input value={data.cidade} onChange={(e) => onChange({ cidade: e.target.value })} />
        </Field>
        <Field label="Estado">
          <Input value={data.estado} onChange={(e) => onChange({ estado: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

function StepCrianca({
  data,
  onChange,
  errors,
  onClearError,
  onAddError,
}: StepProps<"crianca"> & {
  errors: Errors;
  onClearError: (f: string) => void;
  onAddError: (f: string, m: string) => void;
}) {
  return (
    <div>
      <SectionTitle>Dados da Criança</SectionTitle>
      <p className="text-sm text-muted-foreground mb-4">
        Cada criança deve ter sua própria inscrição. Repita o processo para irmãos.
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Nome completo" required error={errors["crianca_nome"]}>
          <Input
            aria-required="true"
            value={data.nome}
            onChange={(e) => {
              onChange({ nome: e.target.value });
              onClearError("crianca_nome");
            }}
          />
        </Field>
        <Field label="Data de nascimento" required error={errors["crianca_data_nascimento"]}>
          <Input
            type="date"
            aria-required="true"
            value={data.data_nascimento}
            min={getMinDate()}
            max={getMaxDate()}
            onChange={(e) => {
              const dn = e.target.value;
              const idade = calcIdade(dn);
              onChange({ data_nascimento: dn, idade: idade !== null ? String(idade) : "" });
              onClearError("crianca_data_nascimento");
            }}
          />
        </Field>
        <Field label="Idade">
          <Input value={data.idade} disabled className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-1">
            Calculada automaticamente. A EBF é para crianças de 0 a 12 anos.
          </p>
        </Field>
        <Field label="Sexo" required error={errors["crianca_sexo"]}>
          <RadioGroup
            value={data.sexo}
            onValueChange={(v) => {
              onChange({ sexo: v });
              onClearError("crianca_sexo");
            }}
            className="flex gap-4 pt-1"
          >
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="masculino" /> Masculino
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="feminino" /> Feminino
            </label>
          </RadioGroup>
        </Field>
      </div>
    </div>
  );
}

function StepSaude({ data, onChange }: StepProps<"saude">) {
  return (
    <div>
      <SectionTitle>Saúde</SectionTitle>
      <div className="grid gap-4">
        <Field label="Possui alergias? Quais?">
          <Textarea
            value={data.alergias}
            onChange={(e) => onChange({ alergias: e.target.value })}
          />
        </Field>
        <Field label="Faz uso de medicamentos? Quais?">
          <Textarea
            value={data.medicamentos}
            onChange={(e) => onChange({ medicamentos: e.target.value })}
          />
        </Field>
        <Field label="Possui necessidades especiais? Quais?">
          <Textarea
            value={data.necessidades_especiais}
            onChange={(e) => onChange({ necessidades_especiais: e.target.value })}
          />
        </Field>
        <Field label="Intolerância alimentar">
          <Textarea
            value={data.restricoes_alimentares}
            onChange={(e) => onChange({ restricoes_alimentares: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

function StepEmergencia({
  data,
  onChange,
  errors,
  onClearError,
  onAddError,
}: StepProps<"emergencia"> & {
  errors: Errors;
  onClearError: (f: string) => void;
  onAddError: (f: string, m: string) => void;
}) {
  return (
    <div>
      <SectionTitle>Contato de Emergência</SectionTitle>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Nome do contato" required error={errors["emergencia_nome"]}>
          <Input
            aria-required="true"
            value={data.nome}
            onChange={(e) => {
              onChange({ nome: e.target.value });
              onClearError("emergencia_nome");
            }}
          />
        </Field>
        <Field label="Telefone" required error={errors["emergencia_telefone"]}>
          <Input
            aria-required="true"
            value={data.telefone}
            onChange={(e) => {
              const v = formatPhone(e.target.value);
              onChange({ telefone: v });
              if (v && isValidPhone(v)) onClearError("emergencia_telefone");
            }}
            onBlur={() => {
              if (data.telefone && !isValidPhone(data.telefone))
                onAddError("emergencia_telefone", MSG.telefoneInvalido);
            }}
            placeholder="(00) 00000-0000"
            maxLength={16}
          />
        </Field>
        <Field label="Grau de parentesco">
          <Input
            value={data.parentesco}
            onChange={(e) => onChange({ parentesco: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

function StepAutorizacoes({
  data,
  onChange,
  errors,
  onClearError,
}: {
  data: FormData["autorizacoes"];
  onChange: (patch: Partial<FormData["autorizacoes"]>) => void;
  errors: Errors;
  onClearError: (f: string) => void;
}) {
  const items = [
    {
      key: "participacao" as const,
      label: "Autorizo a participação da criança em todas as atividades da EBF 2026.",
    },
    {
      key: "imagem" as const,
      label: "Autorizo o uso de imagem da criança nas mídias oficiais da igreja.",
    },
    {
      key: "veracidade" as const,
      label: "Confirmo que todas as informações prestadas são verdadeiras.",
    },
  ];
  return (
    <div>
      <SectionTitle>Autorizações</SectionTitle>
      {errors["autorizacoes"] && (
        <p className="text-sm text-destructive mb-3">{errors["autorizacoes"]}</p>
      )}
      <div className="space-y-3">
        {items.map(({ key, label }) => (
          <label
            key={key}
            className="flex gap-3 p-4 rounded-xl border border-[color:var(--gold)]/30 hover:bg-[color:var(--gold)]/10 cursor-pointer transition"
          >
            <Checkbox
              checked={data[key]}
              onCheckedChange={(v) => {
                onChange({ [key]: !!v });
                onClearError("autorizacoes");
              }}
              className="mt-0.5"
            />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function SuccessCard({ protocolo }: { protocolo: string }) {
  return (
    <div className="text-center animate-glow">
      <div className="flex justify-center gap-4 mb-4">
        <LogoUCADMA className="h-16 w-16" />
        <LogoAD className="h-16 w-16" />
      </div>
      <p className="text-5xl mb-3" role="img" aria-label="Festa">
        🎉
      </p>
      <h2 className="font-display font-bold text-3xl md:text-4xl gold-text mb-2">
        Inscrição enviada com sucesso!
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Sua criança está oficialmente inscrita na EBF 2026.
      </p>

      <div className="bg-[image:var(--gradient-gold)] text-[color:var(--royal-deep)] rounded-2xl py-6 px-4 my-6 shadow-[var(--shadow-gold)]">
        <div className="text-xs uppercase tracking-widest font-bold mb-1">Protocolo</div>
        <div className="font-display font-bold text-3xl md:text-4xl tracking-wider">
          {protocolo || "—"}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-2">
        Guarde este número. Ele poderá ser utilizado posteriormente na página de consulta.
      </p>
      <p className="text-sm text-muted-foreground mb-6">
        Você pode consultar esta inscrição posteriormente através da página{" "}
        <strong>Consultar</strong>.
      </p>

      <div className="flex flex-wrap gap-3 justify-center">
        <Button
          asChild
          className="bg-[image:var(--gradient-gold)] text-[color:var(--royal-deep)] font-bold border-0"
        >
          <Link to="/consulta">Ir para Consulta</Link>
        </Button>
      </div>
    </div>
  );
}

function StepConfirmacao({ data }: { data: FormData }) {
  const row = (k: string, v?: string) => (
    <div className="flex justify-between gap-4 py-1.5 text-sm border-b border-[color:var(--gold)]/10 last:border-0">
      <span className="text-muted-foreground shrink-0">{k}</span>
      <span className={`font-medium text-right ${v ? "" : "italic text-muted-foreground/60"}`}>
        {v || "—"}
      </span>
    </div>
  );
  return (
    <div>
      <SectionTitle>Confirme os dados</SectionTitle>
      <p className="text-sm text-muted-foreground mb-4">
        Revise todas as informações antes de finalizar. Você pode voltar para corrigir.
      </p>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-4 space-y-0.5">
          <h3 className="font-display font-bold text-sm uppercase tracking-wider text-[color:var(--gold-deep)] mb-2">
            Responsável
          </h3>
          {row("Nome", data.responsavel.nome)}
          {row("CPF", data.responsavel.cpf)}
          {row("Telefone", data.responsavel.telefone)}
          {row("WhatsApp", data.responsavel.whatsapp)}
          {row("E-mail", data.responsavel.email)}
          {row("Igreja", data.responsavel.igreja)}
          {row("Endereço", data.responsavel.endereco)}
          {row("Bairro", data.responsavel.bairro)}
          {row("Cidade", data.responsavel.cidade)}
          {row("Estado", data.responsavel.estado)}
        </div>
        <div className="glass-card rounded-2xl p-4 space-y-0.5">
          <h3 className="font-display font-bold text-sm uppercase tracking-wider text-[color:var(--gold-deep)] mb-2">
            Criança
          </h3>
          {row("Nome", data.crianca.nome)}
          {row("Nascimento", data.crianca.data_nascimento)}
          {row("Idade", data.crianca.idade ? `${data.crianca.idade} anos` : "")}
          {row(
            "Sexo",
            data.crianca.sexo === "masculino"
              ? "Masculino"
              : data.crianca.sexo === "feminino"
                ? "Feminino"
                : data.crianca.sexo,
          )}
        </div>
        <div className="glass-card rounded-2xl p-4 space-y-0.5">
          <h3 className="font-display font-bold text-sm uppercase tracking-wider text-[color:var(--gold-deep)] mb-2">
            Saúde
          </h3>
          {row("Alergias", data.saude.alergias)}
          {row("Medicamentos", data.saude.medicamentos)}
          {row("Necessidades especiais", data.saude.necessidades_especiais)}
          {row("Intolerância alimentar", data.saude.restricoes_alimentares)}
        </div>
        <div className="glass-card rounded-2xl p-4 space-y-0.5">
          <h3 className="font-display font-bold text-sm uppercase tracking-wider text-[color:var(--gold-deep)] mb-2">
            Emergência
          </h3>
          {row("Nome", data.emergencia.nome)}
          {row("Telefone", data.emergencia.telefone)}
          {row("Parentesco", data.emergencia.parentesco)}
          <div className="pt-3 mt-3 border-t border-[color:var(--gold)]/20">
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-[color:var(--gold-deep)] mb-2">
              Autorizações
            </h3>
            {row("Participação", data.autorizacoes.participacao ? "✓ Autorizado" : "—")}
            {row("Uso de imagem", data.autorizacoes.imagem ? "✓ Autorizado" : "—")}
            {row("Veracidade", data.autorizacoes.veracidade ? "✓ Confirmado" : "—")}
          </div>
        </div>
      </div>
    </div>
  );
}
