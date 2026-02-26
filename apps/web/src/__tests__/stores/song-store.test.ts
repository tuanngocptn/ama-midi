import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSongStore } from '@/stores/song-store';
import { api } from '@/lib/api';
import type { Song } from '@ama-midi/shared';

const mockedApi = vi.mocked(api);

const makeSong = (overrides: Partial<Song> = {}): Song => ({
  id: 'song-1',
  title: 'Test Song',
  description: null,
  ownerId: 'user-1',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('useSongStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSongStore.setState({
      songs: [],
      currentSong: null,
      isLoading: false,
      filter: 'all',
    });
  });

  describe('fetchSongs', () => {
    it('fetches songs and stores them', async () => {
      const songs = [makeSong(), makeSong({ id: 'song-2', title: 'Song 2' })];
      mockedApi.get.mockResolvedValueOnce(songs);

      await useSongStore.getState().fetchSongs();

      expect(mockedApi.get).toHaveBeenCalledWith('/songs?filter=all');
      expect(useSongStore.getState().songs).toEqual(songs);
      expect(useSongStore.getState().isLoading).toBe(false);
    });

    it('uses provided filter instead of stored', async () => {
      mockedApi.get.mockResolvedValueOnce([]);

      await useSongStore.getState().fetchSongs('owned');

      expect(mockedApi.get).toHaveBeenCalledWith('/songs?filter=owned');
    });

    it('handles fetch error gracefully', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('network'));

      await useSongStore.getState().fetchSongs();

      expect(useSongStore.getState().songs).toEqual([]);
      expect(useSongStore.getState().isLoading).toBe(false);
    });
  });

  describe('fetchSong', () => {
    it('fetches a single song detail', async () => {
      const detail = { ...makeSong(), noteCount: 5, collaboratorCount: 2 };
      mockedApi.get.mockResolvedValueOnce(detail);

      await useSongStore.getState().fetchSong('song-1');

      expect(mockedApi.get).toHaveBeenCalledWith('/songs/song-1');
      expect(useSongStore.getState().currentSong).toEqual(detail);
    });
  });

  describe('createSong', () => {
    it('creates a song and prepends to list', async () => {
      const existing = makeSong({ id: 'old' });
      useSongStore.setState({ songs: [existing] });

      const created = makeSong({ id: 'new', title: 'New Song' });
      mockedApi.post.mockResolvedValueOnce(created);

      const result = await useSongStore.getState().createSong('New Song', 'desc');

      expect(mockedApi.post).toHaveBeenCalledWith('/songs', {
        title: 'New Song',
        description: 'desc',
      });
      expect(result).toEqual(created);
      expect(useSongStore.getState().songs[0]).toEqual(created);
      expect(useSongStore.getState().songs).toHaveLength(2);
    });

    it('throws on failure', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('fail'));

      await expect(
        useSongStore.getState().createSong('X'),
      ).rejects.toThrow('fail');
    });
  });

  describe('updateSong', () => {
    it('updates song in list and currentSong', async () => {
      const song = makeSong();
      const detail = { ...song, noteCount: 0, collaboratorCount: 0 };
      useSongStore.setState({ songs: [song], currentSong: detail });

      const updated = makeSong({ title: 'Updated' });
      mockedApi.put.mockResolvedValueOnce(updated);

      await useSongStore.getState().updateSong('song-1', { title: 'Updated' });

      expect(mockedApi.put).toHaveBeenCalledWith('/songs/song-1', { title: 'Updated' });
      expect(useSongStore.getState().songs[0].title).toBe('Updated');
      expect(useSongStore.getState().currentSong?.title).toBe('Updated');
    });
  });

  describe('deleteSong', () => {
    it('removes song from list and clears currentSong if matching', async () => {
      const song = makeSong();
      const detail = { ...song, noteCount: 0, collaboratorCount: 0 };
      useSongStore.setState({ songs: [song], currentSong: detail });
      mockedApi.del.mockResolvedValueOnce(undefined);

      await useSongStore.getState().deleteSong('song-1');

      expect(useSongStore.getState().songs).toHaveLength(0);
      expect(useSongStore.getState().currentSong).toBeNull();
    });
  });

  describe('setFilter', () => {
    it('updates filter and triggers fetchSongs', async () => {
      mockedApi.get.mockResolvedValueOnce([]);

      useSongStore.getState().setFilter('shared');

      expect(useSongStore.getState().filter).toBe('shared');
      expect(mockedApi.get).toHaveBeenCalledWith('/songs?filter=shared');
    });
  });
});
