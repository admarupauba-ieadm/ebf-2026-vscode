import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LogoAD } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/integrations/supabase/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Acesso Admin · EBF 2026" }] }),
  component: AdminAuth,
});

function AdminAuth() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { signIn, isAdmin, error, clearError } = useAuth();
  const [email, setEmail] = useState("admin@ebf2026.local");
  const [password, setPassword] = useState("");
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    if (isAdmin && pathname === "/admin") {
      navigate({ to: "/admin/dashboard" });
    }
  }, [isAdmin, navigate, pathname]);

  if (pathname !== "/admin") {
    return <Outlet />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLocalLoading(true);
    clearError();

    try {
      const { error: signInError } = await signIn(email, password);

      if (!signInError) {
        toast.success("Login realizado com sucesso!");
        navigate({ to: "/admin/dashboard" });
      }
    } catch (error) {
      console.error("[AdminLogin] submit: erro inesperado", error);
    } finally {
      setLocalLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container mx-auto px-4 py-16 max-w-md">
        <div className="glass-card rounded-3xl p-8">
          <div className="flex flex-col items-center mb-6">
            <LogoAD className="h-20 w-20 mb-3" />
            <h1 className="font-display font-bold text-2xl">Área Admin</h1>
            <p className="text-sm text-muted-foreground">EBF 2026 · UCADMA Marupaúba</p>
          </div>

          {error && (
            <div
              className="mb-4 p-4 rounded-md bg-red-50 border-2 border-red-300 text-red-800 text-sm"
              role="alert"
            >
              <p className="font-semibold mb-1">Falha na autenticação</p>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={localLoading}
                placeholder="admin@ebf2026.local"
                autoComplete="username"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={localLoading}
                placeholder="Digite sua senha"
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              disabled={localLoading}
              className="w-full bg-[image:var(--gradient-gold)] text-[color:var(--royal-deep)] font-bold border-0"
            >
              {localLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Acesso exclusivo da coordenação EBF.
            <br />
            Usuário padrão: <span className="font-mono">admin@ebf2026.local</span>
          </p>
          <Link
            to="/"
            className="block text-center text-xs mt-4 text-muted-foreground hover:underline"
          >
            Voltar ao site
          </Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
