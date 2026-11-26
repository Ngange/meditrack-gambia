import { router, type Href } from 'expo-router';

// The typed-route list is regenerated each time Metro starts, so the new doctor screens are not in it yet
// on a fresh checkout. These helpers keep the casts in one place.
const href = (pathname: string, params?: Record<string, string>) => ({ pathname, params: params ?? {} }) as unknown as Href;

export const goDoctor = (pathname: string, params?: Record<string, string>) => router.push(href(pathname, params));
export const replaceDoctor = (pathname: string, params?: Record<string, string>) => router.replace(href(pathname, params));
