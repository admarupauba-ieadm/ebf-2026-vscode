import { createContext, useContext } from "react";
import type { AuthError, Session, User } from "@supabase/supabase-js";

export type AuthResult<TData = unknown> = Promise<{
  data: TData | null;
  error: AuthError | Error | null;
}>;

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  error: string | null;
  signIn: (email: string, password: string) => AuthResult;
  signOut: () => AuthResult<null>;
  clearError: () => void;
  refreshSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
