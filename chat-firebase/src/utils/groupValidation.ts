export const MIN_MEMBER_LIMIT = 2;
export const MAX_MEMBER_LIMIT = 50;

export function parseMemberLimit(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}

export function validateMemberLimit(limit: number | null, currentMembers: number): string | null {
  if (limit === null || !Number.isInteger(limit)) {
    return 'Informe um limite de integrantes válido (número inteiro).';
  }
  if (limit < MIN_MEMBER_LIMIT || limit > MAX_MEMBER_LIMIT) {
    return `O limite deve estar entre ${MIN_MEMBER_LIMIT} e ${MAX_MEMBER_LIMIT}.`;
  }
  if (limit < currentMembers) {
    return `O limite não pode ser menor que a quantidade atual de integrantes (${currentMembers}).`;
  }
  return null;
}

export function availableSlots(limit: number, currentMembers: number): number {
  return Math.max(0, limit - currentMembers);
}

export function validateGroupName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 1) return 'Informe o nome do grupo.';
  if (trimmed.length > 60) return 'O nome do grupo deve ter no máximo 60 caracteres.';
  return null;
}
