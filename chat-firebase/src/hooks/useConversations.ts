import { useEffect, useMemo, useState } from 'react';

import { listenToDirectConversations } from '../services/chatService';
import { listenToGroups } from '../services/groupService';
import type { ConversationSummary, DirectConversation } from '../types/chat';
import type { ChatGroup } from '../types/group';
import { getOtherParticipantId } from '../utils/conversationId';
import { getErrorMessage } from '../utils/errors';
import { useProfiles } from './useProfiles';

export function useConversations(myUid: string) {
  const [direct, setDirect] = useState<DirectConversation[]>([]);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [directLoading, setDirectLoading] = useState<boolean>(true);
  const [groupsLoading, setGroupsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stopDirect = listenToDirectConversations(
      myUid,
      (data) => {
        setDirect(data);
        setDirectLoading(false);
      },
      (err) => {
        setError(getErrorMessage(err));
        setDirectLoading(false);
      },
    );
    const stopGroups = listenToGroups(
      myUid,
      (data) => {
        setGroups(data);
        setGroupsLoading(false);
      },
      (err) => {
        setError(getErrorMessage(err));
        setGroupsLoading(false);
      },
    );
    // Cleanup: remove os dois listeners ao desmontar (inclui logout).
    return () => {
      stopDirect();
      stopGroups();
    };
  }, [myUid]);

  const otherIds = useMemo(
    () =>
      direct
        .map((conversation) => getOtherParticipantId(conversation.id, myUid))
        .filter((id): id is string => id !== null),
    [direct, myUid],
  );
  const profiles = useProfiles(otherIds);

  const conversations = useMemo<ConversationSummary[]>(() => {
    const directItems = direct.map<ConversationSummary>((conversation) => {
      const otherId = getOtherParticipantId(conversation.id, myUid);
      const profile = otherId ? profiles[otherId] : undefined;
      return {
        id: conversation.id,
        type: 'direct',
        title: profile?.name ?? 'Carregando...',
        photoUrl: profile?.photoUrl ?? '',
        subtitle: 'Conversa individual',
        sortKey: conversation.createdAt,
      };
    });
    const groupItems = groups.map<ConversationSummary>((group) => ({
      id: group.id,
      type: 'group',
      title: group.name,
      photoUrl: group.photoUrl,
      subtitle: `Grupo · ${group.memberIds.length}/${group.memberLimit} integrantes`,
      sortKey: group.updatedAt,
    }));
    return [...groupItems, ...directItems].sort((a, b) => b.sortKey - a.sortKey);
  }, [direct, groups, profiles, myUid]);

  return { conversations, loading: directLoading || groupsLoading, error };
}
