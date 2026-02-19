import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useDutyStore } from '@features/duty/dutyStore';
import { useMissionStore } from '@features/mission/missionStore';
import { triggerMockMission } from '@features/mission/mockMissions';
import { scheduleTestMissionNotification } from '@features/notifications/notificationService';
import { useThemeStore, useThemeColors } from '@features/theme';
import { useNetworkStatus } from '@features/app';
import { typography, spacing, radius, shadows } from '@/theme';

export function ProfileScreen() {
  const colors = useThemeColors();
  const themeMode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const network = useNetworkStatus();
  const dutyState = useDutyStore((s) => s.dutyState);
  const missionStatus = useMissionStore((s) => s.status);
  const resetMission = useMissionStore((s) => s.reset);

  const stats = [
    { value: '127', label: 'Missions', icon: '🚨' },
    { value: '4.9', label: 'Rating', icon: '⭐' },
    { value: '98%', label: 'Response', icon: '⚡' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={[styles.title, { color: colors.text.primary }]}>Profile</Text>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.background.secondary, borderColor: colors.ui.border }]}>
          <LinearGradient
            colors={colors.gradients.primary}
            style={styles.avatarGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.avatarText, { color: colors.text.primary }]}>R</Text>
          </LinearGradient>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text.primary }]}>Responder</Text>
            <Text style={[styles.profileRole, { color: colors.text.secondary }]}>Emergency Medical Technician</Text>
            <View style={[styles.idBadge, { backgroundColor: colors.brand.primary + '20' }]}>
              <Text style={[styles.idText, { color: colors.brand.primary }]}>ID: EMT-2024-001</Text>
            </View>
          </View>
        </View>

        {/* Stats Section */}
        <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>Statistics</Text>
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View key={index} style={[styles.statCard, { backgroundColor: colors.background.secondary, borderColor: colors.ui.border }]}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={[styles.statValue, { color: colors.text.primary }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>Testing</Text>
        <View style={styles.actionsCard}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
              missionStatus !== 'idle' && styles.actionButtonDisabled,
            ]}
            onPress={() => triggerMockMission()}
            disabled={missionStatus !== 'idle'}
          >
            <LinearGradient
              colors={missionStatus === 'idle' ? colors.gradients.primary : [colors.background.tertiary, colors.background.tertiary]}
              style={styles.actionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.actionIcon}>🚨</Text>
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionTitle, { color: colors.text.primary }]}>Trigger Test Mission</Text>
                <Text style={[styles.actionSubtitle, { color: colors.text.secondary }]}>Simulate incoming alert</Text>
              </View>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
              missionStatus !== 'idle' && styles.actionButtonDisabled,
            ]}
            onPress={() => scheduleTestMissionNotification(3)}
            disabled={missionStatus !== 'idle'}
          >
            <LinearGradient
              colors={missionStatus === 'idle' ? ['#9333ea', '#7c3aed'] : [colors.background.tertiary, colors.background.tertiary]}
              style={styles.actionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.actionIcon}>🔔</Text>
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionTitle, { color: colors.text.primary }]}>Test Notification</Text>
                <Text style={[styles.actionSubtitle, { color: colors.text.secondary }]}>Triggers in 3 seconds</Text>
              </View>
            </LinearGradient>
          </Pressable>

          {missionStatus !== 'idle' && (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={resetMission}
            >
              <View style={[styles.resetButton, { backgroundColor: colors.background.tertiary, borderColor: colors.ui.border }]}>
                <Text style={styles.actionIcon}>🔄</Text>
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionTitle, { color: colors.text.primary }]}>Reset Mission</Text>
                  <Text style={[styles.actionSubtitle, { color: colors.text.secondary }]}>Cancel current mission</Text>
                </View>
              </View>
            </Pressable>
          )}
        </View>

        {/* Settings */}
        <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>Settings</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.background.secondary, borderColor: colors.ui.border }]}>
          <Pressable
            style={({ pressed }) => [
              styles.settingRow,
              pressed && { opacity: 0.7 },
            ]}
            onPress={toggleTheme}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: colors.brand.primary + '20' }]}>
                <Text style={styles.settingIcon}>{themeMode === 'dark' ? '🌙' : '☀️'}</Text>
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: colors.text.primary }]}>Appearance</Text>
                <Text style={[styles.settingSubtitle, { color: colors.text.tertiary }]}>
                  {themeMode === 'dark' ? 'Dark mode' : 'Light mode'}
                </Text>
              </View>
            </View>
            <View style={[styles.themeToggle, { backgroundColor: themeMode === 'dark' ? colors.brand.primary : colors.brand.primary }]}>
              <View
                style={[
                  styles.themeToggleKnob,
                  { backgroundColor: '#ffffff' },
                  themeMode === 'light' && styles.themeToggleKnobActive,
                ]}
              />
            </View>
          </Pressable>
        </View>

        {/* Status Info */}
        <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>System Status</Text>
        <View style={[styles.statusCard, { backgroundColor: colors.background.secondary, borderColor: colors.ui.border }]}>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.text.secondary }]}>Network</Text>
            <View style={[styles.statusBadge, { backgroundColor: (network.isConnected ? colors.status.success : colors.status.warning) + '20' }]}>
              <Text style={[styles.statusBadgeText, { color: network.isConnected ? colors.status.success : colors.status.warning }]}>
                {network.isConnected ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>
          </View>
          <View style={[styles.statusDivider, { backgroundColor: colors.ui.border }]} />
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.text.secondary }]}>Duty Status</Text>
            <Text style={[styles.statusValue, { color: colors.text.primary }]}>{dutyState.replace('_', ' ')}</Text>
          </View>
          <View style={[styles.statusDivider, { backgroundColor: colors.ui.border }]} />
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.text.secondary }]}>Mission Status</Text>
            <Text style={[styles.statusValue, { color: colors.text.primary }]}>{missionStatus.toUpperCase()}</Text>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appVersion, { color: colors.text.tertiary }]}>Responder v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing['6xl'],
  },
  title: {
    fontSize: typography.size['4xl'],
    fontWeight: typography.weight.bold,
    marginBottom: spacing['2xl'],
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius['2xl'],
    marginBottom: spacing['2xl'],
    borderWidth: 1,
    ...shadows.md,
  },
  avatarGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: typography.weight.bold,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    marginBottom: spacing.xs,
  },
  profileRole: {
    fontSize: typography.size.md,
    marginBottom: spacing.sm,
  },
  idBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  idText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  sectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.xl,
    alignItems: 'center',
    borderWidth: 1,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
  },
  actionsCard: {
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  actionButton: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  actionButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.xl,
  },
  actionIcon: {
    fontSize: 28,
    marginRight: spacing.lg,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    marginBottom: spacing.xs,
  },
  actionSubtitle: {
    fontSize: typography.size.sm,
  },
  settingsCard: {
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing['2xl'],
    borderWidth: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIcon: {
    fontSize: 20,
  },
  settingTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  settingSubtitle: {
    fontSize: typography.size.sm,
    marginTop: 2,
  },
  themeToggle: {
    width: 52,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  themeToggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  themeToggleKnobActive: {
    alignSelf: 'flex-end',
  },
  statusCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing['2xl'],
    borderWidth: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  statusLabel: {
    fontSize: typography.size.md,
  },
  statusValue: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  statusDivider: {
    height: 1,
  },
  statusBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  statusBadgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    letterSpacing: typography.letterSpacing.wide,
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  appVersion: {
    fontSize: typography.size.sm,
  },
});
