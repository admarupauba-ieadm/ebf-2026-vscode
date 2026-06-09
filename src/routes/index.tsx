import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LogoUCADMA, ASSETS } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  Music,
  Sparkles,
  Users,
  Heart,
  Calendar,
  Clock,
  MapPin,
  Baby,
  Cookie,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EBF 2026 · Cristo, o Ungido de Deus — UCADMA Marupaúba" },
      {
        name: "description",
        content:
          "Inscrições abertas para a EBF 2026 da UCADMA, Assembleia de Deus Campo Marupaúba. Tema: Cristo, o Ungido de Deus (Lucas 4:18-19).",
      },
      { property: "og:title", content: "EBF 2026 — Cristo, o Ungido de Deus" },
      {
        property: "og:description",
        content: "Sistema oficial de inscrições da Escola Bíblica de Férias 2026.",
      },
      { property: "og:image", content: ASSETS.cartaz },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Hero />
      <Sobre />
      <Info />
      <Beneficios />
      <FAQ />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[image:var(--gradient-hero)] -z-10" />
      <div
        className="absolute inset-0 -z-10 opacity-30 bg-cover bg-center"
        style={{ backgroundImage: `url(${ASSETS.ebf})` }}
        aria-hidden
      />
      <div className="container mx-auto px-4 pt-12 pb-20 md:pt-20 md:pb-28 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full glass-card px-4 py-1.5 text-xs font-semibold text-[color:var(--royal-deep)] mb-6">
            <Sparkles className="h-3.5 w-3.5 text-[color:var(--gold-deep)]" />
            UCADMA · Marupaúba · 2026
          </div>
          <h1 className="font-display font-bold text-6xl md:text-8xl leading-[0.95] mb-4">
            <span className="gold-text animate-shimmer block">EBF 2026</span>
          </h1>
          <p className="font-display text-2xl md:text-4xl text-[color:var(--royal-deep)] font-semibold mb-3 text-slate-50">
            Cristo, o Ungido de Deus
          </p>
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold-deep)] font-bold mb-8 text-amber-700">
            Lucas 4:18 e 19 · Profeta · Sacerdote · Rei
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="h-14 px-8 text-base font-bold bg-[image:var(--gradient-gold)] text-[color:var(--royal-deep)] shadow-[var(--shadow-gold)] hover:scale-105 transition-transform shine-on-hover border-0 animate-glow text-slate-50"
            >
              <Link to="/inscricao">✨ Fazer Inscrição</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 px-8 text-base font-bold border-2 border-[color:var(--royal)] text-[color:var(--royal-deep)] hover:bg-[color:var(--royal)]/10"
            >
              <Link to="/consulta">Consultar Inscrição</Link>
            </Button>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-8 bg-[image:var(--gradient-gold)] blur-3xl opacity-40 animate-float" />
          <div className="relative glass-card rounded-3xl p-6 animate-float">
            <img
              src={ASSETS.cartaz}
              alt="Tema EBF 2026 — Cristo, o Ungido de Deus"
              className="w-full rounded-2xl shadow-[var(--shadow-gold)]"
            />
            <div className="absolute -top-6 -left-6 bg-white rounded-2xl shadow-xl p-3 border-4 border-[color:var(--gold)]">
              <LogoUCADMA className="h-20 w-20" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Sobre() {
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="font-display font-bold text-4xl md:text-5xl mb-4">
          Sobre a <span className="gold-text">EBF 2026</span>
        </h2>
        <p className="text-lg text-muted-foreground">
          A Escola Bíblica de Férias da UCADMA é uma celebração de fé, alegria e aprendizado. Em
          2026 mergulhamos no tema <strong>&ldquo;Cristo, o Ungido de Deus&rdquo;</strong> —
          descobrindo Jesus como Profeta, Sacerdote e Rei, com programação rica em ensino bíblico,
          louvor, lanches e brincadeiras.
        </p>
      </div>
    </section>
  );
}

function Info() {
  const items = [
    { icon: Calendar, label: "Data", value: "15 à 18 · Julho 2026" },
    {
      icon: Clock,
      label: "Horário",
      value: (
        <>
          8 Horas <p>Manhã</p>
        </>
      ),
    },
    { icon: MapPin, label: "Local", value: "AD Campo Marupaúba" },
    { icon: Baby, label: "Faixa Etária", value: "0 a 12 anos" },
  ];
  return (
    <section className="container mx-auto px-4 py-10">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="glass-card rounded-2xl p-6 text-center hover:scale-[1.03] transition"
          >
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[image:var(--gradient-gold)] text-[color:var(--royal-deep)] mb-3 shadow-[var(--shadow-glow)]">
              <Icon className="h-7 w-7" />
            </div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
            <div className="font-display font-bold text-lg mt-1">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Beneficios() {
  const items = [
    {
      icon: BookOpen,
      t: "Aprendizado Bíblico",
      d: "Lições inspiradas em Lucas 4:18-19, conectando as crianças com Cristo.",
    },
    {
      icon: Cookie,
      t: "Alimentação",
      d: "Refeições saudáveis, nutritivas e preparadas com muito carinho. Garantimos uma alimentação de qualidade, balanceada e com atenção especial às restrições alimentares de cada criança.",
    },
    {
      icon: Music,
      t: "Louvor & Adoração",
      d: "Momentos de celebração com músicas e coreografias.",
    },
    {
      icon: Heart,
      t: "Brincadeiras",
      d: "Diversão garantida com gincanas e dinâmicas inesquecíveis.",
    },
    {
      icon: Users,
      t: "Novas Amizades",
      d: "Convivência fraterna entre crianças de várias congregações.",
    },
    {
      icon: Sparkles,
      t: "Crescimento Espiritual",
      d: "Uma semana que marca a vida das crianças e suas famílias.",
    },
  ];
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h2 className="font-display font-bold text-4xl md:text-5xl">O que sua criança vai viver</h2>
        <p className="text-muted-foreground mt-2">
          Uma experiência completa, segura e cheia da unção de Deus.
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map(({ icon: Icon, t, d }) => (
          <div
            key={t}
            className="glass-card rounded-2xl p-6 hover:-translate-y-1 transition-transform"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[image:var(--gradient-gold)] text-[color:var(--royal-deep)] mb-3">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="font-display font-bold text-xl mb-1">{t}</h3>
            <p className="text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FAQ() {
  const qs = [
    {
      q: "Qual a faixa etária da EBF?",
      a: "A EBF 2026 atende crianças de 0 a 12 anos, divididas em turmas por idade.",
    },
    { q: "É necessário pagar alguma taxa?", a: "Não. A inscrição é totalmente gratuita." },
    { q: "Onde acontece?", a: "Na sede da Assembleia de Deus Campo Marupaúba, em Tomé-Açu — PA." },
    {
      q: "Preciso ser membro da igreja?",
      a: "Não! Toda criança é bem-vinda, independentemente da congregação.",
    },
    {
      q: "Como faço a inscrição?",
      a: "Clique em 'Fazer Inscrição', preencha os dados em 6 etapas rápidas e receba seu protocolo.",
    },
  ];
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-display font-bold text-4xl md:text-5xl text-center mb-8">
          Perguntas <span className="gold-text">Frequentes</span>
        </h2>
        <Accordion type="single" collapsible className="glass-card rounded-2xl px-6">
          {qs.map(({ q, a }, i) => (
            <AccordionItem key={i} value={`i${i}`} className="border-[color:var(--gold)]/20">
              <AccordionTrigger className="font-display font-semibold text-left">
                {q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <span>{a}</span>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
