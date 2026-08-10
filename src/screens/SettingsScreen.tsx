import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { exportBackup, importBackup } from '../services/backup';
import { dataEvents } from '../events/dataEvents';
import { getTmdbApiKey, setTmdbApiKey, deleteTmdbApiKey } from '../services/tmdbApiKey';
import { getOmdbApiKey, setOmdbApiKey, deleteOmdbApiKey } from '../services/omdbApiKey';
import { getReleaseAlertsEnabled, setReleaseAlertsEnabled } from '../services/releaseAlerts';
import { requestReleaseAlertPermissions } from '../services/releaseTracking';

export default function SettingsScreen() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  // ── OMDb API key ──────────────────────────────────────────────────────────
  const [omdbKey, setOmdbKey] = useState('');
  const [savedOmdbKey, setSavedOmdbKey] = useState('');
  const [savingOmdbKey, setSavingOmdbKey] = useState(false);
  const [omdbKeyVisible, setOmdbKeyVisible] = useState(false);

  // ── TMDB API key ──────────────────────────────────────────────────────────
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [keyVisible, setKeyVisible] = useState(false);
  const [releaseAlertsEnabled, setReleaseAlertsEnabledState] = useState(false);

  useEffect(() => {
    getOmdbApiKey().then((key) => {
      setSavedOmdbKey(key);
      setOmdbKey(key);
    });
    getTmdbApiKey().then((key) => {
      setSavedKey(key);
      setApiKey(key);
    });
    getReleaseAlertsEnabled().then(setReleaseAlertsEnabledState);
  }, []);

  async function handleSaveOmdbKey() {
    setSavingOmdbKey(true);
    try {
      if (!omdbKey.trim()) {
        await deleteOmdbApiKey();
        setSavedOmdbKey('');
        Alert.alert('API Key Cleared', 'The OMDb API key has been removed.');
      } else {
        await setOmdbApiKey(omdbKey.trim());
        setSavedOmdbKey(omdbKey.trim());
        Alert.alert('Saved', 'OMDb API key saved successfully.');
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not save key');
    } finally {
      setSavingOmdbKey(false);
    }
  }

  const omdbKeyChanged = omdbKey !== savedOmdbKey;

  async function handleSaveKey() {
    setSavingKey(true);
    try {
      if (!apiKey.trim()) {
        await deleteTmdbApiKey();
        setSavedKey('');
        Alert.alert('API Key Cleared', 'The TMDB API key has been removed.');
      } else {
        await setTmdbApiKey(apiKey.trim());
        setSavedKey(apiKey.trim());
        Alert.alert('Saved', 'TMDB API key saved successfully.');
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not save key');
    } finally {
      setSavingKey(false);
    }
  }

  const keyChanged = apiKey !== savedKey;

  // ── Backup ────────────────────────────────────────────────────────────────
  async function handleExport() {
    setExporting(true);
    try {
      await exportBackup();
    } catch (err) {
      Alert.alert('Export Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    Alert.alert(
      'Restore Backup',
      'Existing shows will be overwritten by the backup data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setImporting(true);
            try {
              const { restored } = await importBackup();
              if (restored === 0) return; // user cancelled picker
              dataEvents.emit(); // tell all list screens to reload
              Alert.alert('Restore Complete', `${restored} show${restored !== 1 ? 's' : ''} restored.`);
            } catch (err) {
              Alert.alert('Import Failed', err instanceof Error ? err.message : 'Unknown error');
            } finally {
              setImporting(false);
            }
          },
        },
      ]
    );
  }

  async function handleToggleReleaseAlerts() {
    const nextValue = !releaseAlertsEnabled;
    if (nextValue) {
      const granted = await requestReleaseAlertPermissions();
      if (!granted) {
        Alert.alert('Permission Needed', 'Enable notifications to receive new episode alerts.');
        return;
      }
    }

    await setReleaseAlertsEnabled(nextValue);
    setReleaseAlertsEnabledState(nextValue);
  }

  return (
    <ScrollView className="flex-1 bg-[#0f172a]" contentContainerStyle={{ padding: 20 }}>

      {/* ── OMDb API Key section ── */}
      <Text className="text-[#94a3b8] text-xs font-semibold uppercase tracking-widest mb-3">
        OMDb API Key
      </Text>

      <View className="bg-[#1e293b] rounded-xl overflow-hidden mb-2">
        <View className="px-4 pt-4 pb-3">
          <Text className="text-[#f1f5f9] text-base font-medium mb-1">API Key</Text>
          <Text className="text-[#64748b] text-sm mb-3">
            Required for search and show details.{'\n'}
            Get yours at omdbapi.com → API Key.
          </Text>

          {/* Input row */}
          <View className="flex-row items-center bg-[#0f172a] rounded-lg overflow-hidden border border-[#334155]">
            <TextInput
              value={omdbKey}
              onChangeText={setOmdbKey}
              placeholder="Paste your OMDb API key here"
              placeholderTextColor="#475569"
              secureTextEntry={!omdbKeyVisible}
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 text-[#f1f5f9] text-sm px-3 py-3"
            />
            <TouchableOpacity
              onPress={() => setOmdbKeyVisible((v) => !v)}
              className="px-3 py-3"
            >
              <Text className="text-[#64748b] text-sm">{omdbKeyVisible ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSaveOmdbKey}
          disabled={savingOmdbKey || !omdbKeyChanged}
          className="flex-row items-center justify-between px-4 py-3 border-t border-[#334155] active:opacity-70"
          style={{ opacity: !omdbKeyChanged ? 0.4 : 1 }}
        >
          <Text className="text-[#6366f1] text-base font-medium">
            {!omdbKey.trim() && savedOmdbKey ? 'Clear Key' : 'Save Key'}
          </Text>
          {savingOmdbKey ? <ActivityIndicator color="#6366f1" size="small" /> : null}
        </TouchableOpacity>
      </View>

      {savedOmdbKey ? (
        <Text className="text-[#22c55e] text-xs mb-6">✓ OMDb API key is set</Text>
      ) : (
        <Text className="text-[#f59e0b] text-xs mb-6">⚠ No OMDb key — searches will fail</Text>
      )}

      {/* ── TMDB API Key section ── */}
      <Text className="text-[#94a3b8] text-xs font-semibold uppercase tracking-widest mb-3">
        TMDB API Key
      </Text>

      <View className="bg-[#1e293b] rounded-xl overflow-hidden mb-2">
        <View className="px-4 pt-4 pb-3">
          <Text className="text-[#f1f5f9] text-base font-medium mb-1">API Key (v3)</Text>
          <Text className="text-[#64748b] text-sm mb-3">
            Required for Recommendations and release tracking only.{'\n'}
            Get yours at themoviedb.org → Settings → API.
          </Text>

          {/* Input row */}
          <View className="flex-row items-center bg-[#0f172a] rounded-lg overflow-hidden border border-[#334155]">
            <TextInput
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Paste your API key here"
              placeholderTextColor="#475569"
              secureTextEntry={!keyVisible}
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 text-[#f1f5f9] text-sm px-3 py-3"
            />
            <TouchableOpacity
              onPress={() => setKeyVisible((v) => !v)}
              className="px-3 py-3"
            >
              <Text className="text-[#64748b] text-sm">{keyVisible ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSaveKey}
          disabled={savingKey || !keyChanged}
          className="flex-row items-center justify-between px-4 py-3 border-t border-[#334155] active:opacity-70"
          style={{ opacity: !keyChanged ? 0.4 : 1 }}
        >
          <Text className="text-[#6366f1] text-base font-medium">
            {!apiKey.trim() && savedKey ? 'Clear Key' : 'Save Key'}
          </Text>
          {savingKey ? <ActivityIndicator color="#6366f1" size="small" /> : null}
        </TouchableOpacity>
      </View>

      {savedKey ? (
        <Text className="text-[#22c55e] text-xs mb-6">✓ API key is set</Text>
      ) : (
        <Text className="text-[#f59e0b] text-xs mb-6">⚠ No API key — searches will fail</Text>
      )}

      <Text className="text-[#94a3b8] text-xs font-semibold uppercase tracking-widest mb-3">
        Alerts
      </Text>

      <View className="bg-[#1e293b] rounded-xl overflow-hidden mb-6">
        <TouchableOpacity
          onPress={handleToggleReleaseAlerts}
          className="flex-row items-center justify-between px-4 py-4 active:opacity-70"
        >
          <View className="flex-1 pr-3">
            <Text className="text-[#f1f5f9] text-base font-medium">New Episode Alerts</Text>
            <Text className="text-[#64748b] text-sm mt-0.5">
              Send a local notification when a tracked show has a newly available episode
            </Text>
          </View>
          <View className={`rounded-full px-3 py-1 ${releaseAlertsEnabled ? 'bg-emerald-900' : 'bg-[#0f172a]'}`}>
            <Text className={`text-xs font-semibold ${releaseAlertsEnabled ? 'text-emerald-300' : 'text-[#94a3b8]'}`}>
              {releaseAlertsEnabled ? 'On' : 'Off'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Backup section ── */}
      <Text className="text-[#94a3b8] text-xs font-semibold uppercase tracking-widest mb-3">
        Backup &amp; Restore
      </Text>

      <View className="bg-[#1e293b] rounded-xl overflow-hidden mb-6">
        {/* Export */}
        <TouchableOpacity
          onPress={handleExport}
          disabled={exporting || importing}
          className="flex-row items-center justify-between px-4 py-4 border-b border-[#334155] active:opacity-70"
        >
          <View className="flex-1">
            <Text className="text-[#f1f5f9] text-base font-medium">Export Backup</Text>
            <Text className="text-[#64748b] text-sm mt-0.5">
              Save all your lists to a JSON file
            </Text>
          </View>
          {exporting ? (
            <ActivityIndicator color="#6366f1" />
          ) : (
            <Text className="text-[#6366f1] text-xl">⬆️</Text>
          )}
        </TouchableOpacity>

        {/* Import */}
        <TouchableOpacity
          onPress={handleImport}
          disabled={exporting || importing}
          className="flex-row items-center justify-between px-4 py-4 active:opacity-70"
        >
          <View className="flex-1">
            <Text className="text-[#f1f5f9] text-base font-medium">Restore Backup</Text>
            <Text className="text-[#64748b] text-sm mt-0.5">
              Load a previously exported JSON file
            </Text>
          </View>
          {importing ? (
            <ActivityIndicator color="#6366f1" />
          ) : (
            <Text className="text-[#6366f1] text-xl">⬇️</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Info ── */}
      <Text className="text-[#475569] text-xs leading-5 text-center">
        Backups include your Watching, To Watch, and History lists.{'\n'}
        Restoring merges the file into your current data — shows already in your
        lists will be updated with the backup values.
      </Text>
    </ScrollView>
  );
}
