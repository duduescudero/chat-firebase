import { useEffect, useState } from 'react';

import { listenToGroup } from '../services/groupService';
import type { ChatGroup } from '../types/group';
import { getErrorMessage } from '../utils/errors';

/** Observa um grupo em tempo real. 'group' fica null se não existir ou se você foi removido. */
export function useGroup(groupId: string | undefined) {
  const [group, setGroup] = useState<ChatGroup | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(groupId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) {
      setGroup(null);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setError(null);
    return listenToGroup(
      groupId,
      (data) => {
        setGroup(data);
        setLoading(false);
      },
      (err) => {
        setGroup(null);
        setError(getErrorMessage(err));
        setLoading(false);
      },
    );
  }, [groupId]);

  return { group, loading, error };
}
