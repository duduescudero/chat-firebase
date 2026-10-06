import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../utils/theme';

type Props = { title: string; description?: string };

export function EmptyState({ title, description }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontSize: 17, fontWeight: '600', color: colors.text, textAlign: 'center' },
  description: { marginTop: 6, color: colors.textMuted, textAlign: 'center' },
});
