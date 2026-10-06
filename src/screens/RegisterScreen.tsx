import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { ErrorMessage } from '../components/ErrorMessage';
import { ImagePickerButton } from '../components/ImagePickerButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import type { AuthStackParamList } from '../types/navigation';
import { getErrorMessage } from '../utils/errors';
import { colors } from '../utils/theme';
import { isValidBirthDate, isValidEmail, isValidPhone } from '../utils/validation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

type FieldErrors = Partial<
  Record<'name' | 'email' | 'password' | 'confirm' | 'phone' | 'birth', string>
>;

export function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [birth, setBirth] = useState<string>('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleRegister = useCallback(async () => {
    const errors: FieldErrors = {};
    if (name.trim().length < 2) errors.name = 'Informe seu nome completo.';
    if (!isValidEmail(email)) errors.email = 'E-mail inválido.';
    if (password.length < 6) errors.password = 'A senha precisa ter pelo menos 6 caracteres.';
    if (confirm !== password) errors.confirm = 'As senhas não coincidem.';
    if (!isValidPhone(phone)) errors.phone = 'Informe um celular válido com DDD.';
    if (!isValidBirthDate(birth)) errors.birth = 'Use o formato DD/MM/AAAA com uma data válida.';
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const result = await signUp({
        name,
        email,
        password,
        phoneNumber: phone,
        birthDate: birth,
        photoUri,
      });
      if (result.photoFailed) {
        Alert.alert(
          'Conta criada',
          'Não foi possível enviar sua foto agora. Você está usando a imagem padrão.',
        );
      }
      // A navegação para a área logada acontece automaticamente pelo AuthContext.
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  }, [name, email, password, confirm, phone, birth, photoUri, signUp]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {error ? <ErrorMessage message={error} /> : null}

        <ImagePickerButton uri={photoUri} name={name} onPick={setPhotoUri} label="Escolher foto de perfil" />

        <TextField label="Nome" value={name} onChangeText={setName} error={fieldErrors.name} placeholder="Seu nome" />
        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          error={fieldErrors.email}
          placeholder="voce@email.com"
        />
        <TextField
          label="Celular"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          error={fieldErrors.phone}
          placeholder="(11) 91234-5678"
        />
        <TextField
          label="Data de nascimento"
          value={birth}
          onChangeText={setBirth}
          keyboardType="numbers-and-punctuation"
          error={fieldErrors.birth}
          placeholder="DD/MM/AAAA"
          maxLength={10}
        />
        <TextField
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          error={fieldErrors.password}
          placeholder="Mínimo 6 caracteres"
        />
        <TextField
          label="Confirmar senha"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
          error={fieldErrors.confirm}
          placeholder="Repita a senha"
        />

        <PrimaryButton title="Criar conta" onPress={() => void handleRegister()} loading={loading} />
        <PrimaryButton
          title="Já tenho conta"
          variant="outline"
          onPress={() => navigation.goBack()}
          disabled={loading}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, gap: 10 },
});
