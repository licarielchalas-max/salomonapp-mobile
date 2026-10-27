import { supabase } from './supabase';

export type AttachmentKind = 'receipt' | 'voice';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
};

// Sube un archivo local (file://, blob: o data:) al bucket privado "attachments".
// La ruta empieza por el id del hogar: así la política de Storage solo deja
// leer y escribir a los miembros de ese hogar.
export async function uploadAttachment(
  householdId: string,
  uri: string,
  kind: AttachmentKind,
): Promise<{ path: string | null; error: string | null }> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const contentType = blob.type || (kind === 'receipt' ? 'image/jpeg' : 'audio/mp4');
    const ext = EXT_BY_MIME[contentType] ?? (kind === 'receipt' ? 'jpg' : 'm4a');
    const path = `${householdId}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const body = await new Response(blob).arrayBuffer();
    const { error } = await supabase.storage.from('attachments').upload(path, body, { contentType, upsert: false });
    if (error) return { path: null, error: error.message };
    return { path, error: null };
  } catch (e) {
    return { path: null, error: e instanceof Error ? e.message : 'No se pudo leer el archivo.' };
  }
}

export async function getAttachmentUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('attachments').createSignedUrl(path, 3600);
  return error ? null : data.signedUrl;
}
