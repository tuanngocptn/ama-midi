import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '@/lib/api';

const mockedApi = vi.mocked(api);

const initialState = () => ({
  user: null,
  token: null,
  isLoading: false,
  isHydrated: true,
});

let useAuthStore: typeof import('@/stores/auth-store').useAuthStore;

describe('useAuthStore', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
    mockedApi.post.mockRejectedValue(new Error('no token'));
    const mod = await import('@/stores/auth-store');
    useAuthStore = mod.useAuthStore;
    await vi.waitFor(() => {
      expect(useAuthStore.getState().isHydrated).toBe(true);
    });
    useAuthStore.setState(initialState());
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('sets user and token on success', async () => {
      const response = {
        token: 'jwt-token',
        user: { id: '1', email: 'a@b.com', name: 'Alice' },
      };
      mockedApi.post.mockResolvedValueOnce(response);

      await useAuthStore.getState().register('a@b.com', 'Alice', 'pw123');

      expect(mockedApi.post).toHaveBeenCalledWith('/auth/register', {
        email: 'a@b.com',
        name: 'Alice',
        password: 'pw123',
      });
      expect(mockedApi.setToken).toHaveBeenCalledWith('jwt-token');
      expect(localStorage.getItem('ama_midi_token')).toBe('jwt-token');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(response.user);
      expect(state.token).toBe('jwt-token');
      expect(state.isLoading).toBe(false);
    });

    it('throws and resets isLoading on failure', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('conflict'));

      await expect(
        useAuthStore.getState().register('a@b.com', 'Alice', 'pw123'),
      ).rejects.toThrow('conflict');

      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('login', () => {
    it('sets user and token on success', async () => {
      const response = {
        token: 'jwt-login',
        user: { id: '2', email: 'b@c.com', name: 'Bob' },
      };
      mockedApi.post.mockResolvedValueOnce(response);

      await useAuthStore.getState().login('b@c.com', 'pw');

      expect(mockedApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'b@c.com',
        password: 'pw',
      });
      expect(useAuthStore.getState().token).toBe('jwt-login');
      expect(useAuthStore.getState().user).toEqual(response.user);
    });

    it('throws on failure and clears loading', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('invalid'));

      await expect(
        useAuthStore.getState().login('bad', 'pw'),
      ).rejects.toThrow('invalid');

      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears user, token, and localStorage', () => {
      useAuthStore.setState({
        user: { id: '1', email: 'a@b.com', name: 'Alice' },
        token: 'tok',
      });
      localStorage.setItem('ama_midi_token', 'tok');

      useAuthStore.getState().logout();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().token).toBeNull();
      expect(localStorage.getItem('ama_midi_token')).toBeNull();
      expect(mockedApi.setToken).toHaveBeenCalledWith(null);
    });
  });

  describe('hydrate', () => {
    it('sets isHydrated when no stored token', async () => {
      useAuthStore.setState({ isHydrated: false });
      localStorage.clear();

      await useAuthStore.getState().hydrate();

      expect(mockedApi.post).not.toHaveBeenCalled();
      expect(useAuthStore.getState().isHydrated).toBe(true);
    });

    it('refreshes token on success', async () => {
      useAuthStore.setState({ isHydrated: false });
      localStorage.setItem('ama_midi_token', 'old-tok');
      const refreshResponse = {
        token: 'new-tok',
        user: { id: '1', email: 'a@b.com', name: 'Alice' },
      };
      mockedApi.post.mockResolvedValueOnce(refreshResponse);

      await useAuthStore.getState().hydrate();

      expect(mockedApi.setToken).toHaveBeenCalledWith('old-tok');
      expect(mockedApi.setToken).toHaveBeenCalledWith('new-tok');
      expect(localStorage.getItem('ama_midi_token')).toBe('new-tok');
      expect(useAuthStore.getState().user).toEqual(refreshResponse.user);
      expect(useAuthStore.getState().isHydrated).toBe(true);
    });

    it('clears state on refresh failure', async () => {
      useAuthStore.setState({ isHydrated: false });
      localStorage.setItem('ama_midi_token', 'bad-tok');
      mockedApi.post.mockRejectedValueOnce(new Error('expired'));

      await useAuthStore.getState().hydrate();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().token).toBeNull();
      expect(localStorage.getItem('ama_midi_token')).toBeNull();
      expect(useAuthStore.getState().isHydrated).toBe(true);
    });
  });
});
