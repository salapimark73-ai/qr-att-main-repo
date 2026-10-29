import { useEffect, useState } from 'react';
import { useAuth } from './auth';
import { getProfile, type Role } from './profiles';

// Loads the signed-in user's role from the profiles table.
export function useRole(): { role: Role | null; loading: boolean } {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getProfile(user.id).then((p) => {
      if (!active) return;
      setRole(p?.role ?? 'student');
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user?.id]);

  return { role, loading };
}
