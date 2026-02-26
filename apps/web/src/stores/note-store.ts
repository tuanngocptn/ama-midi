import { create } from 'zustand';
import type { Note, NoteEvent, WsServerMessage } from '@ama-midi/shared';
import { api } from '@/lib/api';

type CreateNoteInput = Pick<Note, 'track' | 'pitch' | 'time' | 'title' | 'color'> & {
  description?: string;
};

type UpdateNoteInput = Partial<CreateNoteInput>;

interface NoteState {
  notes: Note[];
  selectedNote: Note | null;
  history: NoteEvent[];
  isLoading: boolean;
  fetchNotes: (songId: string) => Promise<void>;
  createNote: (songId: string, data: CreateNoteInput) => Promise<void>;
  updateNote: (songId: string, noteId: string, data: UpdateNoteInput) => Promise<void>;
  deleteNote: (songId: string, noteId: string) => Promise<void>;
  selectNote: (note: Note | null) => void;
  fetchHistory: (songId: string) => Promise<void>;
  applyWsMessage: (msg: WsServerMessage) => void;
  clearNotes: () => void;
}

export const useNoteStore = create<NoteState>((set) => ({
  notes: [],
  selectedNote: null,
  history: [],
  isLoading: false,

  async fetchNotes(songId) {
    set({ isLoading: true });
    try {
      const notes = await api.get<Note[]>(`/songs/${songId}/notes`);
      set({ notes });
    } catch (err) {
      console.error(err);
    } finally {
      set({ isLoading: false });
    }
  },

  async createNote(songId, data) {
    set({ isLoading: true });
    try {
      const note = await api.post<Note>(`/songs/${songId}/notes`, data);
      set((s) => ({ notes: [...s.notes, note] }));
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  async updateNote(songId, noteId, data) {
    set({ isLoading: true });
    try {
      const updated = await api.put<Note>(
        `/songs/${songId}/notes/${noteId}`,
        data,
      );
      set((s) => ({
        notes: s.notes.map((n) => (n.id === noteId ? updated : n)),
        selectedNote: s.selectedNote?.id === noteId ? updated : s.selectedNote,
      }));
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  async deleteNote(songId, noteId) {
    set({ isLoading: true });
    try {
      await api.del(`/songs/${songId}/notes/${noteId}`);
      set((s) => ({
        notes: s.notes.filter((n) => n.id !== noteId),
        selectedNote: s.selectedNote?.id === noteId ? null : s.selectedNote,
      }));
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  selectNote(note) {
    set({ selectedNote: note });
  },

  async fetchHistory(songId) {
    set({ isLoading: true });
    try {
      const history = await api.get<NoteEvent[]>(`/songs/${songId}/history`);
      set({ history });
    } catch (err) {
      console.error(err);
    } finally {
      set({ isLoading: false });
    }
  },

  applyWsMessage(msg) {
    switch (msg.type) {
      case 'note:created':
        set((s) => {
          if (s.notes.some((n) => n.id === msg.data.id)) return s;
          return { notes: [...s.notes, msg.data] };
        });
        break;
      case 'note:updated':
        set((s) => ({
          notes: s.notes.map((n) => (n.id === msg.data.id ? msg.data : n)),
          selectedNote:
            s.selectedNote?.id === msg.data.id ? msg.data : s.selectedNote,
        }));
        break;
      case 'note:deleted':
        set((s) => ({
          notes: s.notes.filter((n) => n.id !== msg.data.id),
          selectedNote:
            s.selectedNote?.id === msg.data.id ? null : s.selectedNote,
        }));
        break;
    }
  },

  clearNotes() {
    set({ notes: [], selectedNote: null, history: [] });
  },
}));
