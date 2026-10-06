import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { NotificationPolicy } from '../types';
import { resolveRecipients, type RecipientInput } from './recipientResolver';

const members = ['ana', 'bia', 'caio', 'duda'];

function groupInput(policy: NotificationPolicy, overrides: Partial<RecipientInput> = {}): RecipientInput {
  return {
    conversationType: 'group',
    senderId: 'ana',
    group: { memberIds: members, notificationPolicy: policy },
    target: { type: 'conversation' },
    mentionedUserIds: [],
    ...overrides,
  };
}

test('individual: notifica só o outro participante', () => {
  const result = resolveRecipients({
    conversationType: 'direct',
    senderId: 'ana',
    directParticipants: ['ana', 'bia'],
    target: { type: 'conversation' },
    mentionedUserIds: [],
  });
  assert.deepEqual(result.recipients, ['bia']);
});

test('all_group_messages: mensagem geral notifica todos menos o remetente', () => {
  assert.deepEqual(resolveRecipients(groupInput('all_group_messages')).recipients, ['bia', 'caio', 'duda']);
});

test('all_group_messages: mensagem direcionada notifica só o citado', () => {
  const result = resolveRecipients(
    groupInput('all_group_messages', { target: { type: 'member', memberId: 'caio' }, mentionedUserIds: ['caio'] }),
  );
  assert.deepEqual(result.recipients, ['caio']);
});

test('mentioned_members: só citados; geral não notifica', () => {
  assert.deepEqual(resolveRecipients(groupInput('mentioned_members')).recipients, []);
  const result = resolveRecipients(groupInput('mentioned_members', { mentionedUserIds: ['bia', 'ana', 'intruso'] }));
  assert.deepEqual(result.recipients, ['bia']);
});

test('direct_messages_only e disabled não notificam em grupo', () => {
  assert.deepEqual(resolveRecipients(groupInput('direct_messages_only')).recipients, []);
  assert.deepEqual(resolveRecipients(groupInput('disabled')).recipients, []);
});
