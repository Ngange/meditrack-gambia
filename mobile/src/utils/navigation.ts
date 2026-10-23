import { router, type Href } from 'expo-router';

/** Opens a record form. The record travels as one JSON param; the form reads it with useRouteItem. */
export function openRecordForm(pathname: string, item?: unknown) {
  router.push({ pathname, params: item ? { item: JSON.stringify(item) } : {} } as Href);
}
