import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@features/theme';
import { typography, spacing } from '@/theme';
import { getEventColor, formatCoord } from '../utils';
import type { LocationData } from '@features/location/types';

interface LocationEvent {
  id: number;
  timestamp: number;
  type: string;
  count: number;
  source: string;
  location?: LocationData;
  error?: string;
}

interface LocationEventRowProps {
  event: LocationEvent;
}

export const LocationEventRow = memo(function LocationEventRow({
  event,
}: LocationEventRowProps) {
  const colors = useThemeColors();
  const eventColor = getEventColor(event.type);

  return (
    <View style={styles.container}>
      <Text style={[styles.time, { color: colors.text.tertiary }]}>
        {new Date(event.timestamp).toLocaleTimeString()}
      </Text>
      <View style={[styles.dot, { backgroundColor: eventColor }]} />
      <Text style={[styles.source, { color: colors.text.tertiary }]}>[{event.source}]</Text>
      <Text style={[styles.message, { color: colors.text.secondary }]} numberOfLines={1}>
        {event.type === 'received'
          ? `+${event.count} loc @ ${formatCoord(event.location?.latitude)}`
          : event.error}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  time: {
    fontSize: 10,
    fontFamily: 'monospace',
    width: 70,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: spacing.xs,
  },
  source: {
    fontSize: 10,
    width: 65,
  },
  message: {
    flex: 1,
    fontSize: 10,
    fontFamily: 'monospace',
  },
});
