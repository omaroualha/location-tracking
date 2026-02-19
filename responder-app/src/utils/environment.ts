import Constants from 'expo-constants';
import * as Device from 'expo-device';

/**
 * Detects if the app is running in Expo Go.
 * Background location doesn't work in Expo Go - requires a development build.
 */
export function isExpoGo(): boolean {
  // Check if executionEnvironment indicates Expo Go ('storeClient')
  // vs development build ('standalone') or bare workflow ('bare')
  return Constants.executionEnvironment === 'storeClient';
}

/**
 * Detects if this is a development build (not Expo Go).
 */
export function isDevBuild(): boolean {
  return !isExpoGo();
}

/**
 * Detects if running on a simulator/emulator vs real device.
 * Uses expo-device for reliable detection.
 * - Device.isDevice: true on real devices, false on simulators
 * - Device.deviceType: DeviceType.PHONE/TABLET on real, UNKNOWN on some simulators
 */
export function isSimulator(): boolean {
  // expo-device provides reliable detection
  // Device.isDevice is true on real devices, false on simulators/emulators
  return !Device.isDevice;
}
