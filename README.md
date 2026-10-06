# 📱 Chat Firebase — React Native

Aplicativo de chat **individual e em grupo** com React Native (Expo) + TypeScript, Firebase e **push notifications** enviadas por uma **API própria** publicada na internet.

CheckPoint 2 — Mobile Development & IoT.

## Integrantes

- RM556527 — Eduardo Pires Escudero
- RMXXXXXX — NOME COMPLETO DO INTEGRANTE 2
- RMXXXXXX — NOME COMPLETO DO INTEGRANTE 3

> ⚠️ Substitua as linhas acima pelos nomes e RMs reais de **todos** os integrantes (máx. 5). Sem isso o trabalho recebe nota zero.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| App | React Native 0.83 · **Expo SDK 55** · TypeScript (strict, sem `any`) |
| Navegação | React Navigation (native-stack) com parâmetros tipados |
| Backend (BaaS) | Firebase Authentication · Realtime Database · Cloud Firestore · Storage · Cloud Messaging |
| Push | `expo-notifications` (token → Expo Push Service/FCM) |
| API de notificações | Node.js 22 + Express + TypeScript + Firebase Admin SDK (pasta `server/`) |
| Hospedagem da API | Render (ou qualquer serviço com HTTPS) |

## Responsabilidade de cada serviço Firebase

| Serviço | Uso neste projeto |
|---|---|
| **Authentication** | Cadastro/login **somente e-mail e senha**, recuperação de sessão (AsyncStorage), `uid`, logout |
| **Realtime Database** | **Mensagens** individuais e de grupo + listeners em tempo real; espelho `groupMembers/` usado nas regras |
| **Cloud Firestore** | Perfis (`users`, `publicProfiles`), grupos (`groups`: membros, `memberLimit`, `notificationPolicy`), conversas individuais, **tokens de dispositivo** (`users/{uid}/devices`) |
| **Cloud Messaging (FCM)** | Entrega dos pushes (Android via FCM; iOS via APNs). O envio é feito pela API |
| **Storage** (fotos, opcional) | Fotos de perfil e de grupo; só a **URL** vai para o Firestore. Controlado por `PHOTOS_ENABLED` em `src/utils/config.ts` |

## Estrutura

```
App.tsx
firebaseConfig.json        # config do SDK cliente (sem segredos)
firestore.rules            # regras do Firestore
database.rules.json        # regras do Realtime Database
storage.rules              # regras do Storage
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
  utils/       conversationId, groupValidation, validation, errors, theme, date
server/
  src/ app.ts · server.ts · middleware/authenticate.ts
       routes/ notifications.ts · groups.ts · users.ts
       services/ firebaseAdmin.ts · notificationSender.ts · recipientResolver.ts (+ testes)
```

## Como executar

### 1. Firebase (console)

1. Crie um projeto e adicione um app **Android** (pacote `br.com.fiap.chatfirebase`) e um app **iOS** (bundle `br.com.fiap.chatfirebase`).
2. **Authentication** → ative **E-mail/senha** (e somente ele).
3. **Firestore Database** → crie o banco.
4. **Realtime Database** → crie o banco e copie a `databaseURL`.
5. **Storage** → ative (⚠️ projetos novos exigem plano **Blaze** para o Storage; há cota gratuita).
6. Copie os valores do SDK Web para o arquivo **`firebaseConfig.json`** da raiz.
7. Baixe `google-services.json` (Android) e `GoogleService-Info.plist` (iOS) para a raiz do projeto.
8. Publique as regras (Firebase CLI):

```bash
npm i -g firebase-tools
firebase login
firebase use --add            # escolha o projeto
firebase deploy --only firestore:rules,database,storage
```

### 2. App (Expo)

```bash
npm install
npx expo install --fix        # alinha as versões exatas do SDK 55
cp .env.example .env          # defina EXPO_PUBLIC_API_URL com a URL pública da API
npm run typecheck
```

Push **não funciona no Expo Go**. Use um *development build*:

```bash
npm i -g eas-cli
eas login
eas init                       # gera o projectId — cole em app.json → expo.extra.eas.projectId
eas build --profile development --platform android   # instale o APK no aparelho
npm start                      # expo start --dev-client
```

### 3. Notificações — Android e iOS

- **Android:** faça upload da credencial **FCM V1** (conta de serviço do Firebase) no EAS: `eas credentials` → Android → Google Service Account Key for FCM V1. O canal `default` é criado pelo app.
- **iOS:** requer conta Apple Developer. Gere uma chave APNs (.p8) e envie ao EAS (`eas credentials`). Rode `eas build --profile development --platform ios`.
- Teste sempre em **dispositivo físico**.

### 4. API de notificações (`server/`)

```bash
cd server
npm install
cp .env.example .env     # SOMENTE para testes locais; nunca versione o .env
npm run dev              # http://localhost:3000/health
npm test                 # testes das políticas de destinatários
```

**Publicação (Render):**

1. Crie um *Web Service* apontando para este repositório (há `render.yaml`; Root Directory = `server`, build `npm install && npm run build`, start `npm start`).
2. Em **Environment**, configure os segredos (apenas os **nomes** estão no repositório):
   `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_DATABASE_URL` (e opcional `EXPO_ACCESS_TOKEN`).
   Os três primeiros vêm da conta de serviço (Firebase → Configurações → Contas de serviço → Gerar nova chave). **Não commite o JSON.**
3. Health check: `GET /health`.
4. Plano gratuito do Render "dorme" após inatividade: abra `/health` antes da correção, ou use um plano sem sleep.

**URL pública da API:** `https://COLOQUE-AQUI-A-URL-DA-API.onrender.com`

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
- **Validação entre os dois bancos:** as regras do RTDB não leem o Firestore, então a **API** espelha os integrantes (`/groups/:id/sync-members`) após cada alteração de grupo. Removido do grupo → deixa de ler/escrever novas mensagens assim que a sincronização termina (logo após a alteração).
- **Dados cadastrais:** `users/{uid}` (e-mail, celular, nascimento) legível só pelo dono; nome e foto ficam em `publicProfiles` para a listagem. O perfil completo de outra pessoa passa pela API, que exige conversa ou grupo em comum.
- **Tokens de dispositivo:** `users/{uid}/devices` legível/gravável só pelo dono; a API (Admin SDK) lê para enviar.
- **Segredos:** credenciais administrativas existem **apenas** nas variáveis secretas da hospedagem. `firebaseConfig.json` contém só a configuração do SDK cliente.
- Cloud Functions **não** são usadas.

## Mapa do enunciado → implementação

- Autenticação e-mail/senha, sessão, logout: `authService.ts`, `AuthContext.tsx`
- Conversa individual (id por `uid` ordenados, 1 por par, sem conversa consigo): `chatService.ts`, `conversationId.ts`, regras
- Grupos (criar, editar, remover, sair, foto, política, limite): `groupService.ts`, `GroupFormScreen`, `GroupMembersScreen`
- Mensagens em tempo real com remoção de listeners: `chatService.listenToMessages`, `useChat`
- Push + tap abre a conversa: `notificationService.ts`, `useNotifications.ts`, `server/`
- Hooks `useState/useEffect/useMemo/useCallback`, services, componentes, sem `any`: `npm run check-any`

## Prints das telas

> Adicione aqui as imagens (pasta `docs/`): login, cadastro, conversas, usuários, criação/edição de grupo, chat individual, chat em grupo, integrantes, perfil.

## Evidência de notificação recebida

> Adicione aqui prints/vídeo do push recebido (app em segundo plano e fechado), e do `GET /health` da API.

## Checklist rápido de teste

1. Crie 3 contas em 3 aparelhos/emuladores (o push exige aparelho físico).
2. Crie um grupo com limite 3 e política `all_group_messages`; envie mensagem geral → os outros 2 recebem push.
3. Mude para `mentioned_members`; mensagem geral não notifica; selecione `@fulano` e envie → só ele recebe.
4. Teste `direct_messages_only` e `disabled`.
5. Tente reduzir o limite abaixo do número de integrantes → erro. Tente adicionar além do limite → erro.
6. Remova um integrante → ele perde acesso ao chat.
7. Faça logout → o aparelho para de receber push do usuário anterior.
