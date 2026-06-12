import { Link } from "@tanstack/react-router";
import { LogoUCADMA, LogoAD } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface AdminHeaderProps {
  adminName: string;
  lastAccess: string | null;
  onLogout: () => void;
}

export function AdminHeader({ adminName, lastAccess, onLogout }: AdminHeaderProps) {
  return (
    <header className="no-print border-b border-[color:var(--gold)]/20 bg-background/70 backdrop-blur-xl sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <LogoUCADMA className="h-10 w-10" />
          <div>
            <div className="font-display font-bold gold-text">Painel EBF 2026</div>
            <div className="text-xs text-muted-foreground">Coordenação · UCADMA Marupaúba</div>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <LogoAD className="h-10 w-10 hidden sm:block" />
          <div className="hidden sm:block text-right text-xs leading-tight">
            <div className="font-medium text-foreground truncate max-w-[180px]">{adminName}</div>
            {lastAccess && <div className="text-muted-foreground">Último acesso: {lastAccess}</div>}
          </div>
          <Button
            onClick={onLogout}
            variant="outline"
            size="sm"
            aria-label="Sair do painel administrativo"
          >
            <LogOut className="h-4 w-4 mr-1.5" /> Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
