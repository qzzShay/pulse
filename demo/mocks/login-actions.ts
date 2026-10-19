import { nav } from '../router';

export type AuthState = { error?: string } | undefined;

export async function logout() {
  nav('/');
}

export async function login(): Promise<AuthState> {
  nav('/dashboard');
  return undefined;
}

export const register = login;
