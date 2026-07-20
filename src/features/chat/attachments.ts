import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

/** A file the user attached to a chat message (sent inline as a data URL). */
export interface ChatAttachment {
  id: string;
  name: string;
  /** MIME type, e.g. image/jpeg or application/pdf. */
  mediaType: string;
  /** `data:<mediaType>;base64,…` — sent to the copilot as a `file` part. */
  url: string;
  /** Local uri for an inline thumbnail (images only). */
  previewUri?: string;
}

/** Copilot accepts images + PDFs inline; keep them small so the request stays snappy. */
const MAX_BYTES = 8 * 1024 * 1024;

export class AttachmentTooLargeError extends Error {
  constructor() {
    super('Attachments must be under 8 MB.');
    this.name = 'AttachmentTooLargeError';
  }
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `att-${Date.now()}-${counter}`;
}

async function toDataUrl(uri: string, mediaType: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  // base64 is ~4/3 the raw byte size.
  if ((base64.length * 3) / 4 > MAX_BYTES) throw new AttachmentTooLargeError();
  return `data:${mediaType};base64,${base64}`;
}

/** Pick a photo from the library. Returns null if the user cancels. */
export async function pickImageAttachment(): Promise<ChatAttachment | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  if (res.canceled || res.assets.length === 0) return null;

  const asset = res.assets[0];
  const mediaType = asset.mimeType ?? 'image/jpeg';
  return {
    id: nextId(),
    name: asset.fileName ?? 'photo.jpg',
    mediaType,
    url: await toDataUrl(asset.uri, mediaType),
    previewUri: asset.uri,
  };
}

/** Capture a photo with the camera. Returns null if the user cancels/denies. */
export async function pickCameraAttachment(): Promise<ChatAttachment | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;

  const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
  if (res.canceled || res.assets.length === 0) return null;

  const asset = res.assets[0];
  const mediaType = asset.mimeType ?? 'image/jpeg';
  return {
    id: nextId(),
    name: asset.fileName ?? 'photo.jpg',
    mediaType,
    url: await toDataUrl(asset.uri, mediaType),
    previewUri: asset.uri,
  };
}

/** Pick a PDF or image document. Returns null if the user cancels. */
export async function pickDocumentAttachment(): Promise<ChatAttachment | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || res.assets.length === 0) return null;

  const asset = res.assets[0];
  const mediaType = asset.mimeType ?? 'application/pdf';
  return {
    id: nextId(),
    name: asset.name,
    mediaType,
    url: await toDataUrl(asset.uri, mediaType),
    previewUri: mediaType.startsWith('image/') ? asset.uri : undefined,
  };
}
