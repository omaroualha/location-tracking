import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useMissionStore } from '@features/mission/missionStore';
import { getRandomMockMission } from '@features/mission/mockMissions';
import { Mission } from '@features/mission/types';

interface MissionNotificationData {
  type: 'mission_alert';
  mission: Mission;
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
}

export async function requestNotificationPermissions(): Promise<NotificationPermissionStatus> {
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return {
    granted: finalStatus === 'granted',
    canAskAgain: finalStatus !== 'denied',
  };
}

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  return {
    granted: status === 'granted',
    canAskAgain,
  };
}

// Set up notification response listener (when user taps notification)
let responseSubscription: Notifications.EventSubscription | null = null;

export function setupNotificationResponseListener(): () => void {
  responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content
        .data as unknown as MissionNotificationData | null;

      if (data?.type === 'mission_alert' && data?.mission) {
        const missionStore = useMissionStore.getState();
        if (missionStore.status === 'idle') {
          missionStore.receiveMission(data.mission);
        }
      }
    }
  );

  return () => {
    responseSubscription?.remove();
    responseSubscription = null;
  };
}

// Set up notification received listener (when notification arrives while app is open)
let receivedSubscription: Notifications.EventSubscription | null = null;

export function setupNotificationReceivedListener(): () => void {
  receivedSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      const data = notification.request.content
        .data as unknown as MissionNotificationData | null;

      if (data?.type === 'mission_alert' && data?.mission) {
        const missionStore = useMissionStore.getState();
        if (missionStore.status === 'idle') {
          missionStore.receiveMission(data.mission);
        }
      }
    }
  );

  return () => {
    receivedSubscription?.remove();
    receivedSubscription = null;
  };
}

// Schedule a local notification (for testing)
export async function scheduleTestMissionNotification(
  delaySeconds: number = 5
): Promise<string> {
  const mission = getRandomMockMission();

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Incoming Mission',
      body: `${mission.type} - ${mission.location.address}`,
      data: {
        type: 'mission_alert',
        mission,
      },
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delaySeconds,
    },
  });

  return identifier;
}

// Cancel all pending notifications
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Get push notification token (for real push notifications via backend)
export async function getPushToken(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('mission-alerts', {
      name: 'Mission Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#FF0000',
      sound: 'default',
    });
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'responder-app',
    });
    return token.data;
  } catch (error) {
    console.warn('[NotificationService] Failed to get push token:', error);
    return null;
  }
}
