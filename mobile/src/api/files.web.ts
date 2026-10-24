import { API_URL } from '@/config/env';
import { getToken } from '@/utils/token-storage';

import { ApiError, notifyUnauthorized } from './client';

/** Web build: fetches the file with the token and returns a temporary object URL for it. */
export async function downloadFile(path: string, _fileName: string) {
  const token = await getToken();
  if (!token) {
    notifyUnauthorized();
    throw new ApiError('Please log in again.', 401);
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new ApiError('Could not download the document. Check your connection and try again.', 0, true);
  }
  if (res.status === 401 || res.status === 403) {
    notifyUnauthorized();
    throw new ApiError('Please log in again.', 401);
  }
  if (!res.ok) throw new ApiError('Could not download the document.', res.status);
  return URL.createObjectURL(await res.blob());
}
