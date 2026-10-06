import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';

import { parseNotificationPayload, registerDeviceForPush } from '../services/notificationService';
import type { NotificationPayload, PushRegistrationStatus } from '../types/notification';

/**
 * - Registra o aparelho para push (permissão + token no Firestore).
 * - Trata o toque na notificação (app aberto, em segundo plano ou fechado) chamando onOpen.
 */
export function useNotifications(uid: string, onOpen: (payload: NotificationPayload) => void) {
  const [status, setStatus] = useState<PushRegistrationStatus>('idle');
  const handledId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    registerDeviceForPush(uid)
      .then((result) => {
        if (!cancelled) setStatus(result);
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Cobre toque com o app em segundo plano e abertura do app "frio" pela notificação.
  const lastResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!lastResponse) return;
    if (lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = lastResponse.notification.request.identifier;
    if (handledId.current === id) return;
    const payload = parseNotificationPayload(lastResponse.notification.request.content.data);
    if (!payload) return;
    handledId.current = id;
    onOpen(payload);
  }, [lastResponse, onOpen]);

  return { status };
}
