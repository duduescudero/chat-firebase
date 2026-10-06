import { adminMessaging } from './firebaseAdmin';

export type PushTarget = { uid: string; deviceId: string; token: string };

export type PushMessage = {
  target: PushTarget;
  title: string;
  body: string;
  data: Record<string, string>;
};

export type SendReport = { sent: number; invalidTargets: PushTarget[] };

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_TOKEN_PATTERN = /^Expo(nent)?PushToken\[.+\]$/;

type ExpoTicket = { status: 'ok' | 'error'; message?: string; details?: { error?: string } };
type ExpoResponse = { data?: ExpoTicket[] };

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

/**
 * Envia os pushes. Tokens do Expo vão pelo Expo Push Service (que entrega via FCM no Android
 * e APNs no iOS). Tokens nativos de FCM vão direto pelo Firebase Admin Messaging.
 * Tokens inválidos são devolvidos para serem desativados.
 */
export async function sendPushMessages(messages: PushMessage[]): Promise<SendReport> {
  const expoMessages = messages.filter((m) => EXPO_TOKEN_PATTERN.test(m.target.token));
  const fcmMessages = messages.filter((m) => !EXPO_TOKEN_PATTERN.test(m.target.token));

  const reports = await Promise.all([sendViaExpo(expoMessages), sendViaFcm(fcmMessages)]);
  return {
    sent: reports[0].sent + reports[1].sent,
    invalidTargets: [...reports[0].invalidTargets, ...reports[1].invalidTargets],
  };
}

async function sendViaExpo(messages: PushMessage[]): Promise<SendReport> {
  const report: SendReport = { sent: 0, invalidTargets: [] };
  const accessToken = process.env.EXPO_ACCESS_TOKEN;

  for (const batch of chunk(messages, 100)) {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(
        batch.map((m) => ({
          to: m.target.token,
          title: m.title,
          body: m.body,
          data: m.data,
          sound: 'default',
          priority: 'high',
          channelId: 'default',
        })),
      ),
    });
    if (!response.ok) throw new Error(`Expo Push Service respondeu ${response.status}`);

    const json = (await response.json()) as ExpoResponse;
    const tickets = json.data ?? [];
    tickets.forEach((ticket, index) => {
      if (ticket.status === 'ok') {
        report.sent += 1;
      } else if (ticket.details?.error === 'DeviceNotRegistered') {
        report.invalidTargets.push(batch[index].target);
      }
    });
  }
  return report;
}

const INVALID_FCM_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

async function sendViaFcm(messages: PushMessage[]): Promise<SendReport> {
  const report: SendReport = { sent: 0, invalidTargets: [] };

  await Promise.all(
    messages.map(async (m) => {
      try {
        await adminMessaging.send({
          token: m.target.token,
          notification: { title: m.title, body: m.body },
          data: m.data,
          android: { priority: 'high', notification: { channelId: 'default' } },
          apns: { payload: { aps: { sound: 'default' } } },
        });
        report.sent += 1;
      } catch (error) {
        const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
        if (INVALID_FCM_CODES.has(code)) report.invalidTargets.push(m.target);
      }
    }),
  );
  return report;
}
