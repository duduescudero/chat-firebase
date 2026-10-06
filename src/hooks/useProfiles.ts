import { useEffect, useMemo, useRef, useState } from 'react';

import { getPublicProfiles } from '../services/userService';
import type { PublicProfile } from '../types/user';

/** Carrega (com cache em memória) os perfis públicos dos uid informados. */
export function useProfiles(uids: readonly string[]): Record<string, PublicProfile> {
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({});
  const requested = useRef<Set<string>>(new Set());

  const key = useMemo(() => Array.from(new Set(uids)).sort().join(','), [uids]);

  useEffect(() => {
    const wanted = key.length > 0 ? key.split(',') : [];
    const missing = wanted.filter((id) => !requested.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => requested.current.add(id));

    getPublicProfiles(missing)
      .then((loaded) => {
        setProfiles((previous) => {
          const next = { ...previous };
          loaded.forEach((profile) => {
            next[profile.uid] = profile;
          });
          return next;
        });
      })
      .catch(() => {
        // permite nova tentativa na próxima renderização
        missing.forEach((id) => requested.current.delete(id));
      });
  }, [key]);

  return profiles;
}
