import React from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAuthStore } from '@/stores/auth-store';
import { useSongStore } from '@/stores/song-store';
import { useNoteStore } from '@/stores/note-store';
import { CreateSongModal } from '@/components/CreateSongModal';
import { AudioEngine } from '@/lib/audio-engine';
import { api } from '@/lib/api';
import {
  MAX_TRACKS,
  MAX_TIME,
  NOTE_COLORS,
  DEFAULT_NOTE_COLOR,
  TOTAL_PITCHES,
  pitchName,
  isBlackKey,
} from '@ama-midi/shared';
import type { Note, SongCollaborator } from '@ama-midi/shared';

const TIME_STEPS = Array.from({ length: MAX_TIME + 1 }, (_, i) => i);
const PITCHES = Array.from({ length: TOTAL_PITCHES }, (_, i) => i);
const TRACKS = Array.from({ length: MAX_TRACKS }, (_, i) => i + 1);

const audioEngine = new AudioEngine();

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
  onUpdate: (data: { title?: string; description?: string; track?: number; pitch?: number; time?: number; color?: string }) => void;
  onDelete: () => void;
  history: HistoryEntry[];
}) {
  const [title, setTitle] = React.useState(note.title);
  const [description, setDescription] = React.useState(note.description ?? '');
  const [track, setTrack] = React.useState(note.track);
  const [pitch, setPitch] = React.useState(note.pitch);
  const [time, setTime] = React.useState(note.time);
  const [color, setColor] = React.useState(note.color);

  React.useEffect(() => {
    setTitle(note.title);
    setDescription(note.description ?? '');
    setTrack(note.track);
    setPitch(note.pitch);
    setTime(note.time);
    setColor(note.color);
  }, [note.id, note.title, note.description, note.track, note.pitch, note.time, note.color]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ title, description: description || undefined, track, pitch, time, color });
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
              <label htmlFor="note-pitch" className="mb-1 block text-xs text-text-secondary">Pitch</label>
              <select id="note-pitch" value={pitch} onChange={(e) => setPitch(Number(e.target.value))} className="w-full text-sm">
                {PITCHES.map((p) => (<option key={p} value={p}>{pitchName(p)}</option>))}
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="note-time" className="mb-1 block text-xs text-text-secondary">Time</label>
              <input id="note-time" type="number" min={0} max={MAX_TIME} step={1} value={time} onChange={(e) => setTime(Number(e.target.value))} className="w-full text-sm" />
            </div>
          </div>

          <div>
            <label htmlFor="note-track" className="mb-1 block text-xs text-text-secondary">Track</label>
            <select id="note-track" value={track} onChange={(e) => setTrack(Number(e.target.value))} className="w-full text-sm">
              {TRACKS.map((t) => (<option key={t} value={t}>Track {t}</option>))}
            </select>
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

const ROW_HEIGHT = 24;
const COL_WIDTH = 36;

function PianoGrid({
  notes,
  selectedNoteId,
  activeTrack,
  playheadTime,
  onCellClick,
  onNoteClick,
}: {
  notes: Note[];
  selectedNoteId: string | null;
  activeTrack: number;
  playheadTime: number | null;
  onCellClick: (pitch: number, time: number) => void;
  onNoteClick: (note: Note) => void;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const trackNotes = React.useMemo(
    () => notes.filter((n) => n.track === activeTrack),
    [notes, activeTrack],
  );

  const noteMap = React.useMemo(() => {
    const map = new Map<string, Note>();
    for (const n of trackNotes) {
      map.set(`${n.pitch}:${n.time}`, n);
    }
    return map;
  }, [trackNotes]);

  const rowVirtualizer = useVirtualizer({
    count: TIME_STEPS.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  const playheadTop = playheadTime !== null
    ? playheadTime * ROW_HEIGHT
    : null;

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto">
      {/* Pitch column headers (sticky top) */}
      <div className="sticky top-0 z-20 flex">
        <div className="w-14 shrink-0 border-b border-border-grid bg-primary" />
        {PITCHES.map((p) => {
          const black = isBlackKey(p);
          return (
            <div
              key={p}
              style={{ width: COL_WIDTH, minWidth: COL_WIDTH }}
              className={`flex h-8 items-center justify-center border-b border-l border-border-grid text-[8px] font-medium ${
                black ? 'bg-zinc-800 text-zinc-400' : 'bg-sidebar text-text-secondary'
              }`}
            >
              {pitchName(p)}
            </div>
          );
        })}
      </div>

      {/* Virtualized time rows */}
      <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
        {/* Playhead */}
        {playheadTop !== null && (
          <div
            className="pointer-events-none absolute left-0 z-30 w-full border-t-2 border-accent-red"
            style={{ top: playheadTop }}
          />
        )}

        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const time = TIME_STEPS[virtualRow.index]!;
          return (
            <div
              key={virtualRow.key}
              className="absolute left-0 flex w-full"
              style={{ top: virtualRow.start, height: ROW_HEIGHT }}
            >
              {/* Beat label (sticky left) */}
              <div className={`sticky left-0 z-10 flex w-14 shrink-0 items-center justify-end border-b border-border-grid pr-2 text-xs ${
                time % 4 === 0 ? 'bg-card font-medium text-text-primary' : 'bg-primary text-text-secondary'
              }`}>
                {time}
              </div>
              {/* Pitch cells */}
              {PITCHES.map((p) => {
                const note = noteMap.get(`${p}:${time}`);
                const isSelected = note?.id === selectedNoteId;
                const black = isBlackKey(p);
                return (
                  <div
                    key={p}
                    style={{ width: COL_WIDTH, minWidth: COL_WIDTH }}
                    onClick={() => {
                      if (note) {
                        onNoteClick(note);
                      } else {
                        onCellClick(p, time);
                      }
                    }}
                    className={`flex cursor-pointer items-center justify-center border-b border-l border-border-grid transition-colors hover:bg-accent-blue/10 ${
                      black ? 'bg-zinc-900/40' : ''
                    }`}
                  >
                    {note && (
                      <div
                        className={`h-4 w-[80%] rounded-sm transition-shadow ${isSelected ? 'ring-2 ring-white' : ''}`}
                        style={{
                          backgroundColor: note.color ?? '#22C55E',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShareModal({
  songId,
  owner,
  onClose,
}: {
  songId: string;
  owner?: { id: string; name: string; email: string };
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
          {owner && (
            <div className="flex items-center justify-between rounded-md bg-sidebar px-3 py-2">
              <div>
                <p className="text-sm text-text-primary">{owner.name}</p>
                <p className="text-xs text-text-secondary">{owner.email}</p>
              </div>
              <span className="text-xs font-medium text-accent-blue">Owner</span>
            </div>
          )}
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
    applyWsMessage,
  } = useNoteStore();

  const [titleDraft, setTitleDraft] = React.useState('');
  const [descDraft, setDescDraft] = React.useState('');
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'saved'>('idle');
  const [shareOpen, setShareOpen] = React.useState(false);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [activeTrack, setActiveTrack] = React.useState(1);
  const [bpm, setBpm] = React.useState(120);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [playheadTime, setPlayheadTime] = React.useState<number | null>(null);

  const [undoStack, setUndoStack] = React.useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = React.useState<UndoAction[]>([]);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchSong(songId);
    fetchNotes(songId);
    fetchHistory(songId);
    fetchSongs();
    return () => { clearNotes(); audioEngine.stop(); };
  }, [songId, fetchSong, fetchNotes, fetchHistory, fetchSongs, clearNotes]);

  React.useEffect(() => {
    const token = api.getToken();
    if (!token) return;

    let alive = true;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      if (!alive) return;
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const url = `${proto}://${window.location.host}/api/ws/${songId}/ws?token=${encodeURIComponent(token!)}`;
      ws = new WebSocket(url);

      ws.addEventListener('message', (e) => {
        try {
          applyWsMessage(JSON.parse(e.data));
        } catch { /* ignore malformed */ }
      });

      ws.addEventListener('close', () => {
        if (alive) reconnectTimer = setTimeout(connect, 3000);
      });
    }

    connect();

    return () => {
      alive = false;
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [songId, applyWsMessage]);

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

  const handleCellClick = async (pitch: number, time: number) => {
    audioEngine.playNote(pitch);
    const noteData = {
      track: activeTrack,
      pitch,
      time,
      title: `${pitchName(pitch)} @ beat ${time}`,
      color: DEFAULT_NOTE_COLOR,
    };
    try {
      await createNote(songId, noteData);
      const created = useNoteStore.getState().notes.find(
        (n) => n.track === activeTrack && n.pitch === pitch && n.time === time,
      );
      if (created) {
        pushUndo({ type: 'create', songId, noteId: created.id, before: null, after: noteData });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create note';
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleUpdateNote = async (
    data: { title?: string; description?: string; track?: number; pitch?: number; time?: number; color?: string },
  ) => {
    if (!selectedNote) return;
    const before: Partial<Note> = {
      title: selectedNote.title,
      description: selectedNote.description ?? undefined,
      track: selectedNote.track,
      pitch: selectedNote.pitch,
      time: selectedNote.time,
      color: selectedNote.color,
    };
    pushUndo({ type: 'update', songId, noteId: selectedNote.id, before, after: data });
    try {
      await updateNote(songId, selectedNote.id, data);
      fetchHistory(songId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update note';
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleDeleteNote = async () => {
    if (!selectedNote) return;
    pushUndo({
      type: 'delete',
      songId,
      noteId: selectedNote.id,
      before: {
        track: selectedNote.track,
        pitch: selectedNote.pitch,
        time: selectedNote.time,
        title: selectedNote.title,
        description: selectedNote.description ?? undefined,
        color: selectedNote.color,
      },
      after: null,
    });
    try {
      await deleteNote(songId, selectedNote.id);
      selectNote(null);
      fetchHistory(songId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete note';
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    }
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

  const handlePlayStop = () => {
    if (isPlaying) {
      audioEngine.stop();
      setIsPlaying(false);
      setPlayheadTime(null);
    } else {
      setIsPlaying(true);
      audioEngine.play(
        notes,
        bpm,
        (t) => setPlayheadTime(t),
        () => { setIsPlaying(false); setPlayheadTime(null); },
      );
    }
  };

  const historyEntries: HistoryEntry[] = (history as unknown as HistoryEntry[]);

  return (
    <div className="flex h-screen bg-primary text-text-primary">
      {/* Left sidebar */}
      <aside className="flex w-52 shrink-0 flex-col border-r border-border-subtle bg-sidebar">
        <button
          type="button"
          onClick={() => navigate({ to: '/' })}
          className="flex items-center gap-2 border-b border-border-subtle px-4 py-3 transition-colors hover:bg-card"
        >
          <span className="text-lg text-accent-blue">♪</span>
          <span className="text-sm font-black italic">AMA-MIDI</span>
        </button>

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
              <span className="ml-2 shrink-0 text-xs opacity-60">{song.noteCount ?? 0}</span>
            </button>
          ))}
        </div>

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
              className="w-48 border-none bg-transparent text-sm text-text-secondary outline-none placeholder:text-text-secondary/50 focus:ring-0"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Play / Stop */}
            <button
              type="button"
              onClick={handlePlayStop}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium text-white transition-colors ${
                isPlaying ? 'bg-accent-red hover:bg-red-600' : 'bg-accent-green hover:bg-green-600'
              }`}
            >
              {isPlaying ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                    <rect x="3" y="3" width="10" height="10" rx="1" />
                  </svg>
                  Stop
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M4 3.5a.5.5 0 01.764-.424l8 5a.5.5 0 010 .848l-8 5A.5.5 0 014 13.5v-10z" />
                  </svg>
                  Play
                </>
              )}
            </button>

            {/* BPM */}
            <div className="flex items-center gap-1">
              <label htmlFor="bpm" className="text-xs text-text-secondary">BPM</label>
              <input
                id="bpm"
                type="number"
                min={40}
                max={300}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-14 rounded border border-border-subtle bg-transparent px-1.5 py-0.5 text-center text-xs text-text-primary"
              />
            </div>

            <div className="mx-1 h-5 w-px bg-border-subtle" />

            {/* Save */}
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1 rounded-md bg-accent-blue px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Save'}
            </button>

            {/* Share */}
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-1 rounded-md border border-border-subtle px-3 py-1 text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              Share
            </button>

            <div className="mx-1 h-5 w-px bg-border-subtle" />

            {/* Undo / Redo */}
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

          <div className="ml-auto flex items-center gap-4 text-xs text-text-secondary">
            <span>{notes.length} notes</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-accent-green" />
              1 online
            </span>
          </div>
        </header>

        {/* Error banner */}
        {errorMsg && (
          <div className="flex items-center justify-between bg-accent-red/20 px-4 py-1.5 text-sm text-accent-red">
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="ml-4 font-bold">x</button>
          </div>
        )}

        {/* Track tabs */}
        <div className="flex items-center gap-0 border-b border-border-subtle bg-sidebar px-2">
          {TRACKS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTrack(t)}
              className={`border-b-2 px-4 py-2 text-xs font-medium transition-colors ${
                t === activeTrack
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              Track {t}
            </button>
          ))}
        </div>

        <PianoGrid
          notes={notes}
          selectedNoteId={selectedNote?.id ?? null}
          activeTrack={activeTrack}
          playheadTime={playheadTime}
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
      {shareOpen && <ShareModal songId={songId} owner={currentSong?.owner} onClose={() => setShareOpen(false)} />}
      {createModalOpen && <CreateSongModal onClose={() => setCreateModalOpen(false)} onSubmit={handleCreateSong} />}
    </div>
  );
}
