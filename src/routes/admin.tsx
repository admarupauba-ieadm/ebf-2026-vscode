import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LogoAD } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Acesso Admin · EBF 2026" }] }),
  component: AdminAuth,
});

function AdminAuth() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("admin@ebf2026.local");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;
      if (sessionError) {
        toast.error(sessionError.message);
        setChecking(false);
        return;
      }

      const session = sessionData.session;
      if (!session) {
        setChecking(false);
        return;
      }

      const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });

      if (!active) return;
      if (roleError || !isAdmin) {
        await supabase.auth.signOut();
        toast.error("Sessão sem permissão administrativa.");
        setChecking(false);
        return;
      }

      navigate({ to: "/admin/dashboard" });
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: authData.user.id,
      _role: "admin",
    });
    setLoading(false);

    if (roleError || !isAdmin) {
      await supabase.auth.signOut();
      toast.error("Conta autenticada, mas sem permissão administrativa.");
      return;
    }

    navigate({ to: "/admin/dashboard" });
  }

  if (checking) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="container mx-auto px-4 py-24 max-w-md text-center text-muted-foreground">
          Verificando sessão...
        </div>
        <SiteFooter />
      </div>
    );
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
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[image:var(--gradient-gold)] text-[color:var(--royal-deep)] font-bold border-0"
            >
              {loading ? "Entrando..." : "Entrar"}
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
