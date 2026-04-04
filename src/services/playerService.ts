const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export async function addCurrencyToBackend(
  token: string,
  delta: { gold?: number; diamonds?: number; summonScrolls?: number }
) {
  await fetch(`${BASE_URL}/api/player/me/add-currency`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(delta),
  });
}
