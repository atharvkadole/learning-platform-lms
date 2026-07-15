import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import { AuthContext } from "./authContext.js";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/auth/me")
      .then((response) => setUser(response.data.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(credentials) {
    const response = await api.post("/auth/login", credentials);
    setUser(response.data.data.user);
    return response.data.data.user;
  }

  async function logout() {
    await api.post("/auth/logout");
    setUser(null);
  }

  const value = useMemo(() => ({ user, loading, login, logout, setUser }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
