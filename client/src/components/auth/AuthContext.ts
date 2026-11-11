import { createContext, useContext } from "react";

export interface AuthState {
  //null while /auth/me is still answering, so the header doesn't flash Log in first
  isAdmin: boolean | null;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return auth;
}
