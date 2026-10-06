import { useCallback, useEffect, useMemo, useState } from 'react';

import { listPublicProfiles } from '../services/userService';
import type { PublicProfile } from '../types/user';
import { getErrorMessage } from '../utils/errors';

export function useUsers(myUid: string) {
  const [users, setUsers] = useState<PublicProfile[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await listPublicProfiles());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // O próprio usuário nunca aparece na lista (não pode conversar consigo mesmo).
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter(
      (user) => user.uid !== myUid && (term.length === 0 || user.nameLower.includes(term)),
    );
  }, [users, search, myUid]);

  return { users: filtered, totalUsers: users.length, search, setSearch, loading, error, reload: load };
}
