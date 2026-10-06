import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import { useUsers } from '../hooks/useUsers';
import { ensureDirectConversation } from '../services/chatService';
import type { AppStackParamList } from '../types/navigation';
import type { PublicProfile } from '../types/user';
import { getErrorMessage } from '../utils/errors';
import { availableSlots } from '../utils/groupValidation';
import { colors } from '../utils/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Users'>;

export function UsersScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const myUid = user?.uid ?? '';
  const params = route.params;
  const isSelect = params.mode === 'select';

  const { users, search, setSearch, loading, error, reload } = useUsers(myUid);
  const [selected, setSelected] = useState<string[]>(isSelect ? params.selectedIds : []);
  const [opening, setOpening] = useState<boolean>(false);

  // O proprietário ocupa 1 vaga: só (limite - 1) integrantes podem ser selecionados.
  const maxSelectable = isSelect ? Math.max(0, params.memberLimit - 1) : 0;
  const slotsLeft = availableSlots(maxSelectable, selected.length);

  const startDirect = useCallback(
    async (profile: PublicProfile) => {
      if (opening) return;
      setOpening(true);
      try {
        const conversationId = await ensureDirectConversation(myUid, profile.uid);
        navigation.replace('Chat', { conversationId, conversationType: 'direct' });
      } catch (err) {
        Alert.alert('Não foi possível abrir a conversa', getErrorMessage(err));
        setOpening(false);
      }
    },
    [myUid, navigation, opening],
  );

  const toggle = useCallback(
    (profile: PublicProfile) => {
      setSelected((previous) => {
        if (previous.includes(profile.uid)) return previous.filter((id) => id !== profile.uid);
        if (previous.length >= maxSelectable) {
          Alert.alert('Grupo sem vagas', 'O limite de integrantes do grupo foi atingido.');
          return previous;
        }
        return [...previous, profile.uid];
      });
    },
    [maxSelectable],
  );

  const confirm = useCallback(() => {
    navigation.navigate({ name: 'GroupForm', params: { pickedIds: selected }, merge: true });
  }, [navigation, selected]);

  const renderItem = useCallback(
    ({ item }: { item: PublicProfile }) => {
      const checked = selected.includes(item.uid);
      return (
        <Pressable
          onPress={() => (isSelect ? toggle(item) : void startDirect(item))}
          style={styles.row}
          disabled={opening}
        >
          <Avatar uri={item.photoUrl} name={item.name} size={40} />
          <Text style={styles.name}>{item.name}</Text>
          {isSelect ? (
            <View style={[styles.checkbox, checked && styles.checkboxOn]}>
              {checked ? <Text style={styles.check}>✓</Text> : null}
            </View>
          ) : null}
        </Pressable>
      );
    },
    [isSelect, opening, selected, startDirect, toggle],
  );

  return (
    <View style={styles.container}>
      <View style={styles.search}>
        <TextField label="Buscar usuário" value={search} onChangeText={setSearch} placeholder="Digite um nome" />
        {isSelect ? (
          <Text style={styles.slots}>
            Selecionados: {selected.length} · Vagas disponíveis: {slotsLeft}
          </Text>
        ) : null}
      </View>

      {error ? <ErrorMessage message={error} onRetry={() => void reload()} /> : null}

      {loading ? (
        <Loading message="Carregando usuários..." />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.uid}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={users.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={
            <EmptyState
              title="Nenhum usuário disponível"
              description="Peça para outras pessoas criarem uma conta no app."
            />
          }
        />
      )}

      {isSelect ? (
        <View style={styles.footer}>
          <PrimaryButton title={`Confirmar (${selected.length})`} onPress={confirm} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  search: { padding: 12, paddingBottom: 0, backgroundColor: colors.surface },
  slots: { color: colors.textMuted, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  name: { flex: 1, fontSize: 16, color: colors.text },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  check: { color: '#fff', fontWeight: '800' },
  footer: { padding: 12, backgroundColor: colors.surface },
  emptyContainer: { flexGrow: 1 },
});
