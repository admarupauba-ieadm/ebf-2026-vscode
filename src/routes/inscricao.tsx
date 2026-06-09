import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
    nome_pai: "",
    nome_mae: "",
  },
  crianca: {
    nome: "",
    data_nascimento: "",
    idade: "",
    sexo: "",
    serie_escolar: "",
    tamanho_camisa: "",
  },
  saude: { alergias: "", medicamentos: "", necessidades_especiais: "", restricoes_alimentares: "" },
  emergencia: { nome: "", telefone: "", parentesco: "" },
  autorizacoes: { participacao: false, imagem: false, veracidade: false },
};

const STORAGE_KEY = "ebf2026-form-draft";
const STEPS = ["Responsável", "Criança", "Saúde", "Emergência", "Autorizações", "Confirmação"];

function InscricaoPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
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

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  function validate(): string | null {
    if (step === 0) {
      const r = data.responsavel;
      if (!r.nome || !r.cpf || !r.telefone) return "Preencha nome, CPF e telefone do responsável.";
    }
    if (step === 1) {
      const c = data.crianca;
      if (!c.nome || !c.data_nascimento || !c.sexo)
        return "Preencha nome, data de nascimento e sexo da criança.";
    }
    if (step === 3) {
      const e = data.emergencia;
      if (!e.nome || !e.telefone) return "Informe o contato de emergência.";
    }
    if (step === 4) {
      const a = data.autorizacoes;
      if (!a.participacao || !a.veracidade)
        return "É obrigatório autorizar a participação e confirmar veracidade.";
    }
    return null;
  }

  async function submit() {
    if (Date.now() - startTimeRef.current < 5000) {
      toast.error("Formulário enviado muito rápido. Aguarde alguns segundos.");
      return;
    }
    if (honeypotRef.current?.value) {
      toast.error("Erro de segurança. Tente novamente.");
      return;
    }
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (siteKey) {
      if (!turnstileToken) {
        toast.error("Complete a verificação de segurança.");
        return;
      }
      setSubmitting(true);
      const result = await verifyTurnstile({ data: { token: turnstileToken } });
      if (!result.success) {
        toast.error(result.error || "Falha na verificação de segurança.");
        setSubmitting(false);
        return;
      }
    }
    setSubmitting(true);
    const c = data.crianca;
    const idade = c.idade || calcIdade(c.data_nascimento);
    const payload = { ...data, crianca: { ...c, idade: String(idade) } };
    const { data: res, error } = await supabase.rpc("criar_inscricao", { payload });
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao enviar: " + error.message);
      return;
    }
    const protocolo = (res as any)?.protocolo as string;
    localStorage.removeItem(STORAGE_KEY);
    navigate({ to: "/inscricao/sucesso", search: { protocolo } });
  }

  function calcIdade(dn: string) {
    if (!dn) return "";
    const d = new Date(dn);
    const diff = Date.now() - d.getTime();
    return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
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

        <div className="glass-card rounded-3xl p-6 md:p-8">
          <input
            ref={honeypotRef}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, width: 0, overflow: "hidden" }}
            defaultValue=""
          />
          {step === 0 && (
            <StepResponsavel
              data={data.responsavel}
              onChange={(p: any) => update("responsavel", p)}
            />
          )}
          {step === 1 && (
            <StepCrianca data={data.crianca} onChange={(p: any) => update("crianca", p)} />
          )}
          {step === 2 && <StepSaude data={data.saude} onChange={(p: any) => update("saude", p)} />}
          {step === 3 && (
            <StepEmergencia data={data.emergencia} onChange={(p: any) => update("emergencia", p)} />
          )}
          {step === 4 && (
            <StepAutorizacoes
              data={data.autorizacoes}
              onChange={(p: any) => update("autorizacoes", p)}
            />
          )}
          {step === 5 && (
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

          <div className="flex justify-between mt-8 pt-6 border-t border-[color:var(--gold)]/20">
            <Button variant="outline" onClick={prev} disabled={step === 0}>
              Voltar
            </Button>
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
                disabled={submitting}
                className="bg-[image:var(--gradient-gold)] text-[color:var(--royal-deep)] font-bold border-0 shine-on-hover"
              >
                {submitting ? "Enviando..." : "✨ Finalizar Inscrição"}
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
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display font-bold text-2xl mb-4 gold-text">{children}</h2>;
}

function StepResponsavel({ data, onChange }: any) {
  return (
    <div>
      <SectionTitle>Dados do Responsável</SectionTitle>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Nome completo" required>
          <Input value={data.nome} onChange={(e) => onChange({ nome: e.target.value })} />
        </Field>
        <Field label="CPF" required>
          <Input
            value={data.cpf}
            onChange={(e) => onChange({ cpf: e.target.value })}
            placeholder="000.000.000-00"
          />
        </Field>
        <Field label="Telefone" required>
          <Input value={data.telefone} onChange={(e) => onChange({ telefone: e.target.value })} />
        </Field>
        <Field label="WhatsApp">
          <Input value={data.whatsapp} onChange={(e) => onChange({ whatsapp: e.target.value })} />
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
        <Field label="Nome do Pai">
          <Input value={data.nome_pai} onChange={(e) => onChange({ nome_pai: e.target.value })} />
        </Field>
        <Field label="Nome da Mãe">
          <Input value={data.nome_mae} onChange={(e) => onChange({ nome_mae: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

function StepCrianca({ data, onChange }: any) {
  return (
    <div>
      <SectionTitle>Dados da Criança</SectionTitle>
      <p className="text-sm text-muted-foreground mb-4">
        Cada criança deve ter sua própria inscrição. Repita o processo para irmãos.
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Nome completo" required>
          <Input value={data.nome} onChange={(e) => onChange({ nome: e.target.value })} />
        </Field>
        <Field label="Data de nascimento" required>
          <Input
            type="date"
            value={data.data_nascimento}
            onChange={(e) => {
              const dn = e.target.value;
              const idade = dn
                ? String(
                    Math.floor((Date.now() - new Date(dn).getTime()) / (365.25 * 24 * 3600 * 1000)),
                  )
                : "";
              onChange({ data_nascimento: dn, idade });
            }}
          />
        </Field>
        <Field label="Idade">
          <Input value={data.idade} onChange={(e) => onChange({ idade: e.target.value })} />
        </Field>
        <Field label="Sexo" required>
          <RadioGroup
            value={data.sexo}
            onValueChange={(v) => onChange({ sexo: v })}
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
        <Field label="Série escolar">
          <Input
            value={data.serie_escolar}
            onChange={(e) => onChange({ serie_escolar: e.target.value })}
          />
        </Field>
        <Field label="Tamanho da camisa">
          <Input
            value={data.tamanho_camisa}
            onChange={(e) => onChange({ tamanho_camisa: e.target.value })}
            placeholder="PP / P / M / G / GG"
          />
        </Field>
      </div>
    </div>
  );
}

function StepSaude({ data, onChange }: any) {
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
        <Field label="Restrições alimentares">
          <Textarea
            value={data.restricoes_alimentares}
            onChange={(e) => onChange({ restricoes_alimentares: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

function StepEmergencia({ data, onChange }: any) {
  return (
    <div>
      <SectionTitle>Contato de Emergência</SectionTitle>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Nome do contato" required>
          <Input value={data.nome} onChange={(e) => onChange({ nome: e.target.value })} />
        </Field>
        <Field label="Telefone" required>
          <Input value={data.telefone} onChange={(e) => onChange({ telefone: e.target.value })} />
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

function StepAutorizacoes({ data, onChange }: any) {
  const items = [
    {
      key: "participacao",
      label: "Autorizo a participação da criança em todas as atividades da EBF 2026.",
    },
    { key: "imagem", label: "Autorizo o uso de imagem da criança nas mídias oficiais da igreja." },
    { key: "veracidade", label: "Confirmo que todas as informações prestadas são verdadeiras." },
  ] as const;
  return (
    <div>
      <SectionTitle>Autorizações</SectionTitle>
      <div className="space-y-3">
        {items.map(({ key, label }) => (
          <label
            key={key}
            className="flex gap-3 p-4 rounded-xl border border-[color:var(--gold)]/30 hover:bg-[color:var(--gold)]/10 cursor-pointer transition"
          >
            <Checkbox
              checked={(data as any)[key]}
              onCheckedChange={(v) => onChange({ [key]: !!v })}
              className="mt-0.5"
            />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function StepConfirmacao({ data }: { data: FormData }) {
  const row = (k: string, v?: string) =>
    v ? (
      <div className="flex justify-between gap-4 py-1 text-sm border-b border-[color:var(--gold)]/10 last:border-0">
        <span className="text-muted-foreground">{k}</span>
        <span className="font-medium text-right">{v}</span>
      </div>
    ) : null;
  return (
    <div>
      <SectionTitle>Confirme os dados</SectionTitle>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-display font-bold mb-2">Responsável</h3>
          {row("Nome", data.responsavel.nome)}
          {row("CPF", data.responsavel.cpf)}
          {row("Telefone", data.responsavel.telefone)}
          {row("Igreja", data.responsavel.igreja)}
        </div>
        <div>
          <h3 className="font-display font-bold mb-2">Criança</h3>
          {row("Nome", data.crianca.nome)}
          {row("Nascimento", data.crianca.data_nascimento)}
          {row("Sexo", data.crianca.sexo)}
          {row("Camisa", data.crianca.tamanho_camisa)}
        </div>
        <div>
          <h3 className="font-display font-bold mb-2">Saúde</h3>
          {row("Alergias", data.saude.alergias)}
          {row("Medicamentos", data.saude.medicamentos)}
        </div>
        <div>
          <h3 className="font-display font-bold mb-2">Emergência</h3>
          {row("Nome", data.emergencia.nome)}
          {row("Telefone", data.emergencia.telefone)}
          {row("Parentesco", data.emergencia.parentesco)}
        </div>
      </div>
    </div>
  );
}
