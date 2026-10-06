import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroups';
import { useProfiles } from '../hooks/useProfiles';
import { leaveGroup, removeMember } from '../services/groupService';
import type { AppStackParamList } from '../types/navigation';
import { NOTIFICATION_POLICY_LABELS } from '../types/notification';
import type { PublicProfile } from '../types/user';
import { getErrorMessage } from '../utils/errors';
import { availableSlots } from '../utils/groupValidation';
import { colors } from '../utils/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'GroupMembers'>;

export function GroupMembersScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const { user } = useAuth();
  const myUid = user?.uid ?? '';
  const { group, loading, error } = useGroup(groupId);
  const profiles = useProfiles(group?.memberIds ?? []);
  const [busy, setBusy] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isOwner = group?.ownerId === myUid;

  const members = useMemo<PublicProfile[]>(
    () =>
      (group?.memberIds ?? []).map(
        (id) => profiles[id] ?? { uid: id, name: 'Carregando...', nameLower: '', photoUrl: '' },
      ),
    [group, profiles],
  );

  const confirmRemove = useCallback(
    (profile: PublicProfile) => {
      Alert.alert('Remover integrante', `Remover ${profile.name} do grupo?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            setBusy(true);
            setActionError(null);
            removeMember(groupId, myUid, profile.uid)
              .catch((err: unknown) => setActionError(getErrorMessage(err)))
              .finally(() => setBusy(false));
          },
        },
      ]);
    },
    [groupId, myUid],
  );

  const confirmLeave = useCallback(() => {
    Alert.alert('Sair do grupo', 'Você deixará de receber as mensagens deste grupo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          setBusy(true);
          leaveGroup(groupId, myUid)
            .then(() => navigation.popToTop())
            .catch((err: unknown) => {
              setActionError(getErrorMessage(err));
              setBusy(false);
            });
        },
      },
    ]);
  }, [groupId, myUid, navigation]);

  const renderItem = useCallback(
    ({ item }: { item: PublicProfile }) => (
      <GroupMemberItem
        profile={item}
        isOwner={item.uid === group?.ownerId}
        onPress={(profile) => navigation.navigate('Profile', { uid: profile.uid })}
        onRemove={isOwner && item.uid !== group?.ownerId ? confirmRemove : undefined}
      />
    ),
    [group, isOwner, navigation, confirmRemove],
  );

  if (loading) return <Loading message="Carregando integrantes..." />;
  if (error || !group) {
    return <EmptyState title="Grupo indisponível" description={error ?? 'Você não faz mais parte deste grupo.'} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.name}>{group.name}</Text>
        <Text style={styles.meta}>
          {group.memberIds.length}/{group.memberLimit} integrantes · Vagas disponíveis:{' '}
          {availableSlots(group.memberLimit, group.memberIds.length)}
        </Text>
        <Text style={styles.meta}>Notificações: {NOTIFICATION_POLICY_LABELS[group.notificationPolicy]}</Text>
      </View>

      {actionError ? <ErrorMessage message={actionError} /> : null}

      <FlatList data={members} keyExtractor={(item) => item.uid} renderItem={renderItem} />

      <View style={styles.footer}>
        {isOwner ? (
          <PrimaryButton
            title="Editar grupo"
            onPress={() => navigation.navigate('GroupForm', { groupId })}
            disabled={busy}
          />
        ) : (
          <PrimaryButton title="Sair do grupo" variant="danger" onPress={confirmLeave} loading={busy} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  info: { padding: 16, backgroundColor: colors.surface, gap: 2 },
  name: { fontSize: 20, fontWeight: '800', color: colors.text },
  meta: { color: colors.textMuted },
  footer: { padding: 12, backgroundColor: colors.surface },
});
