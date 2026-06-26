import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
  hasCloudinaryConfig,
} from '../config/cloudinary';
import * as ImageManipulator from 'expo-image-manipulator';

function getImageType(uri) {
  const extension = uri.split('.').pop()?.toLowerCase();

  if (extension === 'png') {
    return 'image/png';
  }

  if (extension === 'webp') {
    return 'image/webp';
  }

  return 'image/jpeg';
}

export async function subirImagenACloudinary(uri) {
  if (!uri) {
    return '';
  }

  if (!hasCloudinaryConfig()) {
    throw new Error('Configura CLOUDINARY_CLOUD_NAME y CLOUDINARY_UPLOAD_PRESET.');
  }

  const compressedImage = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],
    {
      compress: 0.65,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );
  const data = new FormData();

  data.append('file', {
    uri: compressedImage.uri,
    type: getImageType(compressedImage.uri),
    name: `perfume-${Date.now()}.jpg`,
  });
  data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  data.append('folder', 'perfumes');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: data,
    }
  );
  const result = await response.json();

  if (!response.ok || !result.secure_url) {
    throw new Error(result.error?.message || 'No se pudo subir la imagen. Intenta de nuevo.');
  }

  return result.secure_url;
}
