import * as SecureStore from 'expo-secure-store';

const STORE_KEY = 'omdb_api_key';

export async function getOmdbApiKey(): Promise<string> {
  const stored = await SecureStore.getItemAsync(STORE_KEY);
  if (stored) return stored;
  // Fall back to build-time env var
  return process.env.EXPO_PUBLIC_OMDB_API_KEY ?? '';
}

export async function setOmdbApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(STORE_KEY, key.trim());
}

export async function deleteOmdbApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(STORE_KEY);
}
