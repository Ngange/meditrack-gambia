import { Platform, Share } from 'react-native';

/**
 * Hands the link to the phone's share sheet (WhatsApp, SMS, email...). The browser build has no
 * share sheet, so there the link is copied instead. Returns true if the link was copied.
 */
export async function sendLink(url: string): Promise<'copied' | 'shared'> {
  if (Platform.OS === 'web') {
    await navigator.clipboard.writeText(url);
    return 'copied';
  }
  await Share.share({ message: `My medical records, shared with you for a limited time (read only): ${url}` });
  return 'shared';
}
