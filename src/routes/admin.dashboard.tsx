import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoUCADMA, LogoAD } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Baby, BadgeCheck, Heart, LogOut, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Painel · EBF 2026" }] }),
  component: Dashboard,
});

type Crianca = {
  id: string;
  nome: string;
  idade: number;
  sexo: string;
  turma: string | null;
  alergias: string | null;
  necessidades_especiais: string | null;
  responsavel: { nome: string; telefone: string; cpf: string; igreja: string | null } | null;
  inscricao: { protocolo: string; status: string } | null;
};

function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState(false);
  const [criancas, setCriancas] = useState<Crianca[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        navigate({ to: "/admin" });
        return;
      }
      const uid = session.session.user.id;
      const { data: staffCheck } = await supabase.rpc("is_staff", { _user_id: uid });
      if (!staffCheck) {
        setStaff(false);
        setLoading(false);
        return;
      }
      setStaff(true);
      const { data, error } = await supabase
        .from("inscricoes")
        .select(
          "protocolo, status, crianca:criancas(id, nome, idade, sexo, turma, alergias, necessidades_especiais, responsavel:responsaveis(nome, telefone, cpf, igreja))",
        )
        .order("data_inscricao", { ascending: false });
      if (error) toast.error(error.message);
      const rows: Crianca[] = (data || []).map((r: any) => ({
        ...r.crianca,
        inscricao: { protocolo: r.protocolo, status: r.status },
        responsavel: r.crianca?.responsavel,
      }));
      setCriancas(rows);
      setLoading(false);
    })();
  }, [navigate]);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/admin" });
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );

  if (!staff) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card rounded-3xl p-8 max-w-md text-center">
          <ShieldAlert className="h-16 w-16 mx-auto text-[color:var(--gold-deep)] mb-4" />
          <h1 className="font-display font-bold text-2xl mb-2">Acesso pendente</h1>
          <p className="text-muted-foreground mb-4">
            Sua conta foi criada, mas ainda não foi liberada por um administrador. Aguarde a
            aprovação.
          </p>
          <Button onClick={logout} variant="outline">
            Sair
          </Button>
        </div>
      </div>
    );
  }

  const filtered = criancas.filter((c) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      c.nome.toLowerCase().includes(q) ||
      c.responsavel?.nome?.toLowerCase().includes(q) ||
      c.responsavel?.cpf?.includes(q) ||
      c.inscricao?.protocolo?.toLowerCase().includes(q)
    );
  });

  const total = criancas.length;
  const meninos = criancas.filter((c) => c.sexo === "masculino").length;
  const meninas = criancas.filter((c) => c.sexo === "feminino").length;
  const responsaveisUnicos = new Set(criancas.map((c) => c.responsavel?.cpf)).size;
  const alergicas = criancas.filter((c) => c.alergias && c.alergias.trim().length > 2).length;

  const stats = [
    { icon: Baby, label: "Crianças Inscritas", value: total },
    { icon: Users, label: "Responsáveis", value: responsaveisUnicos },
    { icon: BadgeCheck, label: "Meninos / Meninas", value: `${meninos} / ${meninas}` },
    { icon: Heart, label: "Com alergias", value: alergicas },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-[color:var(--gold)]/20 bg-background/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <LogoUCADMA className="h-10 w-10" />
            <div>
              <div className="font-display font-bold gold-text">Painel EBF 2026</div>
              <div className="text-xs text-muted-foreground">UCADMA · AD Campo Marupaúba</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <LogoAD className="h-10 w-10 hidden sm:block" />
            <Button onClick={logout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-1.5" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-[image:var(--gradient-gold)] flex items-center justify-center text-[color:var(--royal-deep)]">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-widest">
                    {label}
                  </div>
                  <div className="font-display font-bold text-2xl">{value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, CPF, protocolo..."
              className="border-0 bg-transparent focus-visible:ring-0"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-[color:var(--gold)]/20">
                <tr>
                  <th className="py-3 px-2">Protocolo</th>
                  <th className="py-3 px-2">Criança</th>
                  <th className="py-3 px-2">Idade</th>
                  <th className="py-3 px-2">Responsável</th>
                  <th className="py-3 px-2">Telefone</th>
                  <th className="py-3 px-2">Igreja</th>
                  <th className="py-3 px-2">Saúde</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[color:var(--gold)]/10 hover:bg-[color:var(--gold)]/5"
                  >
                    <td className="py-3 px-2 font-mono text-xs font-bold text-[color:var(--gold-deep)]">
                      {c.inscricao?.protocolo}
                    </td>
                    <td className="py-3 px-2 font-medium">{c.nome}</td>
                    <td className="py-3 px-2">{c.idade}</td>
                    <td className="py-3 px-2">{c.responsavel?.nome}</td>
                    <td className="py-3 px-2">{c.responsavel?.telefone}</td>
                    <td className="py-3 px-2">{c.responsavel?.igreja}</td>
                    <td className="py-3 px-2">
                      {c.alergias || c.necessidades_especiais ? (
                        <span className="inline-flex items-center gap-1 text-xs text-destructive">
                          <Heart className="h-3 w-3" /> atenção
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">ok</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      Nenhuma inscrição encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-6 text-center">
          Precisa virar administrador? Após criar sua conta, peça a um admin para adicionar seu
          papel na tabela <code>user_roles</code>.
        </p>
      </div>
    </div>
  );
}
