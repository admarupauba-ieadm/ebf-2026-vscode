import { useState, useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LogoUCADMA, LogoAD } from "./Brand";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Início" },
  { to: "/inscricao", label: "Inscrição" },
  { to: "/consulta", label: "Consultar" },
  { to: "/admin", label: "Admin" },
] as const;

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-[color:var(--gold)]/20">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link
          to="/"
          className="flex items-center gap-3 shine-on-hover rounded-lg"
          aria-label="Página inicial EBF 2026"
        >
          <LogoUCADMA className="h-12 w-12 drop-shadow" />
          <div className="hidden sm:block leading-tight">
            <div className="font-display font-bold text-lg gold-text">EBF 2026</div>
            <div className="text-[11px] text-muted-foreground -mt-0.5">UCADMA · Marupaúba</div>
          </div>
        </Link>

        <nav
          className="hidden md:flex items-center gap-1 text-sm font-medium"
          aria-label="Navegação principal"
        >
          {NAV_ITEMS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              aria-current={pathname === to ? "page" : undefined}
              className="px-3 py-2 rounded-lg hover:bg-[color:var(--gold)]/15 transition aria-[current=page]:bg-[color:var(--gold)]/20 aria-[current=page]:font-bold"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LogoAD className="h-10 w-10 hidden sm:block" aria-hidden="true" />
          <Button
            asChild
            variant="default"
            className="shine-on-hover bg-[image:var(--gradient-gold)] text-[color:var(--royal-deep)] font-bold border-0"
          >
            <Link to="/inscricao">Inscrever</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <nav
            className="fixed top-0 right-0 z-50 h-full w-72 max-w-[85vw] bg-background border-l border-[color:var(--gold)]/20 shadow-2xl p-6 flex flex-col gap-2 md:hidden animate-in slide-in-from-right"
            aria-label="Navegação mobile"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex justify-between items-center mb-6">
              <span className="font-display font-bold gold-text text-lg">Menu</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMenuOpen(false)}
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {NAV_ITEMS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                aria-current={pathname === to ? "page" : undefined}
                className="px-4 py-3 rounded-xl text-base font-medium hover:bg-[color:var(--gold)]/15 transition aria-[current=page]:bg-[color:var(--gold)]/20 aria-[current=page]:font-bold"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
            <div className="mt-auto pt-6 border-t border-[color:var(--gold)]/20">
              <Button
                asChild
                className="w-full bg-[image:var(--gradient-gold)] text-[color:var(--royal-deep)] font-bold border-0"
              >
                <Link to="/inscricao" onClick={() => setMenuOpen(false)}>
                  Fazer Inscrição
                </Link>
              </Button>
            </div>
          </nav>
        </>
      )}
    </header>
  );
}
