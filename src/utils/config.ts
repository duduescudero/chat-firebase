/**
 * Fotos de perfil e de grupo usam o Firebase Storage, que exige o plano Blaze.
 * Enquanto o Storage não estiver ativado, deixe false: o app esconde o seletor de foto
 * e usa a inicial do nome como imagem padrão. Para ativar, mude para true.
 */
export const PHOTOS_ENABLED = false;
