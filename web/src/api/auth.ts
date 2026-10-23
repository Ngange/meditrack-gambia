import type { LoginResponse } from '../types/auth';
import { request } from './client';

export function login(email: string, password: string) {
  return request<LoginResponse>('/auth/login', { method: 'POST', body: { email, password }, auth: false });
}

export function register(email: string, password: string, firstName: string, lastName: string) {
  return request<LoginResponse>('/auth/register', {
    method: 'POST',
    body: { email, password, firstName, lastName },
    auth: false,
  });
}
