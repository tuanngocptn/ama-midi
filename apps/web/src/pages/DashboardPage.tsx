import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth-store';
import { useSongStore } from '@/stores/song-store';
import type { Song } from '@ama-midi/shared';

type FilterTab = 'all' | 'owned' | 'shared';

const FILTER_LABELS: Record<FilterTab, string> = {
  all: 'All Songs',
  owned: 'Owned',
  shared: 'Shared with me',
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function NoteIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path d="M15.988 3.012A2.25 2.25 0 0118 5.25v6.5A2.25 2.25 0 0115.75 14H13.5V7A2.5 2.5 0 0011 4.5H8.128a2.252 2.252 0 011.884-1.488A2.25 2.25 0 0112.25 1h1.5a2.25 2.25 0 012.238 2.012zM11.5 6A1.5 1.5 0 0010 7.5v6A1.5 1.5 0 0011.5 15h3A1.5 1.5 0 0016 13.5v-6A1.5 1.5 0 0014.5 6h-3z" />
      <path d="M2 7.5A1.5 1.5 0 013.5 6h3A1.5 1.5 0 018 7.5v6A1.5 1.5 0 016.5 15h-3A1.5 1.5 0 012 13.5v-6z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SongCard({
  song,
  onClick,
}: {
  song: Song;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer flex-col rounded-lg bg-card p-5 text-left transition-shadow hover:ring-1 hover:ring-accent-blue"
    >
      <h3 className="truncate text-lg font-semibold text-text-primary">
        {song.title}
      </h3>
      {song.description && (
        <p className="mt-1 truncate text-sm text-text-secondary">
          {song.description}
        </p>
      )}
      <div className="mt-auto flex items-center gap-4 pt-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1">
          <NoteIcon />
          {song.noteCount ?? 0}
        </span>
        <span className="flex items-center gap-1">
          <UsersIcon />
          {song.collaboratorCount ?? 0}
        </span>
        <span className="ml-auto flex items-center gap-1">
          <ClockIcon />
          {formatDate(song.updatedAt)}
        </span>
      </div>
    </button>
  );
}

function CreateSongModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (title: string, description: string) => void;
}) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim(), description.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-card p-6"
      >
        <h2 className="text-lg font-semibold text-text-primary">
          Create New Song
        </h2>

        <label className="mt-4 block text-sm text-text-secondary">
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My awesome MIDI"
            autoFocus
            required
            maxLength={200}
            className="mt-1 block w-full rounded-md border border-border-subtle bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue"
          />
        </label>

        <label className="mt-3 block text-sm text-text-secondary">
          Description (optional)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short description of this composition"
            rows={3}
            maxLength={1000}
            className="mt-1 block w-full resize-none rounded-md border border-border-subtle bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue"
          />
        </label>

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={!title.trim()} className="btn-primary">
            Create
          </button>
        </div>
      </form>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { songs, isLoading, filter, fetchSongs, createSong, setFilter } =
    useSongStore();

  const [modalOpen, setModalOpen] = React.useState(false);

  React.useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const handleCreateSong = async (title: string, description: string) => {
    await createSong(title, description || undefined);
    setModalOpen(false);
  };

  const filterTabs: FilterTab[] = ['all', 'owned', 'shared'];

  return (
    <div className="flex min-h-screen flex-col bg-primary">
      <nav className="flex h-14 shrink-0 items-center justify-between bg-sidebar px-6">
        <span className="text-lg font-bold tracking-wide text-text-primary">
          AMA-MIDI
        </span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-secondary">
            {user?.name}
          </span>
          <button
            type="button"
            onClick={logout}
            className="btn-ghost text-sm"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">My Songs</h1>
            <p className="text-sm text-text-secondary">
              Create and manage your MIDI compositions
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="btn-primary mt-3 sm:mt-0"
          >
            + Create New Song
          </button>
        </div>

        <div className="mt-6 flex gap-6 border-b border-border-subtle">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`pb-2 text-sm font-medium transition-colors ${
                filter === tab
                  ? 'border-b-2 border-accent-blue text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {FILTER_LABELS[tab]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="mt-20 text-center text-sm text-text-secondary">
            Loading songs…
          </div>
        ) : songs.length === 0 ? (
          <div className="mt-20 flex flex-col items-center gap-4 text-center">
            <p className="text-text-secondary">No songs yet</p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="btn-primary"
            >
              + Create New Song
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {songs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onClick={() => navigate({ to: `/songs/${song.id}` })}
              />
            ))}
          </div>
        )}
      </main>

      {modalOpen && (
        <CreateSongModal
          onClose={() => setModalOpen(false)}
          onSubmit={handleCreateSong}
        />
      )}
    </div>
  );
}
