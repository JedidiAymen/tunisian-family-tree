// ============================================================
// API Client with TypeScript
// ============================================================

const BASE_URL = 'http://localhost:4000';

let accessToken: string | null = localStorage.getItem('accessToken') || null;

export function setToken(token: string | null): void {
  accessToken = token;
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
}

export function getToken(): string | null {
  return accessToken;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  const res = await fetch(BASE_URL + path, { ...options, headers });
  
  if (res.status === 204) return null as T;
  
  const json = await res.json();
  
  if (!res.ok) {
    throw new Error(json.error || 'Request failed');
  }
  
  return json as T;
}
