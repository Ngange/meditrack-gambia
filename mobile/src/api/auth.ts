import { request } from './client';

export type AuthUser = { userId: string; email: string; role: 'patient' | 'admin' | 'provider' };
export type DeviceInfo = { name: string; platform: 'android'; deviceKey?: string };
export type AuthResponse = { token: string; user: AuthUser; device?: { device_id: string; device_key: string } };

export const login = (email: string, password: string, device?: DeviceInfo) =>
  request<AuthResponse>('/auth/login', { method: 'POST', body: { email, password, device }, auth: false });

export const register = (email: string, password: string, firstName: string, lastName: string, device?: DeviceInfo) =>
  request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: { email, password, firstName, lastName, device },
    auth: false,
  });

/** Trades the phone's device key for a fresh login token (and a replacement key) without the password. */
export const deviceRefresh = (deviceKey: string) =>
  request<AuthResponse>('/auth/device-refresh', { method: 'POST', body: { deviceKey }, auth: false });
