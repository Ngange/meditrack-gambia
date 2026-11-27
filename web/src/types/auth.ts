export type Role = 'patient' | 'admin' | 'provider';

export type AuthUser = {
  userId: string;
  email: string;
  role: Role;
  /** True while the account still has a temporary password. */
  mustChangePassword?: boolean;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};
