import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { ImagePickerButton } from '../components/ImagePickerButton';
import { Loading } from '../components/Loading';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroups';
import { useProfiles } from '../hooks/useProfiles';
import { createGroup, updateGroup } from '../services/groupService';
import type { AppStackParamList } from '../types/navigation';
import {
  NOTIFICATION_POLICIES,
  NOTIFICATION_POLICY_LABELS,
  type NotificationPolicy,
} from '../types/notification';
import type { PublicProfile } from '../types/user';
import { getErrorMessage } from '../utils/errors';
import {
  MAX_MEMBER_LIMIT,
  availableSlots,
  parseMemberLimit,
  validateGroupName,
  validateMemberLimit,
} from '../utils/groupValidation';
import { colors } from '../utils/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'GroupForm'>;

export function GroupFormScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const myUid = user?.uid ?? '';
  const groupId = route.params?.groupId;
  const pickedIds = route.params?.pickedIds;
  const isEditing = Boolean(groupId);

  const { group, loading: loadingGroup, error: groupError } = useGroup(groupId);

  const [name, setName] = useState<string>('');
  const [limitText, setLimitText] = useState<string>('5');
  const [policy, setPolicy] = useState<NotificationPolicy>('all_group_messages');
  const [memberIds, setMemberIds] = useState<string[]>([]); // não inclui o proprietário
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef<boolean>(false);

  // Edição: preenche o formulário uma única vez com os dados do grupo.
  useEffect(() => {
    if (!group || initialized.current) return;
    initialized.current = true;
    setName(group.name);
    setLimitText(String(group.memberLimit));
    setPolicy(group.notificationPolicy);
    setMemberIds(group.memberIds.filter((id) => id !== group.ownerId));
  }, [group]);

  // Volta da tela de seleção de usuários.
  useEffect(() => {
    if (pickedIds) setMemberIds(pickedIds.filter((id) => id !== myUid));
  }, [pickedIds, myUid]);

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Editar grupo' : 'Novo grupo' });
  }, [navigation, isEditing]);

  const profiles = useProfiles(memberIds);
  const limit = parseMemberLimit(limitText);
  const totalMembers = memberIds.length + 1; // + proprietário
  const slots = limit !== null ? availableSlots(limit, totalMembers) : 0;

  const memberProfiles = useMemo<PublicProfile[]>(
    () =>
      memberIds.map(
        (id) => profiles[id] ?? { uid: id, name: 'Carregando...', nameLower: '', photoUrl: '' },
      ),
    [memberIds, profiles],
  );

  const removeLocal = useCallback((profile: PublicProfile) => {
    setMemberIds((previous) => previous.filter((id) => id !== profile.uid));
  }, []);

  const openPicker = useCallback(() => {
    navigation.navigate('Users', {
      mode: 'select',
      selectedIds: memberIds,
      memberLimit: limit !== null && limit >= 2 ? Math.min(limit, MAX_MEMBER_LIMIT) : MAX_MEMBER_LIMIT,
    });
  }, [navigation, memberIds, limit]);

  const handleSave = useCallback(async () => {
    setError(null);
    const nameError = validateGroupName(name);
    if (nameError) return setError(nameError);
    if (memberIds.length < 1) return setError('Selecione pelo menos um integrante além de você.');
    const limitError = validateMemberLimit(limit, totalMembers);
    if (limitError || limit === null) return setError(limitError ?? 'Limite inválido.');

    setSaving(true);
    try {
      if (isEditing && groupId) {
        await updateGroup({
          groupId,
          requesterId: myUid,
          name,
          memberIds,
          memberLimit: limit,
          notificationPolicy: policy,
          photoUri,
        });
        navigation.goBack();
      } else {
        const createdId = await createGroup({
          ownerId: myUid,
          name,
          memberIds,
          memberLimit: limit,
          notificationPolicy: policy,
          photoUri,
        });
        navigation.replace('Chat', { conversationId: createdId, conversationType: 'group' });
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }, [name, memberIds, limit, totalMembers, isEditing, groupId, myUid, policy, photoUri, navigation]);

  if (isEditing && loadingGroup) return <Loading message="Carregando grupo..." />;
  if (isEditing && (groupError || !group)) {
    return <EmptyState title="Grupo indisponível" description={groupError ?? 'Você não tem acesso a este grupo.'} />;
  }
  if (isEditing && group && group.ownerId !== myUid) {
    return <EmptyState title="Sem permissão" description="Somente o proprietário pode editar o grupo." />;
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {error ? <ErrorMessage message={error} /> : null}

        <ImagePickerButton
          uri={photoUri}
          currentUrl={group?.photoUrl ?? ''}
          name={name || 'Grupo'}
          onPick={setPhotoUri}
          label="Foto do grupo"
        />

        <TextField label="Nome do grupo" value={name} onChangeText={setName} placeholder="Ex.: Turma 3ESPW" maxLength={60} />
        <TextField
          label={`Limite de integrantes (2 a ${MAX_MEMBER_LIMIT})`}
          value={limitText}
          onChangeText={setLimitText}
          keyboardType="number-pad"
          error={limit === null ? 'Informe um número inteiro.' : validateMemberLimit(limit, totalMembers)}
        />

        <Text style={styles.counter}>
          Integrantes: {totalMembers}/{limit ?? '?'} · Vagas disponíveis: {slots}
        </Text>

        <Text style={styles.section}>Política de notificações</Text>
        {NOTIFICATION_POLICIES.map((option) => (
          <Pressable key={option} onPress={() => setPolicy(option)} style={styles.radioRow}>
            <View style={[styles.radio, policy === option && styles.radioOn]} />
            <Text style={styles.radioLabel}>{NOTIFICATION_POLICY_LABELS[option]}</Text>
          </Pressable>
        ))}

        <Text style={styles.section}>Integrantes</Text>
        <View style={styles.membersBox}>
          {memberProfiles.length === 0 ? (
            <Text style={styles.muted}>Nenhum integrante selecionado.</Text>
          ) : (
            memberProfiles.map((profile) => (
              <GroupMemberItem
                key={profile.uid}
                profile={profile}
                isOwner={false}
                onPress={() => navigation.navigate('Profile', { uid: profile.uid })}
                onRemove={removeLocal}
              />
            ))
          )}
        </View>

        <PrimaryButton title="Selecionar integrantes" variant="outline" onPress={openPicker} disabled={saving} />
        <PrimaryButton
          title={isEditing ? 'Salvar alterações' : 'Criar grupo'}
          onPress={() => void handleSave()}
          loading={saving}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: 16, gap: 10 },
  counter: { color: colors.textMuted, marginBottom: 4 },
  section: { fontWeight: '700', color: colors.text, marginTop: 6 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.primary },
  radioOn: { backgroundColor: colors.primary },
  radioLabel: { color: colors.text, flex: 1 },
  membersBox: { borderRadius: 10, overflow: 'hidden', backgroundColor: colors.surface },
  muted: { padding: 12, color: colors.textMuted },
});
