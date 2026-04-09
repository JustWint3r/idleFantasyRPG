const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export interface SummonCharacter {
  id: string;
  name: string;
  rarity: 'S' | 'A' | 'B';
}

export interface SummonPullResult {
  character: SummonCharacter;
  isPity: boolean;
  isPityA: boolean;
}

export interface SummonEvent {
  id: string;
  name: string;
}

export interface SummonStatePayload {
  pityCount: number;
  pityACount: number;
}

export interface SummonPullResponse {
  event: SummonEvent;
  results: SummonPullResult[];
  eventState: SummonStatePayload;
  currencies: {
    gold: number;
    diamonds: number;
    summonScrolls: number;
  };
}

export interface SummonStateResponse {
  events: SummonEvent[];
  eventStates: Record<string, SummonStatePayload>;
  currencies: {
    gold: number;
    diamonds: number;
    summonScrolls: number;
  };
}

async function parseJSON(res: Response, fallbackMsg: string) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(res.ok ? fallbackMsg : `Server error (${res.status})`);
  }
}

export async function fetchSummonState(token: string): Promise<SummonStateResponse> {
  const res = await fetch(`${BASE_URL}/api/summon/state`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await parseJSON(res, 'Failed to load summon state');
  if (!res.ok) throw new Error(data.message ?? 'Failed to load summon state');
  return data;
}

export async function summonPull(
  token: string,
  count: 1 | 10,
  eventId: string,
): Promise<SummonPullResponse> {
  const res = await fetch(`${BASE_URL}/api/summon/pull`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ count, eventId }),
  });

  const data = await parseJSON(res, 'Summon failed');
  if (!res.ok) throw new Error(data.message ?? 'Summon failed');
  return data;
}
