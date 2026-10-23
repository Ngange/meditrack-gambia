export type Role = 'patient' | 'admin';

export type AuthUser = {
  userId: string;
  email: string;
  role: Role;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};
