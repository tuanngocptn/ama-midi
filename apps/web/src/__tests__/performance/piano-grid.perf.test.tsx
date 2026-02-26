import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { EditorPage } from '@/pages/EditorPage';
import { useAuthStore } from '@/stores/auth-store';
import { useSongStore } from '@/stores/song-store';
import { useNoteStore } from '@/stores/note-store';
import type { Note } from '@ama-midi/shared';
import { MAX_TRACKS, MAX_TIME, TOTAL_PITCHES, NOTE_COLORS } from '@ama-midi/shared';

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ songId: 'perf-song' }),
  useNavigate: () => vi.fn(),
}));

function generateNotes(count: number): Note[] {
  const notes: Note[] = [];
  let idx = 0;

  for (let track = 1; track <= MAX_TRACKS && idx < count; track++) {
    for (let pitch = 0; pitch < TOTAL_PITCHES && idx < count; pitch++) {
      for (let time = 0; time <= MAX_TIME && idx < count; time++) {
        notes.push({
          id: `note-${idx}`,
          songId: 'perf-song',
          track,
          pitch,
          time,
          title: `Note ${idx}`,
          description: null,
          color: NOTE_COLORS[idx % NOTE_COLORS.length]!,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        });
        idx++;
      }
    }
  }

  return notes.slice(0, count);
}

const noteStoreDefaults = {
  selectedNote: null,
  history: [],
  isLoading: false,
  fetchNotes: vi.fn().mockResolvedValue(undefined),
  fetchHistory: vi.fn().mockResolvedValue(undefined),
  createNote: vi.fn().mockResolvedValue(undefined),
  updateNote: vi.fn().mockResolvedValue(undefined),
  deleteNote: vi.fn().mockResolvedValue(undefined),
  selectNote: vi.fn(),
  clearNotes: vi.fn(),
  applyWsMessage: vi.fn(),
};

describe('Piano Grid Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'user-1', email: 'perf@test.com', name: 'Perf Tester' },
      token: 'tok',
      isLoading: false,
    });
    useSongStore.setState({
      songs: [],
      currentSong: {
        id: 'perf-song',
        title: 'Performance Test Song',
        description: null,
        ownerId: 'user-1',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        noteCount: 0,
        collaboratorCount: 0,
      },
      isLoading: false,
      fetchSong: vi.fn().mockResolvedValue(undefined),
      fetchSongs: vi.fn().mockResolvedValue(undefined),
      updateSong: vi.fn().mockResolvedValue(undefined),
      createSong: vi.fn().mockResolvedValue({ id: 'new', title: 'New' }),
    } as never);
  });

  it('renders with 100 notes under 200ms', () => {
    const notes = generateNotes(100);
    useNoteStore.setState({ notes, ...noteStoreDefaults } as never);

    const start = performance.now();
    render(<EditorPage />);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(200);
  });

  it('renders with 1,000 notes under 300ms', () => {
    const notes = generateNotes(1000);
    useNoteStore.setState({ notes, ...noteStoreDefaults } as never);

    const start = performance.now();
    render(<EditorPage />);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(300);
  });

  it('renders with 10,000 notes under 500ms', () => {
    const notes = generateNotes(10_000);
    useNoteStore.setState({ notes, ...noteStoreDefaults } as never);

    const start = performance.now();
    render(<EditorPage />);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(500);
    expect(notes.length).toBe(10_000);
  });

  it('note count display shows correct count with large datasets', () => {
    const notes = generateNotes(10_000);
    useNoteStore.setState({ notes, ...noteStoreDefaults } as never);

    const { getByText } = render(<EditorPage />);
    expect(getByText('10000 notes')).toBeInTheDocument();
  });
});
