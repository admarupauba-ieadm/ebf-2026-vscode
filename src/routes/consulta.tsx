import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
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
  const [erro, setErro] = useState("");
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.focus();
    }
  }, [results]);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = termo.trim();
    if (!trimmed) return;
    setLoading(true);
    setErro("");
    setResults(null);
    const { data, error } = await supabase.rpc("consultar_inscricao", { termo: trimmed });
    setLoading(false);
    if (error) {
      setErro(error.message);
      toast.error(error.message);
      return;
    }
    const list = (data || []) as ConsultaResult[];
    setResults(list);
    if (list.length === 0) {
      setErro("Nenhuma inscrição encontrada para o termo informado.");
    }
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

        <form onSubmit={buscar} className="glass-card rounded-2xl p-4 flex gap-2" role="search">
          <Input
            value={termo}
            onChange={(e) => {
              setTermo(e.target.value);
              setErro("");
            }}
            placeholder="EBF26-XXXXXXXX, CPF ou telefone"
            className="flex-1"
            aria-label="Termo de busca"
            aria-required="true"
            autoComplete="off"
          />
          <Button
            type="submit"
            disabled={loading}
            className="bg-[image:var(--gradient-gold)] text-[color:var(--royal-deep)] font-bold border-0"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Buscando...
              </span>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" /> Buscar
              </>
            )}
          </Button>
        </form>

        <div role="alert" aria-live="polite" aria-atomic="true" className="mt-4">
          {erro && (
            <div className="glass-card rounded-2xl p-4 text-center text-muted-foreground">
              {erro}
            </div>
          )}
        </div>

        {results && results.length > 0 && (
          <div
            ref={resultsRef}
            tabIndex={-1}
            className="mt-6 space-y-4 focus:outline-none"
            aria-label={`${results.length} inscrição(ões) encontrada(s)`}
          >
            {results.map((r, i) => (
              <div key={r.protocolo} className="glass-card rounded-2xl p-6">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <h2 className="font-display font-bold text-lg">{r.crianca_nome}</h2>
                  <span className="text-xs font-mono font-bold text-[color:var(--gold-deep)] bg-[color:var(--gold)]/10 px-2 py-1 rounded-lg">
                    {r.protocolo}
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  <div className="flex justify-between gap-2 py-1 border-b border-[color:var(--gold)]/10">
                    <span className="text-muted-foreground">Idade</span>
                    <span>{r.crianca_idade} anos</span>
                  </div>
                  <div className="flex justify-between gap-2 py-1 border-b border-[color:var(--gold)]/10">
                    <span className="text-muted-foreground">Sexo</span>
                    <span className="capitalize">{r.crianca_sexo}</span>
                  </div>
                  <div className="flex justify-between gap-2 py-1 border-b border-[color:var(--gold)]/10">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-semibold">{r.status}</span>
                  </div>
                  <div className="flex justify-between gap-2 py-1 border-b border-[color:var(--gold)]/10">
                    <span className="text-muted-foreground">Responsável</span>
                    <span>{r.responsavel_nome}</span>
                  </div>
                  <div className="flex justify-between gap-2 py-1 border-b border-[color:var(--gold)]/10 md:border-b-0">
                    <span className="text-muted-foreground">Telefone</span>
                    <span>{r.responsavel_telefone}</span>
                  </div>
                  <div className="flex justify-between gap-2 py-1">
                    <span className="text-muted-foreground">Igreja</span>
                    <span>{r.igreja}</span>
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
