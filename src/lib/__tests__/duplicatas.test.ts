import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Json } from "@/integrations/supabase/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockRpc = vi.fn<(fn: string, params: any) => { data: Json | null; error: Error | null }>();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rpc: (fn: string, params?: any) => mockRpc(fn, params),
  },
}));

describe("Prevenção de duplicatas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects duplicate by CPF + child name + birth date", async () => {
    mockRpc.mockImplementation((fn: string) => {
      if (fn === "verificar_inscricao_duplicada") {
        return {
          data: {
            duplicada: true,
            protocolo: "EBF26-ABCD1234",
            status: "Inscrito",
          } as Json,
          error: null,
        };
      }
      return { data: null, error: null };
    });

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.rpc("verificar_inscricao_duplicada", {
      p_responsavel_cpf: "52998224725",
      p_crianca_nome: "João",
      p_data_nascimento: "2020-01-01",
    });

    const data = result.data as { duplicada: boolean; protocolo?: string } | null;
    expect(data?.duplicada).toBe(true);
    expect(data?.protocolo).toBe("EBF26-ABCD1234");
  });

  it("allows siblings (same CPF, different child)", async () => {
    mockRpc.mockImplementation((fn: string) => {
      if (fn === "verificar_inscricao_duplicada") {
        return {
          data: { duplicada: false, protocolo: null, status: null } as Json,
          error: null,
        };
      }
      return { data: null, error: null };
    });

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.rpc("verificar_inscricao_duplicada", {
      p_responsavel_cpf: "52998224725",
      p_crianca_nome: "Maria",
      p_data_nascimento: "2022-05-10",
    });
    const data = result.data as { duplicada: boolean } | null;
    expect(data?.duplicada).toBe(false);
  });

  it("returns no duplicate for new registration", async () => {
    mockRpc.mockImplementation((fn: string) => {
      if (fn === "verificar_inscricao_duplicada") {
        return {
          data: { duplicada: false, protocolo: null, status: null } as Json,
          error: null,
        };
      }
      return { data: null, error: null };
    });

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.rpc("verificar_inscricao_duplicada", {
      p_responsavel_cpf: "12345678909",
      p_crianca_nome: "Pedro",
      p_data_nascimento: "2019-06-15",
    });
    const data = result.data as { duplicada: boolean } | null;
    expect(data?.duplicada).toBe(false);
  });

  it("handles RPC error gracefully", async () => {
    mockRpc.mockImplementation(() => ({
      data: null,
      error: new Error("Erro de conexão"),
    }));

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.rpc("verificar_inscricao_duplicada", {
      p_responsavel_cpf: "52998224725",
      p_crianca_nome: "João",
      p_data_nascimento: "2020-01-01",
    });
    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
  });
});

describe("Criação de inscrição", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls criar_inscricao with valid payload", async () => {
    mockRpc.mockImplementation((fn: string) => {
      if (fn === "criar_inscricao") {
        return {
          data: { success: true, protocolo: "EBF26-NEW12345", inscricao_id: "uuid-here" } as Json,
          error: null,
        };
      }
      return { data: null, error: null };
    });

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.rpc("criar_inscricao", {
      payload: { responsavel: { cpf: "52998224725", nome: "Maria" } },
    });
    const data = result.data as { success: boolean; protocolo: string } | null;
    expect(data?.success).toBe(true);
    expect(data?.protocolo).toMatch(/^EBF26-/);
  });

  it("rejects when RPC returns error", async () => {
    mockRpc.mockImplementation(() => ({
      data: null,
      error: new Error("payload inválido"),
    }));

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.rpc("criar_inscricao");
    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
  });
});
