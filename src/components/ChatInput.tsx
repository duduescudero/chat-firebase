import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MAX_MESSAGE_LENGTH } from '../services/chatService';
import { colors } from '../utils/theme';

type Props = {
  /** Deve devolver true quando o envio deu certo (o texto só é limpo nesse caso). */
  onSend: (text: string) => Promise<boolean>;
  sending: boolean;
  disabled?: boolean;
};

export function ChatInput({ onSend, sending, disabled = false }: Props) {
  const [text, setText] = useState<string>('');
  const canSend = text.trim().length > 0 && !sending && !disabled;

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    const ok = await onSend(text);
    if (ok) setText(''); // em caso de falha o texto é mantido para reenviar
  }, [canSend, onSend, text]);

  return (
    <View style={styles.container}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Digite uma mensagem"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        multiline
        maxLength={MAX_MESSAGE_LENGTH}
        editable={!disabled}
      />
      <Pressable
        onPress={() => void handleSend()}
        disabled={!canSend}
        style={[styles.button, !canSend && styles.buttonDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Enviar mensagem"
      >
        <Text style={styles.buttonText}>{sending ? '...' : 'Enviar'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 8,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 42,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.background,
    color: colors.text,
  },
  button: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: '#fff', fontWeight: '700' },
});
