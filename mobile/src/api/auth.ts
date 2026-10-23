import { request } from './client';

export type AuthUser = { userId: string; email: string; role: 'patient' | 'admin' };
export type AuthResponse = { token: string; user: AuthUser };

export const login = (email: string, password: string) =>
  request<AuthResponse>('/auth/login', { method: 'POST', body: { email, password }, auth: false });

export const register = (email: string, password: string, firstName: string, lastName: string) =>
  request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: { email, password, firstName, lastName },
    auth: false,
  });
