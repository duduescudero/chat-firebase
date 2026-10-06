import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../utils/theme';

type Props = { message: string; onRetry?: () => void };

export function ErrorMessage({ message, onRetry }: Props) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.text}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.retry}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    margin: 12,
  },
  text: { color: colors.danger },
  retry: { marginTop: 8, alignSelf: 'flex-start' },
  retryText: { color: colors.danger, fontWeight: '700' },
});
