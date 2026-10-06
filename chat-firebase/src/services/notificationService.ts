import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import type { NotificationPayload, PushRegistrationStatus } from '../types/notification';
import { db } from './firebase';

const DEVICE_ID_KEY = 'chat.pushDeviceId';

// Comportamento quando o app está em primeiro plano.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

type ExpoExtra = { eas?: { projectId?: string } };

function resolveProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as ExpoExtra | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Pede permissão, obtém o token de push e grava no Firestore (users/{uid}/devices/{deviceId}).
 * O ENVIO do push nunca acontece aqui: só na API online.
 */
export async function registerDeviceForPush(uid: string): Promise<PushRegistrationStatus> {
  if (!Device.isDevice) return 'unavailable'; // emulador não recebe push real

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Mensagens',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== Notifications.PermissionStatus.GRANTED) {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== Notifications.PermissionStatus.GRANTED) return 'denied';

  const projectId = resolveProjectId();
  const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const token = tokenResponse.data;
  if (!token) return 'no-token';

  const deviceId = token.replace(/[^A-Za-z0-9]/g, '');
  await setDoc(doc(db, 'users', uid, 'devices', deviceId), {
    token,
    platform: Platform.OS,
    enabled: true,
    updatedAt: Date.now(),
  });
  await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  return 'granted';
}

/** Chamado no logout: o aparelho deixa de receber push do usuário anterior. */
export async function unregisterDevice(uid: string): Promise<void> {
  const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) return;
  await deleteDoc(doc(db, 'users', uid, 'devices', deviceId));
  await AsyncStorage.removeItem(DEVICE_ID_KEY);
}

/** Lê o payload (data) de uma notificação sem confiar no formato. */
export function parseNotificationPayload(data: unknown): NotificationPayload | null {
  if (typeof data !== 'object' || data === null) return null;
  const record = data as Record<string, unknown>;
  const { conversationId, conversationType, messageId } = record;
  if (typeof conversationId !== 'string' || conversationId.length === 0) return null;
  if (conversationType !== 'direct' && conversationType !== 'group') return null;
  return {
    conversationId,
    conversationType,
    messageId: typeof messageId === 'string' ? messageId : '',
  };
}
