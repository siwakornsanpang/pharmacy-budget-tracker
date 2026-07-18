const AUTH_KEY = "budget-tracker-auth";
const TOKEN_KEY = "budget-tracker-token";

export type AuthUser = {
  id: string;
  username: string;
  name: string;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as AuthUser;
    if (!user?.username || !getToken()) return null;
    return user;
  } catch {
    return null;
  }
}

export function setStoredAuth(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(AUTH_KEY);
}

/** @deprecated use clearStoredAuth */
export function clearStoredUser(): void {
  clearStoredAuth();
}

/** @deprecated use setStoredAuth */
export function setStoredUser(user: AuthUser): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}
