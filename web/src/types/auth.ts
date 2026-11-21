export type Role = 'patient' | 'admin' | 'provider';

export type AuthUser = {
  userId: string;
  email: string;
  role: Role;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};
