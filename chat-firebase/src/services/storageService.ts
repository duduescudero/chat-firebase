import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from './firebase';

/**
 * Envia uma imagem local (uri do image-picker) para o Firebase Storage
 * e devolve apenas a URL final, que é o que vai para o Firestore.
 */
export async function uploadImage(path: string, uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, blob, { contentType: blob.type || 'image/jpeg' });
  return getDownloadURL(fileRef);
}
