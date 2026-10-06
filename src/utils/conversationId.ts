/**
 * O id da conversa individual é derivado dos dois uid ordenados.
 * Isso garante uma única conversa por par de usuários (A→B e B→A geram o mesmo id).
 */
export function buildDirectConversationId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

export function sortedPair(uidA: string, uidB: string): [string, string] {
  const [first, second] = [uidA, uidB].sort();
  return [first, second];
}

export function getOtherParticipantId(conversationId: string, myUid: string): string | null {
  const parts = conversationId.split('_');
  if (parts.length !== 2) return null;
  if (parts[0] === myUid) return parts[1];
  if (parts[1] === myUid) return parts[0];
  return null;
}
