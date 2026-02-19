import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker, Polyline } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@features/theme';
import { Coordinates } from '@/utils/geo';
import { RouteResult } from '@/utils/routing';
import { shadows } from '@/theme';

interface UserMarkerProps {
  coordinate: Coordinates;
}

function UserMarkerComponent({ coordinate }: UserMarkerProps) {
  const colors = useThemeColors();

  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }}>
      <View style={styles.userMarker}>
        <View style={[styles.userMarkerDot, { backgroundColor: colors.brand.primary }]} />
        <View style={[styles.userMarkerPulse, { backgroundColor: colors.brand.primary + '30' }]} />
      </View>
    </Marker>
  );
}

export const UserMarker = memo(UserMarkerComponent);

interface TargetMarkerProps {
  coordinate: Coordinates;
}

function TargetMarkerComponent({ coordinate }: TargetMarkerProps) {
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 1 }}>
      <View style={styles.targetMarkerContainer}>
        <LinearGradient
          colors={['#dc2626', '#991b1b']}
          style={styles.targetMarker}
        >
          <Text style={styles.targetMarkerIcon}>🚨</Text>
        </LinearGradient>
        <View style={styles.targetMarkerPin} />
      </View>
    </Marker>
  );
}

export const TargetMarker = memo(TargetMarkerComponent);

interface RoutePolylineProps {
  route: RouteResult;
}

function RoutePolylineComponent({ route }: RoutePolylineProps) {
  const colors = useThemeColors();

  return (
    <Polyline
      coordinates={route.coordinates}
      strokeColor={colors.brand.primary}
      strokeWidth={6}
    />
  );
}

export const RoutePolyline = memo(RoutePolylineComponent);

interface DirectLineProps {
  from: Coordinates;
  to: Coordinates;
}

function DirectLineComponent({ from, to }: DirectLineProps) {
  const colors = useThemeColors();

  return (
    <Polyline
      coordinates={[from, to]}
      strokeColor={colors.brand.primary}
      strokeWidth={4}
      lineDashPattern={[10, 8]}
    />
  );
}

export const DirectLine = memo(DirectLineComponent);

const styles = StyleSheet.create({
  userMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#fff',
    ...shadows.md,
  },
  userMarkerPulse: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  targetMarkerContainer: {
    alignItems: 'center',
  },
  targetMarker: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  targetMarkerIcon: {
    fontSize: 28,
  },
  targetMarkerPin: {
    width: 4,
    height: 14,
    backgroundColor: '#991b1b',
    marginTop: -2,
  },
});
