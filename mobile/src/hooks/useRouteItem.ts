import { useLocalSearchParams } from 'expo-router';

/** The record a list screen passed to a form screen (see openRecordForm). Undefined when adding. */
export function useRouteItem<T>(): T | undefined {
  const { item } = useLocalSearchParams<{ item?: string }>();
  if (!item) return undefined;
  try {
    return JSON.parse(item) as T;
  } catch {
    return undefined;
  }
}
