// Expo only inlines EXPO_PUBLIC_* variables when they are written exactly like this.
export const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('EXPO_PUBLIC_API_URL is not set. Check mobile/.env');
}

// If the server hasn't answered by then, treat it as unreachable.
// On weak connections requests often hang instead of failing fast.
export const REQUEST_TIMEOUT_MS = 8000;
