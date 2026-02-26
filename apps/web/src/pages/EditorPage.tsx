import React from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useSongStore } from '@/stores/song-store';
import { useNoteStore } from '@/stores/note-store';
import {
  MAX_TRACKS,
  MAX_TIME,
  NOTE_COLORS,
  DEFAULT_NOTE_COLOR,
} from '@ama-midi/shared';
import type { Note } from '@ama-midi/shared';

const TIME_STEP = 5;
const TIME_STEPS = Array.from(
  { length: MAX_TIME / TIME_STEP + 1 },
  (_, i) => i * TIME_STEP,
);
const TRACKS = Array.from({ length: MAX_TRACKS }, (_, i) => i + 1);

function NotePanel({
  note,
  onUpdate,
  onDelete,
}: {
  note: Note;
  onUpdate: (data: { title?: string; description?: string; track?: number; time?: number; color?: string }) => void;
  onDelete: () => void;
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

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-l border-border-subtle bg-sidebar p-4">
      <h2 className="mb-4 text-lg font-semibold text-text-primary">Edit Note</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label htmlFor="note-title" className="mb-1 block text-xs text-text-secondary">
            Title
          </label>
          <input
            id="note-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full text-sm"
          />
        </div>

        <div>
          <label htmlFor="note-desc" className="mb-1 block text-xs text-text-secondary">
            Description
          </label>
          <textarea
            id="note-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-none text-sm"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="note-track" className="mb-1 block text-xs text-text-secondary">
              Track
            </label>
            <select
              id="note-track"
              value={track}
              onChange={(e) => setTrack(Number(e.target.value))}
              className="w-full text-sm"
            >
              {TRACKS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor="note-time" className="mb-1 block text-xs text-text-secondary">
              Time (s)
            </label>
            <input
              id="note-time"
              type="number"
              min={0}
              max={MAX_TIME}
              step={1}
              value={time}
              onChange={(e) => setTime(Number(e.target.value))}
              className="w-full text-sm"
            />
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
                className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
                  color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-sidebar' : ''
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-2 flex gap-2">
          <button type="submit" className="btn-primary flex-1 text-sm">
            Update
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="btn-danger flex-1 text-sm"
          >
            Delete
          </button>
        </div>
      </form>
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
        {/* Time labels column */}
        <div className="sticky left-0 z-10 w-14 shrink-0 bg-primary">
          <div className="h-10 border-b border-border-grid" />
          {TIME_STEPS.map((t) => (
            <div
              key={t}
              className="flex h-10 items-center justify-end pr-2 text-xs text-text-secondary"
            >
              {t}s
            </div>
          ))}
        </div>

        {/* Track columns */}
        {TRACKS.map((track) => (
          <div key={track} className="min-w-[100px] flex-1">
            <div className="sticky top-0 z-10 flex h-10 items-center justify-center border-b border-l border-border-grid bg-sidebar text-xs font-medium text-text-secondary">
              Track {track}
            </div>
            {TIME_STEPS.map((time) => {
              const note = noteMap.get(`${track}:${time}`);
              return (
                <div
                  key={time}
                  onClick={() =>
                    note ? onNoteClick(note) : onCellClick(track, snapToStep(time))
                  }
                  className="flex h-10 cursor-pointer items-center justify-center border-b border-l border-border-grid transition-colors hover:bg-card/40"
                >
                  {note && (
                    <div
                      className={`h-5 w-5 rounded-full transition-shadow ${
                        note.id === selectedNoteId ? 'ring-2 ring-white' : ''
                      }`}
                      style={{ backgroundColor: note.color }}
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

export function EditorPage() {
  const { songId } = useParams({ from: '/songs/$songId' });
  const navigate = useNavigate();

  const { currentSong, fetchSong, updateSong } = useSongStore();
  const {
    notes,
    selectedNote,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    selectNote,
    clearNotes,
  } = useNoteStore();

  const [titleDraft, setTitleDraft] = React.useState('');

  React.useEffect(() => {
    fetchSong(songId);
    fetchNotes(songId);
    return () => clearNotes();
  }, [songId, fetchSong, fetchNotes, clearNotes]);

  React.useEffect(() => {
    if (currentSong) setTitleDraft(currentSong.title);
  }, [currentSong]);

  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && currentSong && trimmed !== currentSong.title) {
      updateSong(currentSong.id, { title: trimmed });
    }
  };

  const handleCellClick = async (track: number, time: number) => {
    await createNote(songId, {
      track,
      time,
      title: `Note T${track}@${time}s`,
      color: DEFAULT_NOTE_COLOR,
    });
  };

  const handleUpdateNote = async (
    data: { title?: string; description?: string; track?: number; time?: number; color?: string },
  ) => {
    if (selectedNote) await updateNote(songId, selectedNote.id, data);
  };

  const handleDeleteNote = async () => {
    if (selectedNote) {
      await deleteNote(songId, selectedNote.id);
      selectNote(null);
    }
  };

  return (
    <div className="flex h-screen bg-primary text-text-primary">
      {/* Left sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-border-subtle bg-sidebar">
        <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
          <span className="text-lg text-accent-blue">♪</span>
          <span className="text-sm font-bold">AMA-MIDI</span>
        </div>

        <button
          type="button"
          onClick={() => navigate({ to: '/' })}
          className="mx-3 mt-3 rounded-md px-3 py-2 text-left text-xs text-text-secondary transition-colors hover:bg-card hover:text-text-primary"
        >
          ← Dashboard
        </button>

        {currentSong && (
          <div className="mt-4 border-t border-border-subtle px-4 pt-4">
            <p className="text-xs font-medium text-text-secondary">Current Song</p>
            <p className="mt-1 truncate text-sm font-semibold">{currentSong.title}</p>
            {currentSong.description && (
              <p className="mt-1 truncate text-xs text-text-secondary">
                {currentSong.description}
              </p>
            )}
          </div>
        )}

        <div className="mt-auto border-t border-border-subtle px-4 py-3">
          <p className="text-[10px] text-text-secondary">
            Tracks 1–{MAX_TRACKS} · 0–{MAX_TIME}s
          </p>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top toolbar */}
        <header className="flex items-center justify-between border-b border-border-subtle px-4 py-2">
          <input
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="max-w-xs border-none bg-transparent text-base font-semibold text-text-primary outline-none focus:ring-0"
          />

          <div className="flex items-center gap-4 text-xs text-text-secondary">
            <span>Tracks 1–{MAX_TRACKS}</span>
            <span>Time 0–{MAX_TIME}s</span>
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

      {/* Right panel — note editor */}
      {selectedNote && (
        <NotePanel
          note={selectedNote}
          onUpdate={handleUpdateNote}
          onDelete={handleDeleteNote}
        />
      )}
    </div>
  );
}
