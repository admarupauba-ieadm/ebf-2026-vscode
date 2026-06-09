import { Link } from "@tanstack/react-router";
import { LogoUCADMA, LogoAD } from "./Brand";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-[color:var(--gold)]/20">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 shine-on-hover rounded-lg">
          <LogoUCADMA className="h-12 w-12 drop-shadow" />
          <div className="hidden sm:block leading-tight">
            <div className="font-display font-bold text-lg gold-text">EBF 2026</div>
            <div className="text-[11px] text-muted-foreground -mt-0.5">UCADMA · Marupaúba</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Link to="/" className="px-3 py-2 rounded-lg hover:bg-[color:var(--gold)]/15 transition">
            Início
          </Link>
          <Link
            to="/inscricao"
            className="px-3 py-2 rounded-lg hover:bg-[color:var(--gold)]/15 transition"
          >
            Inscrição
          </Link>
          <Link
            to="/consulta"
            className="px-3 py-2 rounded-lg hover:bg-[color:var(--gold)]/15 transition"
          >
            Consultar
          </Link>
          <Link
            to="/admin"
            className="px-3 py-2 rounded-lg hover:bg-[color:var(--gold)]/15 transition text-muted-foreground"
          >
            Admin
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <LogoAD className="h-10 w-10 hidden sm:block" />
          <Button
            asChild
            variant="default"
            className="shine-on-hover bg-[image:var(--gradient-gold)] text-[color:var(--royal-deep)] font-bold border-0"
          >
            <Link to="/inscricao">Inscrever</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
