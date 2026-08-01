import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { exportBackup, importBackup } from '../services/backup';
import { dataEvents } from '../events/dataEvents';

export default function SettingsScreen() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

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

  return (
    <ScrollView className="flex-1 bg-[#0f172a]" contentContainerStyle={{ padding: 20 }}>
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
