import { useEffect, useState, type ReactNode } from "react";
import { fetchJson } from "../../api";
import { AuthContext } from "./AuthContext";

interface AuthProviderProps {
  children: ReactNode;
}

function AuthProvider({ children }: AuthProviderProps) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let ignore = false;

    const loadMe = async () => {
      try {
        const me = await fetchJson<{ isAdmin: boolean }>("/auth/me");
        //Only fills in "still checking", so a login or logout that finished first wins
        if (!ignore) setIsAdmin((prev) => prev ?? me.isAdmin);
      } catch {
        //If the check fails, browse as a viewer instead of breaking the page
        if (!ignore) setIsAdmin((prev) => prev ?? false);
      }
    };
    loadMe();

    return () => {
      ignore = true;
    };
  }, []);

  const login = async (password: string) => {
    await fetchJson("/auth/login", { method: "POST", body: { password } });
    setIsAdmin(true);
  };

  const logout = async () => {
    await fetchJson<void>("/auth/logout", { method: "POST" });
    setIsAdmin(false);
  };

  return (
    <AuthContext value={{ isAdmin, login, logout }}>{children}</AuthContext>
  );
}

export default AuthProvider;
