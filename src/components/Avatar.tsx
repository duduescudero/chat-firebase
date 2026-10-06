import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '../utils/theme';

type Props = { uri: string; name: string; size?: number };

/** Mostra a foto; se não existir ou falhar ao carregar, usa a imagem padrão (iniciais). */
export function Avatar({ uri, name, size = 44 }: Props) {
  const [failed, setFailed] = useState<boolean>(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (uri.length > 0 && !failed) {
    return <Image source={{ uri }} style={[styles.image, dimension]} onError={() => setFailed(true)} />;
  }

  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={[styles.fallback, dimension]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.border },
  fallback: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#fff', fontWeight: '700' },
});
