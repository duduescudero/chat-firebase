import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { fetchUserProfile } from '../services/apiService';
import type { AppStackParamList } from '../types/navigation';
import type { UserProfileResponse } from '../types/user';
import { getErrorMessage } from '../utils/errors';
import { colors } from '../utils/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Profile'>;

const UNAVAILABLE = 'Indisponível';

export function ProfileScreen({ route }: Props) {
  const { uid } = route.params;
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // A API só devolve os dados cadastrais se houver conversa ou grupo em comum.
      setProfile(await fetchUserProfile(uid));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loading message="Carregando perfil..." />;
  if (error || !profile) return <ErrorMessage message={error ?? 'Perfil indisponível.'} onRetry={() => void load()} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Avatar uri={profile.photoUrl} name={profile.name} size={110} />
      <Text style={styles.name}>{profile.name}</Text>

      <View style={styles.card}>
        <Field label="E-mail" value={profile.email} />
        <Field label="Celular" value={profile.phoneNumber} />
        <Field label="Data de nascimento" value={profile.birthDate} />
      </View>
    </ScrollView>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, !value && styles.muted]}>{value && value.length > 0 ? value : UNAVAILABLE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 24, gap: 12, backgroundColor: colors.background, flexGrow: 1 },
  name: { fontSize: 22, fontWeight: '800', color: colors.text },
  card: { alignSelf: 'stretch', backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 },
  field: { gap: 2 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  value: { color: colors.text, fontSize: 16 },
  muted: { color: colors.textMuted, fontStyle: 'italic' },
});
