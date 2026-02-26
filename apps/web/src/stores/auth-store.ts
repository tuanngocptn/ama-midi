import { create } from 'zustand';
import { api } from '@/lib/api';

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isHydrated: boolean;
  isLoading: boolean;
  requires2fa: boolean;
  pendingEmail: string | null;
  pendingPassword: string | null;
  register: (email: string, name: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWith2fa: (code: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
  clearPending2fa: () => void;
}

const TOKEN_KEY = 'ama_midi_token';

type LoginResponse = { token: string; user: AuthUser; requires2fa?: never } | { requires2fa: true; token?: never; user?: never };

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isHydrated: false,
  isLoading: false,
  requires2fa: false,
  pendingEmail: null,
  pendingPassword: null,

  async register(email, name, password) {
    set({ isLoading: true });
    try {
      const res = await api.post<{ token: string; user: AuthUser }>(
        '/auth/register',
        { email, name, password },
      );
      api.setToken(res.token);
      localStorage.setItem(TOKEN_KEY, res.token);
      set({ token: res.token, user: res.user, requires2fa: false });
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  async login(email, password) {
    set({ isLoading: true });
    try {
      const res = await api.post<LoginResponse>('/auth/login', { email, password });
      if (res.requires2fa) {
        set({ requires2fa: true, pendingEmail: email, pendingPassword: password });
        return;
      }
      api.setToken(res.token);
      localStorage.setItem(TOKEN_KEY, res.token);
      set({ token: res.token, user: res.user, requires2fa: false });
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  async loginWith2fa(code) {
    const { pendingEmail, pendingPassword } = get();
    if (!pendingEmail || !pendingPassword) return;
    set({ isLoading: true });
    try {
      const res = await api.post<{ token: string; user: AuthUser }>(
        '/auth/login/2fa',
        { email: pendingEmail, password: pendingPassword, code },
      );
      api.setToken(res.token);
      localStorage.setItem(TOKEN_KEY, res.token);
      set({
        token: res.token,
        user: res.user,
        requires2fa: false,
        pendingEmail: null,
        pendingPassword: null,
      });
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  clearPending2fa() {
    set({ requires2fa: false, pendingEmail: null, pendingPassword: null });
  },

  logout() {
    api.setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, token: null });
  },

  async hydrate() {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      set({ isHydrated: true });
      return;
    }
    api.setToken(stored);
    try {
      const res = await api.post<{ token: string; user: AuthUser }>(
        '/auth/refresh',
      );
      api.setToken(res.token);
      localStorage.setItem(TOKEN_KEY, res.token);
      set({ token: res.token, user: res.user });
    } catch (err) {
      console.error(err);
      api.setToken(null);
      localStorage.removeItem(TOKEN_KEY);
      set({ user: null, token: null });
    } finally {
      set({ isHydrated: true });
    }
  },
}));

useAuthStore.getState().hydrate();
