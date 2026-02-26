import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNoteStore } from '@/stores/note-store';
import { api } from '@/lib/api';
import type { Note, NoteEvent, WsServerMessage } from '@ama-midi/shared';

const mockedApi = vi.mocked(api);

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'note-1',
  songId: 'song-1',
  track: 1,
  time: 10,
  title: 'Test Note',
  description: null,
  color: '#3B82F6',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

const makeEvent = (overrides: Partial<NoteEvent> = {}): NoteEvent => ({
  id: 'evt-1',
  noteId: 'note-1',
  songId: 'song-1',
  userId: 'user-1',
  action: 'CREATE',
  payload: null,
  createdAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('useNoteStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNoteStore.setState({
      notes: [],
      selectedNote: null,
      history: [],
      isLoading: false,
    });
  });

  describe('fetchNotes', () => {
    it('fetches and stores notes', async () => {
      const notes = [makeNote(), makeNote({ id: 'note-2', track: 2 })];
      mockedApi.get.mockResolvedValueOnce(notes);

      await useNoteStore.getState().fetchNotes('song-1');

      expect(mockedApi.get).toHaveBeenCalledWith('/songs/song-1/notes');
      expect(useNoteStore.getState().notes).toEqual(notes);
      expect(useNoteStore.getState().isLoading).toBe(false);
    });

    it('handles error gracefully', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('fail'));

      await useNoteStore.getState().fetchNotes('song-1');

      expect(useNoteStore.getState().notes).toEqual([]);
      expect(useNoteStore.getState().isLoading).toBe(false);
    });
  });

  describe('createNote', () => {
    it('creates a note and appends to list', async () => {
      const created = makeNote({ id: 'new-note' });
      mockedApi.post.mockResolvedValueOnce(created);

      await useNoteStore.getState().createNote('song-1', {
        track: 1,
        time: 10,
        title: 'New',
        color: '#3B82F6',
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/songs/song-1/notes', {
        track: 1,
        time: 10,
        title: 'New',
        color: '#3B82F6',
      });
      expect(useNoteStore.getState().notes).toContainEqual(created);
    });

    it('throws on failure', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('bad'));

      await expect(
        useNoteStore.getState().createNote('song-1', {
          track: 1,
          time: 0,
          title: 'X',
          color: '#000',
        }),
      ).rejects.toThrow('bad');
    });
  });

  describe('updateNote', () => {
    it('updates a note in list and selectedNote', async () => {
      const note = makeNote();
      useNoteStore.setState({ notes: [note], selectedNote: note });

      const updated = makeNote({ title: 'Updated' });
      mockedApi.put.mockResolvedValueOnce(updated);

      await useNoteStore.getState().updateNote('song-1', 'note-1', { title: 'Updated' });

      expect(mockedApi.put).toHaveBeenCalledWith('/songs/song-1/notes/note-1', { title: 'Updated' });
      expect(useNoteStore.getState().notes[0].title).toBe('Updated');
      expect(useNoteStore.getState().selectedNote?.title).toBe('Updated');
    });
  });

  describe('deleteNote', () => {
    it('removes note from list and clears selectedNote', async () => {
      const note = makeNote();
      useNoteStore.setState({ notes: [note], selectedNote: note });
      mockedApi.del.mockResolvedValueOnce(undefined);

      await useNoteStore.getState().deleteNote('song-1', 'note-1');

      expect(useNoteStore.getState().notes).toHaveLength(0);
      expect(useNoteStore.getState().selectedNote).toBeNull();
    });
  });

  describe('selectNote', () => {
    it('sets the selected note', () => {
      const note = makeNote();
      useNoteStore.getState().selectNote(note);
      expect(useNoteStore.getState().selectedNote).toEqual(note);
    });

    it('clears the selection with null', () => {
      useNoteStore.setState({ selectedNote: makeNote() });
      useNoteStore.getState().selectNote(null);
      expect(useNoteStore.getState().selectedNote).toBeNull();
    });
  });

  describe('fetchHistory', () => {
    it('fetches and stores history events', async () => {
      const events = [makeEvent(), makeEvent({ id: 'evt-2', action: 'UPDATE' })];
      mockedApi.get.mockResolvedValueOnce(events);

      await useNoteStore.getState().fetchHistory('song-1');

      expect(mockedApi.get).toHaveBeenCalledWith('/songs/song-1/history');
      expect(useNoteStore.getState().history).toEqual(events);
    });
  });

  describe('applyWsMessage', () => {
    it('handles note:created by appending', () => {
      const existing = makeNote();
      useNoteStore.setState({ notes: [existing] });

      const newNote = makeNote({ id: 'note-ws' });
      const msg: WsServerMessage = { type: 'note:created', data: newNote };

      useNoteStore.getState().applyWsMessage(msg);

      expect(useNoteStore.getState().notes).toHaveLength(2);
      expect(useNoteStore.getState().notes[1]).toEqual(newNote);
    });

    it('handles note:updated by replacing in list', () => {
      const note = makeNote();
      useNoteStore.setState({ notes: [note], selectedNote: note });

      const updated = makeNote({ title: 'WS Updated' });
      const msg: WsServerMessage = { type: 'note:updated', data: updated };

      useNoteStore.getState().applyWsMessage(msg);

      expect(useNoteStore.getState().notes[0].title).toBe('WS Updated');
      expect(useNoteStore.getState().selectedNote?.title).toBe('WS Updated');
    });

    it('handles note:deleted by filtering out', () => {
      const note = makeNote();
      useNoteStore.setState({ notes: [note], selectedNote: note });

      const msg: WsServerMessage = { type: 'note:deleted', data: { id: 'note-1' } };

      useNoteStore.getState().applyWsMessage(msg);

      expect(useNoteStore.getState().notes).toHaveLength(0);
      expect(useNoteStore.getState().selectedNote).toBeNull();
    });
  });

  describe('clearNotes', () => {
    it('resets notes, selectedNote, and history', () => {
      useNoteStore.setState({
        notes: [makeNote()],
        selectedNote: makeNote(),
        history: [makeEvent()],
      });

      useNoteStore.getState().clearNotes();

      expect(useNoteStore.getState().notes).toEqual([]);
      expect(useNoteStore.getState().selectedNote).toBeNull();
      expect(useNoteStore.getState().history).toEqual([]);
    });
  });
});
