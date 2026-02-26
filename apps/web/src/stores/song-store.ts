import { create } from 'zustand';
import type { Song } from '@ama-midi/shared';
import { api } from '@/lib/api';

type SongFilter = 'all' | 'owned' | 'shared';

interface SongDetail extends Song {
  noteCount: number;
  collaboratorCount: number;
}

interface SongState {
  songs: Song[];
  currentSong: SongDetail | null;
  isLoading: boolean;
  filter: SongFilter;
  fetchSongs: (filter?: SongFilter) => Promise<void>;
  fetchSong: (id: string) => Promise<void>;
  createSong: (title: string, description?: string) => Promise<Song>;
  updateSong: (id: string, data: Partial<Pick<Song, 'title' | 'description'>>) => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
  setFilter: (filter: SongFilter) => void;
}

export const useSongStore = create<SongState>((set, get) => ({
  songs: [],
  currentSong: null,
  isLoading: false,
  filter: 'all',

  async fetchSongs(filter) {
    const active = filter ?? get().filter;
    set({ isLoading: true });
    try {
      const songs = await api.get<Song[]>(`/songs?filter=${active}`);
      set({ songs });
    } catch (err) {
      console.error(err);
    } finally {
      set({ isLoading: false });
    }
  },

  async fetchSong(id) {
    set({ isLoading: true });
    try {
      const song = await api.get<SongDetail>(`/songs/${id}`);
      set({ currentSong: song });
    } catch (err) {
      console.error(err);
    } finally {
      set({ isLoading: false });
    }
  },

  async createSong(title, description) {
    set({ isLoading: true });
    try {
      const song = await api.post<Song>('/songs', { title, description });
      set((s) => ({ songs: [song, ...s.songs] }));
      return song;
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  async updateSong(id, data) {
    set({ isLoading: true });
    try {
      const updated = await api.put<Song>(`/songs/${id}`, data);
      set((s) => ({
        songs: s.songs.map((song) => (song.id === id ? updated : song)),
        currentSong:
          s.currentSong?.id === id
            ? { ...s.currentSong, ...updated }
            : s.currentSong,
      }));
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  async deleteSong(id) {
    set({ isLoading: true });
    try {
      await api.del(`/songs/${id}`);
      set((s) => ({
        songs: s.songs.filter((song) => song.id !== id),
        currentSong: s.currentSong?.id === id ? null : s.currentSong,
      }));
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  setFilter(filter) {
    set({ filter });
    get().fetchSongs(filter);
  },
}));
