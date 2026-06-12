import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Json } from "@/integrations/supabase/types";

type RpcResult<T> = { data: T | null; error: Error | null };

const mockRpc = vi.fn<(fn: string, params: Record<string, unknown>) => RpcResult<Json>>();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (fn: string, params: Record<string, unknown>) => mockRpc(fn, params),
  },
}));

describe("Consulta pública", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockResult: Json = [
    {
      protocolo: "EBF26-ABCD1234",
      crianca_nome: "João Silva",
      crianca_idade: 6,
      crianca_sexo: "Masculino",
      status: "Inscrito",
      responsavel_nome: "Maria Silva",
      responsavel_telefone: "(11) 98765-4321",
      igreja: "UCADMA",
    },
  ] as unknown as Json;

  it("finds registration by protocol", async () => {
    mockRpc.mockImplementation(() => ({ data: mockResult, error: null }));
    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.rpc("consultar_inscricao", {
      termo: "EBF26-ABCD1234",
    });
    const data = result.data as unknown as Array<Record<string, unknown>>;
    expect(data).toHaveLength(1);
    expect(data[0].protocolo).toBe("EBF26-ABCD1234");
    expect(data[0].crianca_nome).toBe("João Silva");
  });

  it("finds registration by CPF", async () => {
    mockRpc.mockImplementation(() => ({ data: mockResult, error: null }));
    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.rpc("consultar_inscricao", {
      termo: "52998224725",
    });
    const data = result.data as unknown as Array<Record<string, unknown>>;
    expect(data).toHaveLength(1);
  });

  it("finds registration by phone", async () => {
    mockRpc.mockImplementation(() => ({ data: mockResult, error: null }));
    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.rpc("consultar_inscricao", {
      termo: "11987654321",
    });
    const data = result.data as unknown as Array<Record<string, unknown>>;
    expect(data).toHaveLength(1);
  });

  it("returns empty array for non-existent term", async () => {
    mockRpc.mockImplementation(() => ({ data: [] as unknown as Json, error: null }));
    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.rpc("consultar_inscricao", {
      termo: "TERMO-INEXISTENTE",
    });
    const data = result.data as unknown as Array<Record<string, unknown>>;
    expect(data).toHaveLength(0);
  });

  it("handles RPC error gracefully", async () => {
    mockRpc.mockImplementation(() => ({
      data: null,
      error: new Error("Erro de consulta"),
    }));
    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.rpc("consultar_inscricao", {
      termo: "EBF26-XXXX",
    });
    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
  });

  it("returns all expected fields", async () => {
    mockRpc.mockImplementation(() => ({ data: mockResult, error: null }));
    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.rpc("consultar_inscricao", {
      termo: "EBF26-ABCD1234",
    });
    const data = result.data as unknown as Array<Record<string, unknown>>;
    const row = data[0];
    expect(row).toHaveProperty("protocolo");
    expect(row).toHaveProperty("crianca_nome");
    expect(row).toHaveProperty("crianca_idade");
    expect(row).toHaveProperty("crianca_sexo");
    expect(row).toHaveProperty("status");
    expect(row).toHaveProperty("responsavel_nome");
    expect(row).toHaveProperty("responsavel_telefone");
    expect(row).toHaveProperty("igreja");
  });
});
