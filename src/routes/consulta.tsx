import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import { toast } from "sonner";

type ConsultaResult = {
  protocolo: string;
  crianca_nome: string;
  crianca_idade: number | string;
  crianca_sexo: string;
  status: string;
  responsavel_nome: string;
  responsavel_telefone: string;
  igreja: string;
};

export const Route = createFileRoute("/consulta")({
  head: () => ({ meta: [{ title: "Consultar Inscrição · EBF 2026" }] }),
  component: ConsultaPage,
});

function ConsultaPage() {
  const [termo, setTermo] = useState("");
  const [results, setResults] = useState<ConsultaResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (!termo.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("consultar_inscricao", { termo: termo.trim() });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setResults((data || []) as ConsultaResult[]);
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="font-display font-bold text-4xl md:text-5xl text-center gold-text mb-2">
          Consultar Inscrição
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          Digite o protocolo, CPF ou telefone do responsável.
        </p>

        <form onSubmit={buscar} className="glass-card rounded-2xl p-4 flex gap-2">
          <Input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="EBF26-XXXXXXXX, CPF ou telefone"
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={loading}
            className="bg-[image:var(--gradient-gold)] text-[color:var(--royal-deep)] font-bold border-0"
          >
            <Search className="h-4 w-4 mr-2" /> Buscar
          </Button>
        </form>

        {results && (
          <div className="mt-6 space-y-4">
            {results.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                Nenhuma inscrição encontrada.
              </div>
            )}
            {results.map((r) => (
              <div key={r.protocolo} className="glass-card rounded-2xl p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-display font-bold text-xl">{r.crianca_nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.crianca_idade} anos · {r.crianca_sexo}
                    </div>
                  </div>
                  <span className="rounded-full bg-[color:var(--gold)]/20 text-[color:var(--gold-deep)] text-xs font-bold px-3 py-1">
                    {r.status}
                  </span>
                </div>
                <div className="text-sm grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Protocolo:</span>{" "}
                    <strong>{r.protocolo}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Responsável:</span> {r.responsavel_nome}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Telefone:</span>{" "}
                    {r.responsavel_telefone}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Igreja:</span> {r.igreja}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
