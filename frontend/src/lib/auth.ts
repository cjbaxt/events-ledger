const TOKEN_KEY = "el_token";
const ROLE_KEY = "el_role";

export function getToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRole(): "admin" | "guest" | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(ROLE_KEY) as "admin" | "guest" | null;
}

export function isAdmin(): boolean {
  return getRole() === "admin";
}

export function isLoggedIn(): boolean {
  return getRole() !== null && getToken() !== null;
}

export async function login(password: string): Promise<"admin" | "guest"> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error("Invalid password");
  const data = await res.json();
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(ROLE_KEY, data.role);
  window.dispatchEvent(new Event("auth-change"));
  return data.role;
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  window.dispatchEvent(new Event("auth-change"));
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
