import { Platform } from 'react-native';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export interface AuthPlayer {
  id: string;
  email: string;
  gold: number;
  diamonds: number;
  summonScrolls: number;
}

export interface AuthResponse {
  token: string;
  player: AuthPlayer;
}

async function parseJSON(res: Response, fallbackMsg: string) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(res.ok ? fallbackMsg : `Server error (${res.status})`);
  }
}

export async function registerPlayer(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJSON(res, 'Registration failed');
  if (!res.ok) throw new Error(data.message ?? 'Registration failed');
  return data;
}

export async function loginPlayer(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJSON(res, 'Login failed');
  if (!res.ok) throw new Error(data.message ?? 'Login failed');
  return data;
}
