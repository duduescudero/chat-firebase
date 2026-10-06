import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../utils/theme';

type Variant = 'primary' | 'outline' | 'danger';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
};

export function PrimaryButton({ title, onPress, loading = false, disabled = false, variant = 'primary' }: Props) {
  const inactive = disabled || loading;
  const isOutline = variant === 'outline';
  const background = variant === 'danger' ? colors.danger : isOutline ? 'transparent' : colors.primary;
  const textColor = isOutline ? colors.primary : '#fff';

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, opacity: inactive ? 0.5 : pressed ? 0.85 : 1 },
        isOutline && styles.outline,
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.text, { color: textColor }]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  outline: { borderWidth: 1.5, borderColor: colors.primary },
  text: { fontSize: 16, fontWeight: '700' },
});
