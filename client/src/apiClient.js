const BASE_URL = 'http://localhost:4000';

let accessToken = localStorage.getItem('accessToken') || null;

export function setToken(token) {
  accessToken = token;
  if (token) localStorage.setItem('accessToken', token);
  else localStorage.removeItem('accessToken');
}

export function getToken() {
  return accessToken;
}

export async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  if (accessToken) {
    headers['Authorization'] = 'Bearer ' + accessToken;
  }
  const res = await fetch(BASE_URL + path, { ...options, headers });
  if (res.status === 204) return null;
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}
