import * as SecureStore from 'expo-secure-store';

const STORE_KEY = 'tmdb_api_key';

export async function getTmdbApiKey(): Promise<string> {
  const stored = await SecureStore.getItemAsync(STORE_KEY);
  if (stored) return stored;
  // Fall back to build-time env var (still works if user hasn't set one in settings)
  return process.env.EXPO_PUBLIC_TMDB_API_KEY ?? '';
}

export async function setTmdbApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(STORE_KEY, key.trim());
}

export async function deleteTmdbApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(STORE_KEY);
}
