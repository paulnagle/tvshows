import * as SecureStore from 'expo-secure-store';

const STORE_KEY = 'release_alerts_enabled';

export async function getReleaseAlertsEnabled(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(STORE_KEY);
  return stored === 'true';
}

export async function setReleaseAlertsEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(STORE_KEY, enabled ? 'true' : 'false');
}
