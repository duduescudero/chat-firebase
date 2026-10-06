import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ConversationSummary } from '../types/chat';
import { colors } from '../utils/theme';
import { Avatar } from './Avatar';

type Props = { item: ConversationSummary; onPress: (item: ConversationSummary) => void };

function ConversationItemComponent({ item, onPress }: Props) {
  return (
    <Pressable onPress={() => onPress(item)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Avatar uri={item.photoUrl} name={item.title} />
      <View style={styles.texts}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={[styles.badge, item.type === 'group' ? styles.badgeGroup : styles.badgeDirect]}>
            <Text style={styles.badgeText}>{item.type === 'group' ? 'GRUPO' : 'INDIVIDUAL'}</Text>
          </View>
        </View>
        <Text style={styles.subtitle} numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

export const ConversationItem = memo(ConversationItemComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { backgroundColor: colors.background },
  texts: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flexShrink: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  subtitle: { marginTop: 2, color: colors.textMuted },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeGroup: { backgroundColor: '#dbeafe' },
  badgeDirect: { backgroundColor: '#dcfce7' },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.text },
});
