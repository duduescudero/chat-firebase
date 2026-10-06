import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { ChatInput } from '../components/ChatInput';
import { ChatMessageItem } from '../components/ChatMessage';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { MentionSelector } from '../components/MentionSelector';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useGroup } from '../hooks/useGroups';
import { useProfiles } from '../hooks/useProfiles';
import type { ChatMessage, MessageTarget } from '../types/chat';
import type { AppStackParamList } from '../types/navigation';
import { getOtherParticipantId } from '../utils/conversationId';
import { colors } from '../utils/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Chat'>;

export function ChatScreen({ navigation, route }: Props) {
  const { conversationId, conversationType } = route.params;
  const { user } = useAuth();
  const myUid = user?.uid ?? '';
  const isGroup = conversationType === 'group';

  const { messages, loading, error, sending, sendError, pushWarning, send } = useChat(
    conversationId,
    conversationType,
    myUid,
  );
  const { group, loading: loadingGroup, error: groupError } = useGroup(isGroup ? conversationId : undefined);

  const otherId = !isGroup ? getOtherParticipantId(conversationId, myUid) : null;
  const profileIds = useMemo<string[]>(
    () => (isGroup ? (group?.memberIds ?? []) : otherId ? [otherId] : []),
    [isGroup, group, otherId],
  );
  const profiles = useProfiles(profileIds);

  const [targetId, setTargetId] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const otherProfile = otherId ? profiles[otherId] : undefined;
  const title = isGroup ? (group?.name ?? 'Grupo') : (otherProfile?.name ?? 'Conversa');
  const photoUrl = isGroup ? (group?.photoUrl ?? '') : (otherProfile?.photoUrl ?? '');

  // Tocar na foto: perfil do participante (individual) ou lista de integrantes (grupo).
  const openHeaderPhoto = useCallback(() => {
    if (isGroup) navigation.navigate('GroupMembers', { groupId: conversationId });
    else if (otherId) navigation.navigate('Profile', { uid: otherId });
  }, [isGroup, navigation, conversationId, otherId]);

  useEffect(() => {
    navigation.setOptions({
      title,
      headerRight: () => (
        <Pressable onPress={openHeaderPhoto} hitSlop={8} accessibilityLabel="Abrir detalhes">
          <Avatar uri={photoUrl} name={title} size={36} />
        </Pressable>
      ),
    });
  }, [navigation, title, photoUrl, openHeaderPhoto]);

  const mentionableMembers = useMemo(
    () =>
      (group?.memberIds ?? [])
        .filter((id) => id !== myUid)
        .map((id) => profiles[id])
        .filter((profile): profile is NonNullable<typeof profile> => Boolean(profile)),
    [group, profiles, myUid],
  );

  const handleSend = useCallback(
    async (text: string): Promise<boolean> => {
      const target: MessageTarget =
        isGroup && targetId ? { type: 'member', memberId: targetId } : { type: 'conversation' };
      const mentioned = isGroup && targetId ? [targetId] : [];
      const ok = await send(text, target, mentioned);
      if (ok) setTargetId(null);
      return ok;
    },
    [isGroup, targetId, send],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const targetName =
        item.target.type === 'member' ? (profiles[item.target.memberId]?.name ?? 'integrante') : null;
      return (
        <ChatMessageItem
          message={item}
          isMine={item.senderId === myUid}
          authorName={profiles[item.senderId]?.name ?? 'Integrante'}
          showAuthor={isGroup}
          targetName={targetName}
        />
      );
    },
    [isGroup, myUid, profiles],
  );

  // Grupo inexistente ou usuário removido: sem acesso às mensagens.
  if (isGroup && !loadingGroup && !group) {
    return (
      <EmptyState
        title="Grupo indisponível"
        description={groupError ?? 'Você não faz mais parte deste grupo.'}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {error ? <ErrorMessage message={error} /> : null}

      {loading ? (
        <Loading message="Carregando mensagens..." />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={messages.length === 0 ? styles.emptyContainer : styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <EmptyState title="Nenhuma mensagem ainda" description="Envie a primeira mensagem desta conversa." />
          }
        />
      )}

      {sendError ? <ErrorMessage message={`Falha no envio: ${sendError}`} /> : null}
      {pushWarning ? <Text style={styles.warning}>{pushWarning}</Text> : null}

      {isGroup ? (
        <MentionSelector members={mentionableMembers} selectedId={targetId} onSelect={setTargetId} />
      ) : null}
      <ChatInput onSend={handleSend} sending={sending} disabled={Boolean(error)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingVertical: 8 },
  emptyContainer: { flexGrow: 1 },
  warning: { paddingHorizontal: 12, paddingVertical: 4, color: '#92400e', backgroundColor: '#fef3c7' },
});
