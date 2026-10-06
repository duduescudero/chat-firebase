import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { PublicProfile } from '../types/user';
import { colors } from '../utils/theme';

type Props = {
  members: PublicProfile[];
  selectedId: string | null;
  onSelect: (memberId: string | null) => void;
};

/** Seleção explícita de destinatário (menção) em conversas de grupo. */
export function MentionSelector({ members, selectedId, onSelect }: Props) {
  if (members.length === 0) return null;
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Direcionar a:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Pressable
          onPress={() => onSelect(null)}
          style={[styles.chip, selectedId === null && styles.chipActive]}
        >
          <Text style={[styles.chipText, selectedId === null && styles.chipTextActive]}>Todos</Text>
        </Pressable>
        {members.map((member) => {
          const active = member.uid === selectedId;
          return (
            <Pressable
              key={member.uid}
              onPress={() => onSelect(active ? null : member.uid)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>@{member.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  label: { color: colors.textMuted, marginRight: 8, fontSize: 12 },
  chips: { gap: 6, paddingRight: 12 },
  chip: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.background,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '700' },
});
