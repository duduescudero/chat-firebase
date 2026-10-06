export type ChatUser = {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  photoUrl: string;
  createdAt: number;
};

/** Dados listáveis por qualquer usuário autenticado (coleção publicProfiles). */
export type PublicProfile = {
  uid: string;
  name: string;
  nameLower: string;
  photoUrl: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  birthDate: string;
  photoUri: string | null;
};

/** Resposta da API: campos cadastrais só vêm preenchidos quando permitido. */
export type UserProfileResponse = {
  uid: string;
  name: string;
  photoUrl: string;
  email: string | null;
  phoneNumber: string | null;
  birthDate: string | null;
};
