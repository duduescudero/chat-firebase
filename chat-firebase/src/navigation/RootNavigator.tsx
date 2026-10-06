import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Loading } from '../components/Loading';
import { useAuth } from '../hooks/useAuth';
import { ChatScreen } from '../screens/ChatScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { GroupFormScreen } from '../screens/GroupFormScreen';
import { GroupMembersScreen } from '../screens/GroupMembersScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { UsersScreen } from '../screens/UsersScreen';
import type { AppStackParamList, AuthStackParamList } from '../types/navigation';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

export function RootNavigator() {
  const { user, initializing } = useAuth();

  // Recuperando a sessão persistida.
  if (initializing) return <Loading message="Carregando..." />;

  return (
    <NavigationContainer>
      {user ? (
        // Telas protegidas: só existem enquanto há usuário autenticado.
        // No logout elas desmontam e todos os listeners são removidos.
        <AppStack.Navigator initialRouteName="Conversations">
          <AppStack.Screen name="Conversations" component={ConversationsScreen} options={{ title: 'Conversas' }} />
          <AppStack.Screen name="Users" component={UsersScreen} options={{ title: 'Usuários' }} />
          <AppStack.Screen name="GroupForm" component={GroupFormScreen} options={{ title: 'Grupo' }} />
          <AppStack.Screen name="Chat" component={ChatScreen} options={{ title: 'Conversa' }} />
          <AppStack.Screen name="GroupMembers" component={GroupMembersScreen} options={{ title: 'Integrantes' }} />
          <AppStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
        </AppStack.Navigator>
      ) : (
        <AuthStack.Navigator>
          <AuthStack.Screen name="Login" component={LoginScreen} options={{ title: 'Entrar', headerShown: false }} />
          <AuthStack.Screen name="Register" component={RegisterScreen} options={{ title: 'Criar conta' }} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
