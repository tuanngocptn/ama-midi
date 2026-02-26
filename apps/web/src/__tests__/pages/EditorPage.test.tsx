import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorPage } from '@/pages/EditorPage';
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
    useSongStore.setState({
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
      updateSong: vi.fn().mockResolvedValue(undefined),
    } as never);
    useNoteStore.setState({
      notes: [],
      selectedNote: null,
      history: [],
      isLoading: false,
      fetchNotes: vi.fn().mockResolvedValue(undefined),
      createNote: vi.fn().mockResolvedValue(undefined),
      updateNote: vi.fn().mockResolvedValue(undefined),
      deleteNote: vi.fn().mockResolvedValue(undefined),
      selectNote: vi.fn(),
      clearNotes: vi.fn(),
      fetchHistory: vi.fn().mockResolvedValue(undefined),
      applyWsMessage: vi.fn(),
    } as never);
  });

  it('renders the song title in toolbar', () => {
    render(<EditorPage />);

    const titleInput = screen.getByDisplayValue('My Song');
    expect(titleInput).toBeInTheDocument();
  });

  it('renders the left sidebar with dashboard link', () => {
    render(<EditorPage />);

    expect(screen.getByText('← Dashboard')).toBeInTheDocument();
  });

  it('navigates to dashboard when link clicked', async () => {
    const user = userEvent.setup();
    render(<EditorPage />);

    await user.click(screen.getByText('← Dashboard'));

    expect(navigateMock).toHaveBeenCalledWith({ to: '/' });
  });

  it('displays current song info in sidebar', () => {
    render(<EditorPage />);

    expect(screen.getByText('My Song')).toBeInTheDocument();
    expect(screen.getByText('A test song')).toBeInTheDocument();
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
    useSongStore.setState({ fetchSong } as never);
    useNoteStore.setState({ fetchNotes } as never);

    render(<EditorPage />);

    expect(fetchSong).toHaveBeenCalledWith('test-song-id');
    expect(fetchNotes).toHaveBeenCalledWith('test-song-id');
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

  it('calls updateNote when note edit form submitted', async () => {
    const note = makeNote();
    const updateNoteMock = vi.fn().mockResolvedValue(undefined);
    useNoteStore.setState({
      selectedNote: note,
      notes: [note],
      updateNote: updateNoteMock,
    } as never);

    const user = userEvent.setup();
    render(<EditorPage />);

    const titleInput = screen.getByLabelText('Title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title');
    await user.click(screen.getByRole('button', { name: 'Update' }));

    expect(updateNoteMock).toHaveBeenCalledWith(
      'test-song-id',
      'note-1',
      expect.objectContaining({ title: 'Updated Title' }),
    );
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

  it('commits title on blur', async () => {
    const updateSongMock = vi.fn().mockResolvedValue(undefined);
    useSongStore.setState({ updateSong: updateSongMock } as never);

    const user = userEvent.setup();
    render(<EditorPage />);

    const titleInput = screen.getByDisplayValue('My Song');
    await user.clear(titleInput);
    await user.type(titleInput, 'New Title');
    await user.tab();

    expect(updateSongMock).toHaveBeenCalledWith('test-song-id', { title: 'New Title' });
  });
});
