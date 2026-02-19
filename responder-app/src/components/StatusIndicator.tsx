import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSyncStore } from '@features/sync/syncService';
import { useDutyStore } from '@features/duty/dutyStore';

type StatusColor = 'green' | 'yellow' | 'red' | 'blue';

function getStatusColor(
  dutyState: string,
  syncStatus: string,
  isOnline: boolean
): StatusColor {
  if (dutyState === 'OFF_DUTY') {
    return 'green';
  }

  if (dutyState === 'ON_MISSION') {
    return 'blue';
  }

  if (!isOnline || syncStatus === 'offline') {
    return 'yellow';
  }

  if (syncStatus === 'error') {
    return 'red';
  }

  return 'green';
}

function getStatusText(
  dutyState: string,
  syncStatus: string,
  isOnline: boolean
): string {
  if (dutyState === 'OFF_DUTY') {
    return 'Off Duty';
  }

  if (!isOnline || syncStatus === 'offline') {
    return 'Offline - Queuing';
  }

  if (syncStatus === 'error') {
    return 'Sync Error';
  }

  if (syncStatus === 'syncing') {
    return 'Syncing...';
  }

  return dutyState === 'ON_MISSION' ? 'On Mission' : 'On Duty';
}

interface Props {
  isOnline: boolean;
}

export function StatusIndicator({ isOnline }: Props) {
  const dutyState = useDutyStore((s) => s.dutyState);
  const syncStatus = useSyncStore((s) => s.status);

  const color = getStatusColor(dutyState, syncStatus, isOnline);
  const text = getStatusText(dutyState, syncStatus, isOnline);

  const colorStyle = styles[color];

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, colorStyle]} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  indicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  green: {
    backgroundColor: '#4CAF50',
  },
  yellow: {
    backgroundColor: '#FFC107',
  },
  red: {
    backgroundColor: '#F44336',
  },
  blue: {
    backgroundColor: '#2196F3',
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});
