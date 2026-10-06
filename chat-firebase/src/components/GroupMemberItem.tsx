import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PublicProfile } from '../types/user';
import { colors } from '../utils/theme';
import { Avatar } from './Avatar';

type Props = {
  profile: PublicProfile;
  isOwner: boolean;
  onPress: (profile: PublicProfile) => void;
  onRemove?: (profile: PublicProfile) => void;
};

function GroupMemberItemComponent({ profile, isOwner, onPress, onRemove }: Props) {
  return (
    <Pressable onPress={() => onPress(profile)} style={styles.row}>
      <Avatar uri={profile.photoUrl} name={profile.name} size={40} />
      <View style={styles.texts}>
        <Text style={styles.name}>{profile.name}</Text>
        {isOwner ? <Text style={styles.owner}>Proprietário</Text> : null}
      </View>
      {onRemove ? (
        <Pressable onPress={() => onRemove(profile)} hitSlop={8}>
          <Text style={styles.remove}>Remover</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export const GroupMemberItem = memo(GroupMemberItemComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  texts: { flex: 1 },
  name: { fontSize: 16, color: colors.text, fontWeight: '500' },
  owner: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  remove: { color: colors.danger, fontWeight: '700' },
});
