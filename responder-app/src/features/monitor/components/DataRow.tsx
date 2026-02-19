import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@features/theme';
import { typography, spacing } from '@/theme';

interface DataRowProps {
  label: string;
  children: React.ReactNode;
}

export const DataRow = memo(function DataRow({ label, children }: DataRowProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text.secondary }]}>{label}</Text>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: typography.size.sm,
    flex: 1,
  },
});
