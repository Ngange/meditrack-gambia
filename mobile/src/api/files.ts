import { File, Paths } from 'expo-file-system';

import { API_URL } from '@/config/env';
import { getToken } from '@/utils/token-storage';

import { ApiError, notifyUnauthorized } from './client';

const safeName = (name: string) => name.replace(/[^\w.\- ]+/g, '_');

/** Downloads an authenticated file from the API into the phone's cache and returns its local uri. */
export async function downloadFile(path: string, fileName: string) {
  const token = await getToken();
  if (!token) {
    notifyUnauthorized();
    throw new ApiError('Please log in again.', 401);
  }

  const destination = new File(Paths.cache, `${Date.now()}-${safeName(fileName)}`);
  try {
    const file = await File.downloadFileAsync(`${API_URL}${path}`, destination, {
      headers: { Authorization: `Bearer ${token}` },
      idempotent: true,
    });
    return file.uri;
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (/\b(401|403)\b/.test(message)) {
      notifyUnauthorized();
      throw new ApiError('Please log in again.', 401);
    }
    if (/\b404\b/.test(message)) throw new ApiError('That document could not be found.', 404);
    throw new ApiError('Could not download the document. Check your connection and try again.', 0, true);
  }
}
