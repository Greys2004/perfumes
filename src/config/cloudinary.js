import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};

function readConfigValue(extraKey, fallback) {
  const value = extra[extraKey];

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return fallback;
}

export const CLOUDINARY_CLOUD_NAME = readConfigValue('cloudinaryCloudName', 'TU_CLOUD_NAME');
export const CLOUDINARY_UPLOAD_PRESET = readConfigValue(
  'cloudinaryUploadPreset',
  'TU_UPLOAD_PRESET'
);

export function hasCloudinaryConfig() {
  return (
    CLOUDINARY_CLOUD_NAME !== 'TU_CLOUD_NAME' &&
    CLOUDINARY_UPLOAD_PRESET !== 'TU_UPLOAD_PRESET'
  );
}
