import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { LogoUCADMA, LogoAD } from "@/components/Brand";
import { CheckCircle2, Printer } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/inscricao/sucesso")({
  validateSearch: z.object({ protocolo: z.string().optional() }),
  head: () => ({ meta: [{ title: "Inscrição confirmada · EBF 2026" }] }),
  component: SucessoPage,
});

function SucessoPage() {
  const { protocolo } = Route.useSearch();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="glass-card rounded-3xl p-8 md:p-12 text-center animate-glow">
          <div className="flex justify-center gap-4 mb-4">
            <LogoUCADMA className="h-16 w-16" />
            <LogoAD className="h-16 w-16" />
          </div>
          <CheckCircle2 className="h-20 w-20 mx-auto text-[color:var(--gold-deep)] mb-4" />
          <h1 className="font-display font-bold text-4xl md:text-5xl gold-text mb-2">
            Inscrição Confirmada!
          </h1>
          <p className="text-muted-foreground mb-6">
            Sua criança está oficialmente inscrita na EBF 2026.
          </p>

          <div className="bg-[image:var(--gradient-gold)] text-[color:var(--royal-deep)] rounded-2xl py-6 px-4 my-6 shadow-[var(--shadow-gold)]">
            <div className="text-xs uppercase tracking-widest font-bold mb-1">Protocolo</div>
            <div className="font-display font-bold text-3xl md:text-4xl tracking-wider">
              {protocolo || "—"}
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            Guarde este número. Você poderá consultar a inscrição a qualquer momento usando o
            protocolo, CPF ou telefone.
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={() => window.print()} variant="outline" className="border-2">
              <Printer className="h-4 w-4 mr-2" /> Imprimir
            </Button>
            <Button
              asChild
              className="bg-[image:var(--gradient-gold)] text-[color:var(--royal-deep)] font-bold border-0"
            >
              <Link to="/inscricao">Inscrever outra criança</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/">Voltar ao início</Link>
            </Button>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
