import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@features/theme';
import { typography, spacing } from '@/theme';

interface SectionHeaderProps {
  icon: string;
  title: string;
  trailing?: React.ReactNode;
}

export const SectionHeader = memo(function SectionHeader({
  icon,
  title,
  trailing,
}: SectionHeaderProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
      {trailing}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  icon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
});
