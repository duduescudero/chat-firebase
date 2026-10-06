import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { ConversationItem } from '../components/ConversationItem';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../hooks/useAuth';
import { useConversations } from '../hooks/useConversations';
import { useNotifications } from '../hooks/useNotifications';
import type { ConversationSummary } from '../types/chat';
import type { AppStackParamList } from '../types/navigation';
import type { NotificationPayload } from '../types/notification';
import { getErrorMessage } from '../utils/errors';
import { colors } from '../utils/theme';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Conversations'>;

const PUSH_WARNINGS: Record<string, string> = {
  denied: 'Notificações negadas. Ative nas configurações do aparelho para receber mensagens em segundo plano.',
  unavailable: 'Push real só funciona em dispositivo físico (não em emulador).',
  'no-token': 'Não foi possível obter o token de notificação deste aparelho.',
  error: 'Falha ao registrar o aparelho para notificações.',
};

export function ConversationsScreen() {
  const navigation = useNavigation<Navigation>();
  const { user, profile, signOut } = useAuth();
  const uid = user?.uid ?? '';
  const { conversations, loading, error } = useConversations(uid);

  const openFromNotification = useCallback(
    (payload: NotificationPayload) => {
      navigation.navigate('Chat', {
        conversationId: payload.conversationId,
        conversationType: payload.conversationType,
      });
    },
    [navigation],
  );
  const { status } = useNotifications(uid, openFromNotification);

  const openConversation = useCallback(
    (item: ConversationSummary) => {
      navigation.navigate('Chat', { conversationId: item.id, conversationType: item.type });
    },
    [navigation],
  );

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch (err) {
      Alert.alert('Erro', getErrorMessage(err));
    }
  }, [signOut]);

  const renderItem = useCallback(
    ({ item }: { item: ConversationSummary }) => <ConversationItem item={item} onPress={openConversation} />,
    [openConversation],
  );

  const pushWarning = PUSH_WARNINGS[status];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Avatar uri={profile?.photoUrl ?? ''} name={profile?.name ?? user?.email ?? ''} size={40} />
        <Text style={styles.me} numberOfLines={1}>
          {profile?.name ?? user?.email ?? ''}
        </Text>
        <View style={styles.logout}>
          <PrimaryButton title="Sair" variant="outline" onPress={() => void handleLogout()} />
        </View>
      </View>

      <View style={styles.actions}>
        <View style={styles.flex}>
          <PrimaryButton title="Nova conversa" onPress={() => navigation.navigate('Users', { mode: 'direct' })} />
        </View>
        <View style={styles.flex}>
          <PrimaryButton title="Novo grupo" variant="outline" onPress={() => navigation.navigate('GroupForm')} />
        </View>
      </View>

      {pushWarning ? <Text style={styles.warning}>{pushWarning}</Text> : null}
      {error ? <ErrorMessage message={error} /> : null}

      {loading ? (
        <Loading message="Carregando conversas..." />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={
            <EmptyState
              title="Nenhuma conversa ainda"
              description="Toque em “Nova conversa” ou crie um grupo para começar."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: colors.surface,
  },
  me: { flex: 1, fontWeight: '700', fontSize: 16, color: colors.text },
  logout: { width: 90 },
  actions: { flexDirection: 'row', gap: 10, padding: 12 },
  warning: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  emptyContainer: { flexGrow: 1 },
});
