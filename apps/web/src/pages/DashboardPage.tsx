import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth-store';
import { useSongStore } from '@/stores/song-store';
import { CreateSongModal } from '@/components/CreateSongModal';
import { TwoFactorModal } from '@/components/TwoFactorModal';
import type { Song } from '@ama-midi/shared';

type FilterTab = 'all' | 'shared' | 'recent';
type SortKey = 'modified' | 'title' | 'notes';

const FILTER_LABELS: Record<FilterTab, string> = {
  all: 'All Songs',
  shared: 'Shared with me',
  recent: 'Recent',
};

const SORT_LABELS: Record<SortKey, string> = {
  modified: 'Last modified',
  title: 'Title (A–Z)',
  notes: 'Most notes',
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `Modified ${diffHours}h ago`;
  if (diffDays === 1) return 'Modified 1d ago';
  if (diffDays < 7) return `Modified ${diffDays}d ago`;
  if (diffDays < 30) return `Modified ${Math.floor(diffDays / 7)}w ago`;
  return `Modified ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M15.988 3.012A2.25 2.25 0 0118 5.25v6.5A2.25 2.25 0 0115.75 14H13.5V7A2.5 2.5 0 0011 4.5H8.128a2.252 2.252 0 011.884-1.488A2.25 2.25 0 0112.25 1h1.5a2.25 2.25 0 012.238 2.012zM11.5 6A1.5 1.5 0 0010 7.5v6A1.5 1.5 0 0011.5 15h3A1.5 1.5 0 0016 13.5v-6A1.5 1.5 0 0014.5 6h-3z" />
      <path d="M2 7.5A1.5 1.5 0 013.5 6h3A1.5 1.5 0 018 7.5v6A1.5 1.5 0 016.5 15h-3A1.5 1.5 0 012 13.5v-6z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
    </svg>
  );
}

function EllipsisIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path d="M3 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM8.5 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM15.5 8.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path fillRule="evenodd" d="M10 2a6 6 0 00-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 00.515 1.076 32.91 32.91 0 003.256.508 3.5 3.5 0 006.972 0 32.903 32.903 0 003.256-.508.75.75 0 00.515-1.076A11.448 11.448 0 0116 8a6 6 0 00-6-6zM8.05 14.943a33.54 33.54 0 003.9 0 2 2 0 01-3.9 0z" clipRule="evenodd" />
    </svg>
  );
}

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-blue text-xs font-bold text-white">
      {initials}
    </div>
  );
}

function SongThumbnail({ songId, noteCount }: { songId: string; noteCount: number }) {
  const dots = React.useMemo(() => {
    let hash = 0;
    for (let i = 0; i < songId.length; i++) {
      hash = (hash * 31 + songId.charCodeAt(i)) | 0;
    }
    const colors = ['#3B82F6', '#EF4444', '#22C55E', '#A855F7', '#EAB308', '#EC4899', '#06B6D4', '#F97316'];
    const count = Math.min(Math.max(noteCount, 3), 20);
    const result: { cx: number; cy: number; color: string }[] = [];
    for (let i = 0; i < count; i++) {
      hash = (hash * 1103515245 + 12345) | 0;
      const cx = 10 + (Math.abs(hash) % 280);
      hash = (hash * 1103515245 + 12345) | 0;
      const cy = 8 + (Math.abs(hash) % 64);
      hash = (hash * 1103515245 + 12345) | 0;
      const color = colors[Math.abs(hash) % colors.length] ?? '#3B82F6';
      result.push({ cx, cy, color });
    }
    return result;
  }, [songId, noteCount]);

  return (
    <svg viewBox="0 0 300 80" className="h-full w-full" preserveAspectRatio="none">
      {/* Grid lines */}
      {[0, 37.5, 75, 112.5, 150, 187.5, 225, 262.5].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2="80" stroke="#374151" strokeWidth="0.5" />
      ))}
      {[0, 20, 40, 60].map((y) => (
        <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="#374151" strokeWidth="0.5" />
      ))}
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r="3.5" fill={d.color} opacity="0.85" />
      ))}
      {dots.length > 2 && (
        <polyline
          points={dots.map((d) => `${d.cx},${d.cy}`).join(' ')}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="0.8"
          opacity="0.3"
        />
      )}
    </svg>
  );
}

function SongCard({
  song,
  onClick,
  onRename,
  onDelete,
}: {
  song: Song;
  onClick: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <div className="group relative flex w-full cursor-pointer flex-col rounded-lg bg-card transition-shadow hover:ring-1 hover:ring-accent-blue">
      {/* Thumbnail */}
      <div className="relative h-[100px] overflow-hidden rounded-t-lg bg-primary/50" onClick={onClick}>
        <SongThumbnail songId={song.id} noteCount={song.noteCount ?? 0} />
        {/* Three-dot menu */}
        <div ref={menuRef} className="absolute right-2 top-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="rounded-md p-1 text-text-secondary opacity-0 transition-opacity hover:bg-card hover:text-text-primary group-hover:opacity-100"
            aria-label="Song options"
          >
            <EllipsisIcon />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-20 mt-1 w-36 rounded-md border border-border-subtle bg-sidebar py-1 shadow-lg">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onRename(); }}
                className="block w-full px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-card hover:text-text-primary"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
                className="block w-full px-3 py-1.5 text-left text-sm text-accent-red hover:bg-card"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4" onClick={onClick}>
        <h3 className="truncate text-base font-semibold text-text-primary">{song.title}</h3>
        {song.description && (
          <p className="mt-1 truncate text-sm text-text-secondary">{song.description}</p>
        )}
        <div className="mt-auto flex items-center gap-4 pt-3 text-xs text-text-secondary">
          <span className="flex items-center gap-1"><NoteIcon /> {song.noteCount ?? 0} notes</span>
          <span className="flex items-center gap-1"><UsersIcon /> {song.collaboratorCount ?? 0} collaborators</span>
          <span className="ml-auto flex items-center gap-1"><ClockIcon /> {formatDate(song.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}

function RenameSongModal({
  song,
  onClose,
  onSubmit,
}: {
  song: Song;
  onClose: () => void;
  onSubmit: (title: string) => void;
}) {
  const [title, setTitle] = React.useState(song.title);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) onSubmit(title.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-card p-6"
      >
        <h2 className="text-lg font-semibold text-text-primary">Rename Song</h2>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          required
          maxLength={200}
          className="mt-4 w-full rounded-md border border-border-subtle bg-input px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue"
        />
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={!title.trim()} className="btn-primary">Save</button>
        </div>
      </form>
    </div>
  );
}

function DeleteConfirmModal({
  song,
  onClose,
  onConfirm,
}: {
  song: Song;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-lg bg-card p-6">
        <h2 className="text-lg font-semibold text-text-primary">Delete Song</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Are you sure you want to delete &ldquo;{song.title}&rdquo;? This action cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="button" onClick={onConfirm} className="btn-danger">Delete</button>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { songs, isLoading, fetchSongs, createSong, updateSong, deleteSong, setFilter } =
    useSongStore();

  const [modalOpen, setModalOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortKey, setSortKey] = React.useState<SortKey>('modified');
  const [sortDropdownOpen, setSortDropdownOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [activeFilter, setActiveFilter] = React.useState<FilterTab>('all');

  const [renamingSong, setRenamingSong] = React.useState<Song | null>(null);
  const [deletingSong, setDeletingSong] = React.useState<Song | null>(null);
  const [twoFactorOpen, setTwoFactorOpen] = React.useState(false);

  const sortDropdownRef = React.useRef<HTMLDivElement>(null);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  React.useEffect(() => {
    if (!sortDropdownOpen && !userMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setSortDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sortDropdownOpen, userMenuOpen]);

  const handleFilterChange = (tab: FilterTab) => {
    setActiveFilter(tab);
    if (tab === 'all' || tab === 'recent') {
      setFilter('all');
    } else {
      setFilter('shared');
    }
  };

  const filteredAndSortedSongs = React.useMemo(() => {
    let result = [...songs];

    if (activeFilter === 'recent') {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      result = result.filter((s) => new Date(s.updatedAt).getTime() > weekAgo);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q)),
      );
    }

    switch (sortKey) {
      case 'modified':
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'notes':
        result.sort((a, b) => (b.noteCount ?? 0) - (a.noteCount ?? 0));
        break;
    }

    return result;
  }, [songs, activeFilter, searchQuery, sortKey]);

  const handleCreateSong = async (title: string, description: string) => {
    await createSong(title, description || undefined);
    setModalOpen(false);
  };

  const handleRenameSong = async (title: string) => {
    if (renamingSong) {
      await updateSong(renamingSong.id, { title });
      setRenamingSong(null);
    }
  };

  const handleDeleteSong = async () => {
    if (deletingSong) {
      await deleteSong(deletingSong.id);
      setDeletingSong(null);
    }
  };

  const filterTabs: FilterTab[] = ['all', 'shared', 'recent'];

  return (
    <div className="flex min-h-screen flex-col bg-primary">
      {/* Navbar */}
      <nav className="flex h-14 shrink-0 items-center justify-between bg-sidebar px-6">
        <button type="button" onClick={() => navigate({ to: '/' })} className="text-xl font-black italic tracking-tight text-text-primary transition-opacity hover:opacity-80">
          AMA-MIDI
        </button>

        {/* Search */}
        <div className="hidden w-full max-w-md px-8 md:block">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
              <SearchIcon />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs..."
              className="w-full rounded-md border border-border-subtle bg-input py-1.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <button type="button" className="text-text-secondary transition-colors hover:text-text-primary" aria-label="Notifications">
            <BellIcon />
          </button>
          <div ref={userMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-card"
            >
              <UserAvatar name={user?.name ?? '?'} />
              <span className="hidden text-sm text-text-primary sm:inline">{user?.name}</span>
              <ChevronDownIcon />
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 z-30 mt-1 w-40 rounded-md border border-border-subtle bg-sidebar py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => { setUserMenuOpen(false); setTwoFactorOpen(true); }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-card hover:text-text-primary"
                >
                  Security
                </button>
                <button
                  type="button"
                  onClick={() => { setUserMenuOpen(false); logout(); }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-card hover:text-text-primary"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {/* Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">My Songs</h1>
            <p className="text-sm text-text-secondary">Manage your MIDI compositions</p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="btn-primary mt-3 sm:mt-0"
          >
            + Create New Song
          </button>
        </div>

        {/* Tabs + Sort */}
        <div className="mt-6 flex items-end justify-between border-b border-border-subtle">
          <div className="flex gap-6">
            {filterTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleFilterChange(tab)}
                className={`pb-2 text-sm font-medium transition-colors ${
                  activeFilter === tab
                    ? 'border-b-2 border-accent-blue text-text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {FILTER_LABELS[tab]}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div ref={sortDropdownRef} className="relative pb-2">
            <button
              type="button"
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
              className="flex items-center gap-1 rounded-md border border-border-subtle px-3 py-1 text-xs text-text-secondary transition-colors hover:text-text-primary"
            >
              Sort by: {SORT_LABELS[sortKey]}
              <ChevronDownIcon />
            </button>
            {sortDropdownOpen && (
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-border-subtle bg-sidebar py-1 shadow-lg">
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setSortKey(key); setSortDropdownOpen(false); }}
                    className={`block w-full px-3 py-1.5 text-left text-sm ${
                      sortKey === key ? 'text-accent-blue' : 'text-text-secondary hover:text-text-primary'
                    } hover:bg-card`}
                  >
                    {SORT_LABELS[key]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mobile search */}
        <div className="mt-4 md:hidden">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
              <SearchIcon />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs..."
              className="w-full rounded-md border border-border-subtle bg-input py-1.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue"
            />
          </div>
        </div>

        {/* Song grid */}
        {isLoading ? (
          <div className="mt-20 text-center text-sm text-text-secondary">Loading songs…</div>
        ) : filteredAndSortedSongs.length === 0 ? (
          <div className="mt-20 flex flex-col items-center gap-4 text-center">
            <p className="text-text-secondary">
              {searchQuery ? 'No songs match your search' : 'No songs yet'}
            </p>
            {!searchQuery && (
              <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
                + Create New Song
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedSongs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onClick={() => navigate({ to: `/songs/${song.id}` })}
                onRename={() => setRenamingSong(song)}
                onDelete={() => setDeletingSong(song)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {modalOpen && (
        <CreateSongModal onClose={() => setModalOpen(false)} onSubmit={handleCreateSong} />
      )}
      {renamingSong && (
        <RenameSongModal
          song={renamingSong}
          onClose={() => setRenamingSong(null)}
          onSubmit={handleRenameSong}
        />
      )}
      {deletingSong && (
        <DeleteConfirmModal
          song={deletingSong}
          onClose={() => setDeletingSong(null)}
          onConfirm={handleDeleteSong}
        />
      )}
      {twoFactorOpen && (
        <TwoFactorModal onClose={() => setTwoFactorOpen(false)} />
      )}
    </div>
  );
}
