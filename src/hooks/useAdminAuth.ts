import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth-context";
import { toast } from "sonner";

export function useAdminAuth() {
  const navigate = useNavigate();
  const { isAdmin: ctxIsAdmin, isLoading: ctxLoading, user: ctxUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        if (admin) {
          setLoading(false);
          return;
        }

        if (ctxIsAdmin && ctxUser) {
          setAdmin(true);
          setAuthUserId(ctxUser.id);
          if (!active) return;
          setLoading(false);
          return;
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (!active) return;

        if (sessionError || !sessionData.session) {
          await navigate({ to: "/admin" });
          return;
        }

        const uid = sessionData.session.user.id;
        const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
          _user_id: uid,
          _role: "admin",
        });
        if (!active) return;

        if (roleError || !isAdmin) {
          await supabase.auth.signOut();
          toast.error("Acesso administrativo negado.");
          await navigate({ to: "/admin" });
          return;
        }

        setAdmin(true);
        setAuthUserId(uid);
      } catch {
        toast.error("Erro ao verificar autenticação.");
        await navigate({ to: "/admin" });
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [navigate, ctxIsAdmin, ctxLoading, ctxUser]);

  const adminName = useMemo(() => {
    return (
      ctxUser?.user_metadata?.name || ctxUser?.user_metadata?.full_name || ctxUser?.email || ""
    );
  }, [ctxUser]);

  const lastAccess = useMemo(() => {
    if (!ctxUser?.last_sign_in_at) return null;
    const d = new Date(ctxUser.last_sign_in_at);
    if (Number.isNaN(d.getTime())) return null;
    return (
      d.toLocaleDateString("pt-BR") +
      " " +
      d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, [ctxUser]);

  async function logout() {
    await supabase.auth.signOut();
    await navigate({ to: "/admin" });
  }

  return { loading, admin, authUserId, ctxUser, adminName, lastAccess, logout };
}
