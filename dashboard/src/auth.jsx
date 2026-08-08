import { createContext, useContext, useEffect, useState } from "react";

export const ROLES = {
  AUTHORITY: "authority",
  ORG_A: "org_a",
  ORG_B: "org_b",
  ORG_C: "org_c",
};

export const ROLE_LABELS = {
  [ROLES.AUTHORITY]: "GhostChain Authority",
  [ROLES.ORG_A]: "Org A",
  [ROLES.ORG_B]: "Org B",
  [ROLES.ORG_C]: "Org C",
};

const STORAGE_KEY = "ghostchain_role";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [role, setRoleState] = useState(() => localStorage.getItem(STORAGE_KEY));

  useEffect(() => {
    if (role) localStorage.setItem(STORAGE_KEY, role);
    else localStorage.removeItem(STORAGE_KEY);
  }, [role]);

  const login = (r) => setRoleState(r);
  const logout = () => setRoleState(null);

  const isAuthority = role === ROLES.AUTHORITY;
  const isOrg = role && !isAuthority;

  return (
    <AuthContext.Provider value={{ role, login, logout, isAuthority, isOrg }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}