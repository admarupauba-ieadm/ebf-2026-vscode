import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext, type AuthContextType } from "@/integrations/supabase/auth-context";
import { toast } from "sonner";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const checkAdminRole = useCallback(async (userId: string) => {
    const { data, error } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (error) {
      throw error;
    }

    return data === true;
  }, []);

  const applySession = useCallback(
    async (currentSession: Session | null, options: { showErrors?: boolean } = {}) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (!currentSession?.user) {
        setIsAdmin(false);
        return false;
      }

      try {
        const admin = await checkAdminRole(currentSession.user.id);
        setIsAdmin(admin);
        return admin;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao validar permissões.";
        setIsAdmin(false);
        if (options.showErrors) {
          setError(message);
          toast.error(message);
        }
        return false;
      }
    },
    [checkAdminRole],
  );

  const refreshSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        setError(sessionError.message);
        toast.error(sessionError.message);
        return;
      }

      await applySession(sessionData.session, { showErrors: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      toast.error(message);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, [applySession]);

  const signIn = useCallback<AuthContextType["signIn"]>(
    async (email: string, password: string) => {
      try {
        setIsLoading(true);
        clearError();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          const errorMessage = error.message || "Credenciais inválidas";
          setError(errorMessage);
          toast.error(errorMessage);
          return { error, data: null };
        }

        const admin = await applySession(data.session, { showErrors: true });
        if (!admin) {
          await supabase.auth.signOut();
          const adminError = new Error("Acesso administrativo negado.");
          setError(adminError.message);
          toast.error(adminError.message);
          return { error: adminError, data: null };
        }

        return { error: null, data };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao fazer login";
        setError(message);
        toast.error(message);
        return { error: err instanceof Error ? err : new Error(message), data: null };
      } finally {
        setIsLoading(false);
      }
    },
    [applySession, clearError],
  );

  const signOut = useCallback<AuthContextType["signOut"]>(async () => {
    try {
      setIsLoading(true);
      clearError();
      const { error } = await supabase.auth.signOut();

      if (error) {
        const errorMessage = error.message || "Erro ao fazer logout";
        setError(errorMessage);
        toast.error(errorMessage);
        return { error, data: null };
      }

      setUser(null);
      setSession(null);
      setIsAdmin(false);
      return { error: null, data: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao fazer logout";
      setError(message);
      toast.error(message);
      return { error: err instanceof Error ? err : new Error(message), data: null };
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  useEffect(() => {
    refreshSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (event === "SIGNED_OUT" || !currentSession?.user) {
        setIsAdmin(false);
        return;
      }

      window.setTimeout(() => {
        void applySession(currentSession, { showErrors: false });
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [applySession, refreshSession]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      isLoading,
      isAdmin,
      error,
      signIn,
      signOut,
      clearError,
      refreshSession,
    }),
    [clearError, error, isAdmin, isLoading, refreshSession, session, signIn, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
