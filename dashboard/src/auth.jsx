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

const LOGIN_URLS = {
  [ROLES.AUTHORITY]: "http://localhost:8003/login",
  [ROLES.ORG_A]: "http://localhost:8001/login",
  [ROLES.ORG_B]: "http://localhost:8002/login",
  [ROLES.ORG_C]: "http://localhost:8004/login",
};

const ROLE_KEY = "ghostchain_role";
const TOKEN_KEY = "ghostchain_token";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [role, setRoleState] = useState(() => localStorage.getItem(ROLE_KEY));
  const [token, setTokenState] = useState(() => localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    if (role) localStorage.setItem(ROLE_KEY, role);
    else localStorage.removeItem(ROLE_KEY);
  }, [role]);

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  async function login(identity, username, password) {
    const url = LOGIN_URLS[identity];
    if (!url) throw new Error("unknown identity");

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || "invalid credentials");
    }

    const data = await res.json();
    setTokenState(data.token);
    setRoleState(data.role);
    return data;
  }

  function logout() {
    setRoleState(null);
    setTokenState(null);
  }

  const isAuthority = role === ROLES.AUTHORITY;
  const isOrg = role && !isAuthority;

  return (
    <AuthContext.Provider value={{ role, token, login, logout, isAuthority, isOrg }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}