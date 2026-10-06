import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { PHOTOS_ENABLED } from '../utils/config';
import { colors } from '../utils/theme';
import { Avatar } from './Avatar';

type Props = {
  uri: string | null;
  currentUrl?: string;
  name: string;
  onPick: (uri: string) => void;
  label?: string;
};

export function ImagePickerButton({ uri, currentUrl = '', name, onPick, label = 'Escolher foto' }: Props) {
  const [busy, setBusy] = useState<boolean>(false);

  const pick = useCallback(async () => {
    setBusy(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Autorize o acesso às fotos para escolher uma imagem.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });
      if (!result.canceled && result.assets.length > 0) {
        onPick(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir a galeria.');
    } finally {
      setBusy(false);
    }
  }, [onPick]);

  if (!PHOTOS_ENABLED) {
    // Storage desativado: mostra só a imagem padrão, sem botão de upload.
    return (
      <View style={styles.container}>
        <Avatar uri={currentUrl} name={name} size={88} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Avatar uri={uri ?? currentUrl} name={name} size={88} />
      <Pressable onPress={() => void pick()} disabled={busy} style={styles.button}>
        <Text style={styles.text}>{busy ? 'Abrindo...' : label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: 16 },
  button: { marginTop: 8, padding: 6 },
  text: { color: colors.primary, fontWeight: '700' },
});
