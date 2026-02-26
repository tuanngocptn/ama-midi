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
  register: (email: string, name: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
}

const TOKEN_KEY = 'ama_midi_token';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isHydrated: false,
  isLoading: false,

  async register(email, name, password) {
    set({ isLoading: true });
    try {
      const res = await api.post<{ token: string; user: AuthUser }>(
        '/auth/register',
        { email, name, password },
      );
      api.setToken(res.token);
      localStorage.setItem(TOKEN_KEY, res.token);
      set({ token: res.token, user: res.user });
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
      const res = await api.post<{ token: string; user: AuthUser }>(
        '/auth/login',
        { email, password },
      );
      api.setToken(res.token);
      localStorage.setItem(TOKEN_KEY, res.token);
      set({ token: res.token, user: res.user });
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
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
