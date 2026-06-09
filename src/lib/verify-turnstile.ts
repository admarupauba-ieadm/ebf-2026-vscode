import { createServerFn } from "@tanstack/react-start";

type VerifyResult = { success: boolean; error?: string };

export const verifyTurnstile = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { token: string })
  .handler(async ({ data: { token } }): Promise<VerifyResult> => {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) return { success: true };
    try {
      const res = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret, response: token }) },
      );
      const result = (await res.json()) as { success: boolean; "error-codes"?: string[] };
      if (!result.success) return { success: false, error: "Falha na verificação de segurança." };
      return { success: true };
    } catch {
      return { success: false, error: "Erro ao verificar segurança. Tente novamente." };
    }
  });
