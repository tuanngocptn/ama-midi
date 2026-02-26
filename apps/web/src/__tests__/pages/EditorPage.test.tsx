import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorPage } from '@/pages/EditorPage';
import { useAuthStore } from '@/stores/auth-store';
import { useSongStore } from '@/stores/song-store';
import { useNoteStore } from '@/stores/note-store';
import type { Note } from '@ama-midi/shared';

const navigateMock = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ songId: 'test-song-id' }),
  useNavigate: () => navigateMock,
}));

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'note-1',
  songId: 'test-song-id',
  track: 1,
  time: 0,
  title: 'Test Note',
  description: null,
  color: '#3B82F6',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('EditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'user-1', email: 'a@b.com', name: 'Alice' },
      token: 'tok',
      isLoading: false,
    });
    useSongStore.setState({
      songs: [],
      currentSong: {
        id: 'test-song-id',
        title: 'My Song',
        description: 'A test song',
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
      createSong: vi.fn().mockResolvedValue({ id: 'new-song', title: 'New' }),
    } as never);
    useNoteStore.setState({
      notes: [],
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
    } as never);
  });

  it('renders the song title in toolbar', () => {
    render(<EditorPage />);
    const titleInput = screen.getByDisplayValue('My Song');
    expect(titleInput).toBeInTheDocument();
  });

  it('renders the left sidebar with song list section', () => {
    render(<EditorPage />);
    expect(screen.getByText('Songs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new song/i })).toBeInTheDocument();
  });

  it('displays user name in sidebar', () => {
    render(<EditorPage />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders track headers', () => {
    render(<EditorPage />);
    for (let i = 1; i <= 8; i++) {
      expect(screen.getByText(`Track ${i}`)).toBeInTheDocument();
    }
  });

  it('shows note count in toolbar', () => {
    useNoteStore.setState({ notes: [makeNote()] } as never);
    render(<EditorPage />);
    expect(screen.getByText('1 notes')).toBeInTheDocument();
  });

  it('fetches song and notes on mount', () => {
    const fetchSong = vi.fn().mockResolvedValue(undefined);
    const fetchNotes = vi.fn().mockResolvedValue(undefined);
    const fetchHistory = vi.fn().mockResolvedValue(undefined);
    useSongStore.setState({ fetchSong } as never);
    useNoteStore.setState({ fetchNotes, fetchHistory } as never);

    render(<EditorPage />);

    expect(fetchSong).toHaveBeenCalledWith('test-song-id');
    expect(fetchNotes).toHaveBeenCalledWith('test-song-id');
    expect(fetchHistory).toHaveBeenCalledWith('test-song-id');
  });

  it('shows note edit panel when a note is selected', () => {
    const note = makeNote();
    useNoteStore.setState({ selectedNote: note, notes: [note] } as never);

    render(<EditorPage />);

    expect(screen.getByText('Edit Note')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Test Note');
  });

  it('does not show note edit panel when no note selected', () => {
    render(<EditorPage />);
    expect(screen.queryByText('Edit Note')).not.toBeInTheDocument();
  });

  it('renders Save, Share, Undo, and Redo buttons', () => {
    render(<EditorPage />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /redo/i })).toBeInTheDocument();
  });

  it('calls deleteNote when delete button clicked', async () => {
    const note = makeNote();
    const deleteNoteMock = vi.fn().mockResolvedValue(undefined);
    const selectNoteMock = vi.fn();
    useNoteStore.setState({
      selectedNote: note,
      notes: [note],
      deleteNote: deleteNoteMock,
      selectNote: selectNoteMock,
    } as never);

    const user = userEvent.setup();
    render(<EditorPage />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(deleteNoteMock).toHaveBeenCalledWith('test-song-id', 'note-1');
  });

  it('renders description placeholder in toolbar', () => {
    useSongStore.setState({
      currentSong: {
        id: 'test-song-id',
        title: 'My Song',
        description: null,
        ownerId: 'user-1',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        noteCount: 0,
        collaboratorCount: 0,
      },
    } as never);

    render(<EditorPage />);
    expect(screen.getByPlaceholderText('Add description...')).toBeInTheDocument();
  });
});
