import { useCallback, useEffect, useState } from 'react';

import { requestMessageNotification } from '../services/apiService';
import { listenToMessages, sendMessage } from '../services/chatService';
import type { ChatMessage, ConversationType, MessageTarget } from '../types/chat';
import { getErrorMessage } from '../utils/errors';

export function useChat(conversationId: string, conversationType: ConversationType, myUid: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [pushWarning, setPushWarning] = useState<string | null>(null);

  // Listener em tempo real; removido ao trocar de conversa ou desmontar a tela.
  useEffect(() => {
    setLoading(true);
    setError(null);
    setMessages([]);
    return listenToMessages(
      conversationId,
      (data) => {
        setMessages(data);
        setLoading(false);
      },
      (err) => {
        setError(getErrorMessage(err));
        setLoading(false);
      },
    );
  }, [conversationId]);

  const send = useCallback(
    async (text: string, target: MessageTarget, mentionedUserIds: string[]): Promise<boolean> => {
      setSending(true);
      setSendError(null);
      setPushWarning(null);
      try {
        const messageId = await sendMessage({
          conversationId,
          conversationType,
          senderId: myUid,
          text,
          target,
          mentionedUserIds,
        });
        // A mensagem já está salva. O push é solicitado à API; se falhar, não desfaz o envio.
        try {
          await requestMessageNotification(conversationId, messageId);
        } catch (pushError) {
          setPushWarning(`Mensagem enviada, mas o push falhou: ${getErrorMessage(pushError)}`);
        }
        return true;
      } catch (err) {
        setSendError(getErrorMessage(err));
        return false;
      } finally {
        setSending(false);
      }
    },
    [conversationId, conversationType, myUid],
  );

  return { messages, loading, error, sending, sendError, pushWarning, send };
}
