import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from '../config/firebase';

export async function uploadPerfumeImageAsync(uri, perfumeName) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const cleanName = perfumeName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const imageRef = ref(storage, `perfumes/${cleanName || 'perfume'}-${Date.now()}.jpg`);

  await uploadBytes(imageRef, blob);

  return getDownloadURL(imageRef);
}
