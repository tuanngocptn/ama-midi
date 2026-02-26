import React from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth-store';
import { useSongStore } from '@/stores/song-store';
import { useNoteStore } from '@/stores/note-store';
import { CreateSongModal } from '@/components/CreateSongModal';
import { api } from '@/lib/api';
import {
  MAX_TRACKS,
  MAX_TIME,
  NOTE_COLORS,
  DEFAULT_NOTE_COLOR,
} from '@ama-midi/shared';
import type { Note, SongCollaborator } from '@ama-midi/shared';

const TIME_STEP = 5;
const TIME_STEPS = Array.from(
  { length: MAX_TIME / TIME_STEP + 1 },
  (_, i) => i * TIME_STEP,
);
const TRACKS = Array.from({ length: MAX_TRACKS }, (_, i) => i + 1);

interface HistoryEntry {
  id: string;
  noteId: string;
  action: string;
  createdAt: string;
  user: { id: string; name: string };
}

interface UndoAction {
  type: 'create' | 'update' | 'delete';
  songId: string;
  noteId: string;
  before: Partial<Note> | null;
  after: Partial<Note> | null;
}

function UserAvatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const cls = size === 'md' ? 'h-8 w-8 text-xs' : 'h-6 w-6 text-[10px]';
  return (
    <div className={`flex items-center justify-center rounded-full bg-accent-blue font-bold text-white ${cls}`}>
      {initials}
    </div>
  );
}

function NotePanel({
  note,
  onUpdate,
  onDelete,
  history,
}: {
  note: Note;
  onUpdate: (data: { title?: string; description?: string; track?: number; time?: number; color?: string }) => void;
  onDelete: () => void;
  history: HistoryEntry[];
}) {
  const [title, setTitle] = React.useState(note.title);
  const [description, setDescription] = React.useState(note.description ?? '');
  const [track, setTrack] = React.useState(note.track);
  const [time, setTime] = React.useState(note.time);
  const [color, setColor] = React.useState(note.color);

  React.useEffect(() => {
    setTitle(note.title);
    setDescription(note.description ?? '');
    setTrack(note.track);
    setTime(note.time);
    setColor(note.color);
  }, [note.id, note.title, note.description, note.track, note.time, note.color]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ title, description: description || undefined, track, time, color });
  };

  const noteHistory = history.filter((h) => h.noteId === note.id).slice(0, 10);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const actionLabel = (action: string) => {
    switch (action) {
      case 'CREATE': return 'Created by';
      case 'UPDATE': return 'Edited by';
      case 'DELETE': return 'Deleted by';
      default: return action;
    }
  };

  const actionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-accent-green';
      case 'UPDATE': return 'bg-accent-blue';
      case 'DELETE': return 'bg-accent-red';
      default: return 'bg-text-secondary';
    }
  };

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-border-subtle bg-sidebar">
      <div className="p-4">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Edit Note</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label htmlFor="note-title" className="mb-1 block text-xs text-text-secondary">Title</label>
            <input id="note-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full text-sm" />
          </div>

          <div>
            <label htmlFor="note-desc" className="mb-1 block text-xs text-text-secondary">Description</label>
            <textarea id="note-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full resize-none text-sm" />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="note-track" className="mb-1 block text-xs text-text-secondary">Track</label>
              <select id="note-track" value={track} onChange={(e) => setTrack(Number(e.target.value))} className="w-full text-sm">
                {TRACKS.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="note-time" className="mb-1 block text-xs text-text-secondary">Time</label>
              <input id="note-time" type="number" min={0} max={MAX_TIME} step={1} value={time} onChange={(e) => setTime(Number(e.target.value))} className="w-full text-sm" />
            </div>
          </div>

          <div>
            <span className="mb-2 block text-xs text-text-secondary">Color</span>
            <div className="flex flex-wrap gap-2">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded transition-transform hover:scale-110 ${
                    color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-sidebar' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="mt-2 flex gap-2">
            <button type="submit" className="btn-primary flex-1 text-sm">Update</button>
            <button type="button" onClick={onDelete} className="btn-danger flex-1 text-sm">Delete</button>
          </div>
        </form>
      </div>

      {/* History */}
      {noteHistory.length > 0 && (
        <div className="border-t border-border-subtle p-4">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">History</h3>
          <div className="flex flex-col gap-2">
            {noteHistory.map((h) => (
              <div key={h.id} className="flex items-start gap-2">
                <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${actionColor(h.action)}`} />
                <div className="text-xs text-text-secondary">
                  <span>{actionLabel(h.action)} {h.user.name}</span>
                  <span className="ml-1 opacity-60">at {formatTime(h.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function PianoGrid({
  notes,
  selectedNoteId,
  onCellClick,
  onNoteClick,
}: {
  notes: Note[];
  selectedNoteId: string | null;
  onCellClick: (track: number, time: number) => void;
  onNoteClick: (note: Note) => void;
}) {
  const noteMap = React.useMemo(() => {
    const map = new Map<string, Note>();
    for (const n of notes) {
      map.set(`${n.track}:${n.time}`, n);
    }
    return map;
  }, [notes]);

  const snapToStep = (time: number) => Math.round(time / TIME_STEP) * TIME_STEP;

  return (
    <div className="flex-1 overflow-auto">
      <div className="inline-flex min-w-full">
        <div className="sticky left-0 z-10 w-14 shrink-0 bg-primary">
          <div className="h-10 border-b border-border-grid" />
          {TIME_STEPS.map((t) => (
            <div key={t} className="flex h-10 items-center justify-end pr-2 text-xs text-text-secondary">
              {t}s
            </div>
          ))}
        </div>

        {TRACKS.map((track) => (
          <div key={track} className="min-w-[100px] flex-1">
            <div className="sticky top-0 z-10 flex h-10 items-center justify-center border-b border-l border-border-grid bg-sidebar text-xs font-medium text-text-secondary">
              Track {track}
            </div>
            {TIME_STEPS.map((time) => {
              const note = noteMap.get(`${track}:${time}`);
              const isSelected = note?.id === selectedNoteId;
              return (
                <div
                  key={time}
                  onClick={() => note ? onNoteClick(note) : onCellClick(track, snapToStep(time))}
                  className="flex h-10 cursor-pointer items-center justify-center border-b border-l border-border-grid transition-colors hover:bg-card/40"
                >
                  {note && (
                    <div
                      className="h-6 w-6 rounded-full transition-shadow"
                      style={{
                        backgroundColor: note.color,
                        boxShadow: isSelected
                          ? `0 0 0 3px rgba(6,182,212,0.5), 0 0 12px ${note.color}`
                          : 'none',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function ShareModal({
  songId,
  onClose,
}: {
  songId: string;
  onClose: () => void;
}) {
  const [collaborators, setCollaborators] = React.useState<SongCollaborator[]>([]);
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<'editor' | 'viewer'>('editor');
  const [error, setError] = React.useState('');

  const fetchCollaborators = React.useCallback(async () => {
    try {
      const data = await api.get<SongCollaborator[]>(`/songs/${songId}/collaborators`);
      setCollaborators(data);
    } catch { /* empty */ }
  }, [songId]);

  React.useEffect(() => { fetchCollaborators(); }, [fetchCollaborators]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/songs/${songId}/collaborators`, { email, role });
      setEmail('');
      fetchCollaborators();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add');
    }
  };

  const handleRemove = async (userId: string) => {
    await api.del(`/songs/${songId}/collaborators/${userId}`);
    fetchCollaborators();
  };

  const handleRoleChange = async (userId: string, newRole: 'editor' | 'viewer') => {
    await api.put(`/songs/${songId}/collaborators/${userId}`, { role: newRole });
    fetchCollaborators();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg bg-card p-6">
        <h2 className="text-lg font-semibold text-text-primary">Share Song</h2>

        <form onSubmit={handleAdd} className="mt-4 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="collaborator@email.com"
            required
            className="flex-1 text-sm"
          />
          <select value={role} onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')} className="w-24 text-sm">
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button type="submit" className="btn-primary text-sm">Add</button>
        </form>

        {error && <p className="mt-2 text-sm text-accent-red">{error}</p>}

        <div className="mt-4 flex flex-col gap-2">
          {collaborators.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-md bg-sidebar px-3 py-2">
              <div>
                <p className="text-sm text-text-primary">{c.user?.name ?? c.user?.email ?? c.userId}</p>
                <p className="text-xs text-text-secondary">{c.user?.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={c.role}
                  onChange={(e) => handleRoleChange(c.userId, e.target.value as 'editor' | 'viewer')}
                  className="border-none bg-transparent text-xs text-text-secondary"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button type="button" onClick={() => handleRemove(c.userId)} className="text-xs text-accent-red hover:underline">
                  Remove
                </button>
              </div>
            </div>
          ))}
          {collaborators.length === 0 && (
            <p className="py-4 text-center text-sm text-text-secondary">No collaborators yet</p>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onClose} className="btn-ghost text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}

export function EditorPage() {
  const { songId } = useParams({ from: '/songs/$songId' });
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const { songs, currentSong, fetchSongs, fetchSong, updateSong, createSong } = useSongStore();
  const {
    notes,
    selectedNote,
    history,
    fetchNotes,
    fetchHistory,
    createNote,
    updateNote,
    deleteNote,
    selectNote,
    clearNotes,
  } = useNoteStore();

  const [titleDraft, setTitleDraft] = React.useState('');
  const [descDraft, setDescDraft] = React.useState('');
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'saved'>('idle');
  const [shareOpen, setShareOpen] = React.useState(false);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);

  const [undoStack, setUndoStack] = React.useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = React.useState<UndoAction[]>([]);

  React.useEffect(() => {
    fetchSong(songId);
    fetchNotes(songId);
    fetchHistory(songId);
    fetchSongs();
    return () => clearNotes();
  }, [songId, fetchSong, fetchNotes, fetchHistory, fetchSongs, clearNotes]);

  React.useEffect(() => {
    if (currentSong) {
      setTitleDraft(currentSong.title);
      setDescDraft(currentSong.description ?? '');
    }
  }, [currentSong]);

  const handleSave = async () => {
    if (!currentSong) return;
    setSaveStatus('saving');
    try {
      await updateSong(currentSong.id, {
        title: titleDraft.trim() || currentSong.title,
        description: descDraft.trim() || null,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('idle');
    }
  };

  const pushUndo = (action: UndoAction) => {
    setUndoStack((s) => [...s, action]);
    setRedoStack([]);
  };

  const handleCellClick = async (track: number, time: number) => {
    const noteData = { track, time, title: `Note T${track}@${time}s`, color: DEFAULT_NOTE_COLOR };
    await createNote(songId, noteData);
    const created = useNoteStore.getState().notes.find(
      (n) => n.track === track && n.time === time,
    );
    if (created) {
      pushUndo({ type: 'create', songId, noteId: created.id, before: null, after: noteData });
    }
  };

  const handleUpdateNote = async (
    data: { title?: string; description?: string; track?: number; time?: number; color?: string },
  ) => {
    if (!selectedNote) return;
    const before: Partial<Note> = {
      title: selectedNote.title,
      description: selectedNote.description ?? undefined,
      track: selectedNote.track,
      time: selectedNote.time,
      color: selectedNote.color,
    };
    pushUndo({ type: 'update', songId, noteId: selectedNote.id, before, after: data });
    await updateNote(songId, selectedNote.id, data);
    fetchHistory(songId);
  };

  const handleDeleteNote = async () => {
    if (!selectedNote) return;
    pushUndo({
      type: 'delete',
      songId,
      noteId: selectedNote.id,
      before: {
        track: selectedNote.track,
        time: selectedNote.time,
        title: selectedNote.title,
        description: selectedNote.description ?? undefined,
        color: selectedNote.color,
      },
      after: null,
    });
    await deleteNote(songId, selectedNote.id);
    selectNote(null);
    fetchHistory(songId);
  };

  const handleUndo = async () => {
    const action = undoStack[undoStack.length - 1];
    if (!action) return;
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, action]);

    switch (action.type) {
      case 'create':
        await deleteNote(action.songId, action.noteId);
        break;
      case 'update':
        if (action.before) await updateNote(action.songId, action.noteId, action.before as Record<string, unknown>);
        break;
      case 'delete':
        if (action.before) await createNote(action.songId, action.before as Parameters<typeof createNote>[1]);
        break;
    }
    fetchHistory(songId);
  };

  const handleRedo = async () => {
    const action = redoStack[redoStack.length - 1];
    if (!action) return;
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, action]);

    switch (action.type) {
      case 'create':
        if (action.after) await createNote(action.songId, action.after as Parameters<typeof createNote>[1]);
        break;
      case 'update':
        if (action.after) await updateNote(action.songId, action.noteId, action.after as Record<string, unknown>);
        break;
      case 'delete':
        await deleteNote(action.songId, action.noteId);
        break;
    }
    fetchHistory(songId);
  };

  const handleCreateSong = async (title: string, description: string) => {
    const song = await createSong(title, description || undefined);
    setCreateModalOpen(false);
    navigate({ to: `/songs/${song.id}` });
  };

  const historyEntries: HistoryEntry[] = (history as unknown as HistoryEntry[]);

  return (
    <div className="flex h-screen bg-primary text-text-primary">
      {/* Left sidebar */}
      <aside className="flex w-52 shrink-0 flex-col border-r border-border-subtle bg-sidebar">
        <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
          <span className="text-lg text-accent-blue">♪</span>
          <span className="text-sm font-black italic">AMA-MIDI</span>
        </div>

        {/* Songs section */}
        <div className="px-3 pt-3">
          <p className="px-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">Songs</p>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="mt-2 w-full rounded-md bg-accent-blue px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            + New Song
          </button>
        </div>

        {/* Song list */}
        <div className="mt-2 flex-1 overflow-y-auto px-1">
          {songs.map((song) => (
            <button
              key={song.id}
              type="button"
              onClick={() => navigate({ to: `/songs/${song.id}` })}
              className={`mb-0.5 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                song.id === songId
                  ? 'bg-accent-blue/20 text-accent-blue'
                  : 'text-text-secondary hover:bg-card hover:text-text-primary'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                {song.id === songId && <span className="text-xs">▶</span>}
                <span className="truncate">{song.title}</span>
              </span>
              <span className="ml-2 shrink-0 text-xs opacity-60">{song.noteCount ?? 0} notes</span>
            </button>
          ))}
        </div>

        {/* User section */}
        <div className="border-t border-border-subtle px-3 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserAvatar name={user?.name ?? '?'} size="md" />
              <span className="truncate text-sm text-text-primary">{user?.name}</span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="text-text-secondary transition-colors hover:text-text-primary"
              aria-label="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top toolbar */}
        <header className="flex items-center gap-4 border-b border-border-subtle px-4 py-2">
          {/* Title + Description */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="w-40 border-none bg-transparent text-base font-semibold text-text-primary outline-none focus:ring-0"
            />
            <input
              type="text"
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              onBlur={handleSave}
              placeholder="Add description..."
              className="w-60 border-none bg-transparent text-sm text-text-secondary outline-none placeholder:text-text-secondary/50 focus:ring-0"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1 rounded-md bg-accent-green px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-green-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
              </svg>
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Save'}
            </button>

            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-1 rounded-md border border-border-subtle px-3 py-1 text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M12 2a2 2 0 110 4 2 2 0 010-4zM12 10a2 2 0 110 4 2 2 0 010-4zM4 6a2 2 0 110 4 2 2 0 010-4z" />
                <path d="M10.268 3.658L5.732 6.342m0 3.316l4.536 2.684" stroke="currentColor" strokeWidth="1" fill="none" />
              </svg>
              Share
            </button>

            <div className="mx-1 h-5 w-px bg-border-subtle" />

            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="rounded-md px-2 py-1 text-sm text-text-secondary transition-colors hover:text-text-primary disabled:opacity-30"
              title="Undo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clipRule="evenodd" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="rounded-md px-2 py-1 text-sm text-text-secondary transition-colors hover:text-text-primary disabled:opacity-30"
              title="Redo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M12.207 2.232a.75.75 0 00.025 1.06l4.146 3.958H6.375a5.375 5.375 0 000 10.75H9.25a.75.75 0 000-1.5H6.375a3.875 3.875 0 010-7.75h10.003l-4.146 3.957a.75.75 0 001.036 1.085l5.5-5.25a.75.75 0 000-1.085l-5.5-5.25a.75.75 0 00-1.06.025z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Info bar */}
          <div className="ml-auto flex items-center gap-4 text-xs text-text-secondary">
            <span>Track 1–{MAX_TRACKS}</span>
            <span className="hidden sm:inline">|</span>
            <span className="hidden sm:inline">0-{MAX_TIME}s</span>
            <span className="hidden sm:inline">|</span>
            <span>{notes.length} notes</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-accent-green" />
              1 online
            </span>
          </div>
        </header>

        <PianoGrid
          notes={notes}
          selectedNoteId={selectedNote?.id ?? null}
          onCellClick={handleCellClick}
          onNoteClick={selectNote}
        />
      </div>

      {/* Right panel */}
      {selectedNote && (
        <NotePanel
          note={selectedNote}
          onUpdate={handleUpdateNote}
          onDelete={handleDeleteNote}
          history={historyEntries}
        />
      )}

      {/* Modals */}
      {shareOpen && <ShareModal songId={songId} onClose={() => setShareOpen(false)} />}
      {createModalOpen && <CreateSongModal onClose={() => setCreateModalOpen(false)} onSubmit={handleCreateSong} />}
    </div>
  );
}
