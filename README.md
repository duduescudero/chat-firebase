# 📱 Chat Firebase — React Native
 
Aplicativo de chat **individual e em grupo** com React Native (Expo) + TypeScript, Firebase e **push notifications** enviadas por uma **API própria** publicada na internet.
 
CheckPoint 2 — Mobile Development & IoT.
 
## Integrantes
 
- RM553320 — Arthur Silva
- RM556527 — Eduardo Escudero
- RM556824 — Leonardo Prado
- RM556798 — Davi Vieira
- RM556906 — Luca Monteiro
## Links da entrega
 
| Item | Link |
|---|---|
| Repositório | https://github.com/duduescudero/chat-firebase |
| API de notificações (HTTPS) | https://chat-firebase-9hhp.onrender.com |
| Health check da API | https://chat-firebase-9hhp.onrender.com/health |
| Build Android (APK `preview`) | [https://expo.dev/accounts/duduescudero9/projects/chat-firebase/builds/9ed07529-5fc3-449c-b142-2d319c51f4c3](https://expo.dev/accounts/duduescudero9/projects/chat-firebase/builds/11562c02-47ab-4494-8d86-65dff51a14a3) |
 
> ⏳ A API usa o plano gratuito do Render, que "dorme" após alguns minutos sem uso. Se a primeira chamada demorar (~50 s), acesse `/health` e aguarde o servidor acordar.
 
## Tecnologias
 
| Camada | Tecnologia |
|---|---|
| App | React Native 0.83 · **Expo SDK 55** · TypeScript (strict, sem `any`) |
| Navegação | React Navigation (native-stack) com parâmetros tipados |
| Backend (BaaS) | Firebase Authentication · Realtime Database · Cloud Firestore · Cloud Messaging |
| Push | `expo-notifications` (token → Expo Push Service / FCM) |
| API de notificações | Node.js 22 + Express + TypeScript + Firebase Admin SDK (pasta `server/`) |
| Hospedagem da API | Render (HTTPS) |
| Build do app | EAS Build (Android, perfis `development` e `preview`) |
 
## Responsabilidade de cada serviço Firebase
 
| Serviço | Uso neste projeto |
|---|---|
| **Authentication** | Cadastro/login **somente e-mail e senha**, recuperação de sessão (AsyncStorage), `uid`, logout |
| **Realtime Database** | **Mensagens** individuais e de grupo + listeners em tempo real; espelho `groupMembers/` usado nas regras |
| **Cloud Firestore** | Perfis (`users`, `publicProfiles`), grupos (`groups`: membros, `memberLimit`, `notificationPolicy`), conversas individuais, **tokens de dispositivo** (`users/{uid}/devices`) |
| **Cloud Messaging (FCM)** | Entrega dos pushes no Android. O envio é feito pela API (nunca pelo app) |
| **Storage** (opcional) | Fotos de perfil e de grupo; só a **URL** iria para o Firestore. Exige plano Blaze e está **desativado** (veja "Limitações") |
 
## Estrutura
 
```
App.tsx
firebaseConfig.json        # config do SDK cliente (sem segredos)
firestore.rules            # regras do Firestore
database.rules.json        # regras do Realtime Database
storage.rules              # regras do Storage
eas.json                   # perfis de build (development / preview)
src/
  components/  Avatar, ChatMessage, ChatInput, ConversationItem, GroupMemberItem,
               MentionSelector, ImagePickerButton, Loading, ErrorMessage, EmptyState, ...
  screens/     Login, Register, Conversations, Users, GroupForm, Chat, GroupMembers, Profile
  services/    firebase, authService, userService, groupService, chatService,
               notificationService, apiService, storageService
  hooks/       useAuth, useChat, useGroups, useConversations, useNotifications, useUsers, useProfiles
  contexts/    AuthContext
  navigation/  RootNavigator
  types/       user, chat, group, notification, navigation
  utils/       conversationId, groupValidation, validation, errors, theme, date, config
server/
  src/ app.ts · server.ts · middleware/authenticate.ts
       routes/ notifications.ts · groups.ts · users.ts
       services/ firebaseAdmin.ts · notificationSender.ts · recipientResolver.ts (+ testes)
```
 
## Como executar
 
### 1. Firebase (console)
 
1. Crie um projeto e registre os apps **Android** e **iOS** (`br.com.fiap.chatfirebase`) e **Web**.
2. **Authentication** → ative **E-mail/senha**.
3. **Firestore Database** → crie em modo produção e publique `firestore.rules`.
4. **Realtime Database** → crie em modo bloqueado e publique `database.rules.json`.
5. Copie a configuração do app Web para `firebaseConfig.json` e coloque `google-services.json` / `GoogleService-Info.plist` na raiz.
### 2. App (Expo)
 
```bash
npm install
npx expo install --fix        # alinha as versões exatas do SDK 55
# crie o arquivo .env com:  EXPO_PUBLIC_API_URL=https://chat-firebase-9hhp.onrender.com
npm run typecheck
```
 
Push **não funciona no Expo Go**. Use um build próprio:
 
```bash
npm i -g eas-cli
eas login
eas init
eas credentials                                         # Android > development > FCM V1: envie a chave da conta de serviço
eas build --profile development --platform android      # APK com dev client (usa `npm start`)
eas build --profile preview --platform android          # APK standalone (abre sozinho, já aponta para a API)
```
 
### 3. API de notificações (`server/`)
 
```bash
cd server
npm install
npm run dev              # http://localhost:3000/health  (precisa das variáveis abaixo)
npm test                 # testes das políticas de destinatários
```
 
**Publicação (Render):** Web Service com Root Directory `server`, Build `npm install && npm run build`, Start `npm start`, Health Check `/health`.
 
Variáveis de ambiente (configuradas **apenas** no painel da hospedagem; nenhum valor secreto está no repositório):
`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_DATABASE_URL` (e opcional `EXPO_ACCESS_TOKEN`).
 
#### Endpoints
 
| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Verifica se a API está no ar |
| POST | `/notifications/messages` | `Authorization: Bearer <ID Token>` · body `{conversationId, messageId}` · valida token, mensagem e autor; calcula destinatários; envia push; idempotente |
| POST | `/groups/:groupId/sync-members` | Espelha os integrantes do grupo (Firestore) em `groupMembers/` no Realtime Database |
| GET | `/users/:uid/profile` | Perfil completo, **somente** para o próprio usuário ou quem compartilha conversa/grupo |
 
## Política de notificações
 
Configurada pelo proprietário no grupo (`notificationPolicy`). A API lê a política e os integrantes no Firestore — **nunca** confia em lista enviada pelo app.
 
| Política | Quem recebe |
|---|---|
| `all_group_messages` | Mensagem **geral**: todos os integrantes, exceto o remetente. Mensagem direcionada a alguém: apenas os citados |
| `mentioned_members` | Somente integrantes mencionados/selecionados como destinatário |
| `direct_messages_only` | Nenhum push de grupo (só conversas individuais notificam) |
| `disabled` | Nenhum push |
 
Regras gerais: remetente nunca recebe; só participantes recebem; tokens inválidos (`DeviceNotRegistered`/FCM) são desativados; o texto do push **não** inclui o conteúdo da mensagem; payload com `conversationId`, `conversationType` e `messageId`; tocar na notificação abre a conversa. Chamadas repetidas para a mesma mensagem não duplicam push (documento `notificationLog/{conversationId}_{messageId}` criado com `create()`, que falha se já existir).
 
## Limite de integrantes e concorrência
 
1. **Interface:** mostra `integrantes/limite` e vagas disponíveis; bloqueia seleção acima do limite.
2. **App (transação):** `updateGroup` roda em `runTransaction` — lê o grupo, valida (proprietário, limite ≥ nº de integrantes, ≥ 2 integrantes) e grava. Se outra escrita alterar o documento no meio, o Firestore repete a transação com o estado novo.
3. **Regras do Firestore (barreira final):** avaliadas pelo servidor sobre o documento **resultante** de cada escrita: `memberIds.size() <= memberLimit`, `memberLimit` inteiro entre 2 e 50, sem duplicados, proprietário sempre membro. Duas tentativas simultâneas não conseguem, juntas, ultrapassar o limite: a segunda é rejeitada. O limite também não pode ser reduzido abaixo da quantidade atual.
## Segurança — decisões
 
- **Regras versionadas** em `firestore.rules`, `database.rules.json` e `storage.rules` (nada de regras abertas).
- **Realtime Database:** só participantes leem/escrevem em `messages/{conversationId}`; `senderId == auth.uid`; `createdAt == now` (hora do servidor); mensagens imutáveis; campos extras rejeitados. Conversa individual: o id contém os dois `uid`. Grupo: usa `groupMembers/{groupId}/{uid}`.
- **Validação entre os dois bancos:** as regras do RTDB não leem o Firestore, então a **API** espelha os integrantes (`/groups/:id/sync-members`) após cada alteração de grupo. Removido do grupo → deixa de ler/escrever novas mensagens assim que a sincronização termina.
- **Dados cadastrais:** `users/{uid}` (e-mail, celular, nascimento) legível só pelo dono; nome e foto ficam em `publicProfiles` para a listagem. O perfil completo de outra pessoa passa pela API, que exige conversa ou grupo em comum.
- **Tokens de dispositivo:** `users/{uid}/devices` legível/gravável só pelo dono; a API (Admin SDK) lê para enviar.
- **Segredos:** credenciais administrativas existem **apenas** nas variáveis secretas da hospedagem e no EAS. `firebaseConfig.json`, `google-services.json` e `GoogleService-Info.plist` contêm só a configuração pública do SDK cliente; a proteção dos dados vem das regras.
- Cloud Functions **não** são usadas.
## Limitações conhecidas
 
- **Fotos de perfil/grupo desativadas:** o Firebase Storage exige o plano Blaze (cartão de crédito). A flag `PHOTOS_ENABLED` em `src/utils/config.ts` está `false`: o app esconde o seletor de foto e usa a inicial do nome como imagem padrão. As regras (`storage.rules`) e o código de upload já estão prontos; basta ativar o Storage e mudar a flag para `true`.
- **iOS:** push no iPhone exige conta Apple Developer paga; os testes e builds foram feitos para **Android**.
- **API no plano gratuito:** a primeira requisição após inatividade pode levar cerca de 50 segundos.
## Mapa do enunciado → implementação
 
- Autenticação e-mail/senha, sessão, logout: `authService.ts`, `AuthContext.tsx`
- Conversa individual (id por `uid` ordenados, 1 por par, sem conversa consigo): `chatService.ts`, `conversationId.ts`, regras
- Grupos (criar, editar, remover, sair, política, limite): `groupService.ts`, `GroupFormScreen`, `GroupMembersScreen`
- Mensagens em tempo real com remoção de listeners: `chatService.listenToMessages`, `useChat`
- Push + toque abre a conversa: `notificationService.ts`, `useNotifications.ts`, `server/`
- Hooks `useState/useEffect/useMemo/useCallback`, services, componentes, sem `any`: `npm run check-any`
## Prints das telas
 
> Adicionar as imagens na pasta `docs/`: login, cadastro, conversas, usuários, criação/edição de grupo, chat individual, chat em grupo, integrantes, perfil.
 
## Evidência de notificação recebida
 
> Adicionar prints/vídeo do push recebido (app em segundo plano e fechado) e do `GET /health` da API em `docs/`.
 
## Checklist de teste
 
1. Crie 3 contas em 3 aparelhos (push exige aparelho físico).
2. Grupo com limite 3 e política `all_group_messages`; mensagem geral → os outros 2 recebem push.
3. Mude para `mentioned_members`; mensagem geral não notifica; selecione `@fulano` e envie → só ele recebe.
4. Teste `direct_messages_only` e `disabled`.
5. Reduza o limite abaixo do número de integrantes → erro. Tente adicionar além do limite → erro.
6. Remova um integrante → ele perde acesso ao chat.
7. Faça logout → o aparelho para de receber push do usuário anterior.
