import type { ConversationType } from './chat';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type UsersScreenParams =
  | { mode: 'direct' }
  | { mode: 'select'; selectedIds: string[]; memberLimit: number };

export type AppStackParamList = {
  Conversations: undefined;
  Users: UsersScreenParams;
  GroupForm: { groupId?: string; pickedIds?: string[] } | undefined;
  Chat: { conversationId: string; conversationType: ConversationType };
  GroupMembers: { groupId: string };
  Profile: { uid: string };
};
