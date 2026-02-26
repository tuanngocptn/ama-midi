import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardPage } from '@/pages/DashboardPage';
import { useAuthStore } from '@/stores/auth-store';
import { useSongStore } from '@/stores/song-store';
import type { Song } from '@ama-midi/shared';

const navigateMock = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}));

const makeSong = (overrides: Partial<Song> = {}): Song => ({
  id: 'song-1',
  title: 'Test Song',
  description: 'A description',
  ownerId: 'user-1',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  noteCount: 3,
  collaboratorCount: 1,
  ...overrides,
});

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'user-1', email: 'a@b.com', name: 'Alice' },
      token: 'tok',
      isLoading: false,
    });
    useSongStore.setState({
      songs: [],
      currentSong: null,
      isLoading: false,
      filter: 'all',
      fetchSongs: vi.fn().mockResolvedValue(undefined),
      createSong: vi.fn().mockResolvedValue(makeSong()),
      setFilter: vi.fn(),
    } as never);
  });

  it('renders nav with user name and logout button', () => {
    render(<DashboardPage />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
  });

  it('calls logout when button clicked', async () => {
    const logoutMock = vi.fn();
    useAuthStore.setState({ logout: logoutMock } as never);

    const user = userEvent.setup();
    render(<DashboardPage />);

    await user.click(screen.getByRole('button', { name: 'Logout' }));

    expect(logoutMock).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    useSongStore.setState({ isLoading: true } as never);
    render(<DashboardPage />);

    expect(screen.getByText(/loading songs/i)).toBeInTheDocument();
  });

  it('shows empty state when no songs', () => {
    render(<DashboardPage />);

    expect(screen.getByText('No songs yet')).toBeInTheDocument();
  });

  it('renders song cards when songs exist', () => {
    const songs = [
      makeSong({ id: 's1', title: 'First Song' }),
      makeSong({ id: 's2', title: 'Second Song' }),
    ];
    useSongStore.setState({ songs } as never);

    render(<DashboardPage />);

    expect(screen.getByText('First Song')).toBeInTheDocument();
    expect(screen.getByText('Second Song')).toBeInTheDocument();
  });

  it('navigates to song editor when card clicked', async () => {
    const songs = [makeSong({ id: 'nav-song' })];
    useSongStore.setState({ songs } as never);

    const user = userEvent.setup();
    render(<DashboardPage />);

    await user.click(screen.getByText('Test Song'));

    expect(navigateMock).toHaveBeenCalledWith({ to: '/songs/nav-song' });
  });

  it('renders filter tabs', () => {
    render(<DashboardPage />);

    expect(screen.getByRole('button', { name: 'All Songs' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Owned' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Shared with me' })).toBeInTheDocument();
  });

  it('calls setFilter when tab clicked', async () => {
    const setFilterMock = vi.fn();
    useSongStore.setState({ setFilter: setFilterMock } as never);

    const user = userEvent.setup();
    render(<DashboardPage />);

    await user.click(screen.getByRole('button', { name: 'Owned' }));

    expect(setFilterMock).toHaveBeenCalledWith('owned');
  });

  it('opens create modal and submits', async () => {
    const createSongMock = vi.fn().mockResolvedValue(makeSong());
    useSongStore.setState({ createSong: createSongMock } as never);

    const user = userEvent.setup();
    render(<DashboardPage />);

    const createButtons = screen.getAllByRole('button', { name: /create new song/i });
    await user.click(createButtons[0]);

    const modal = screen.getByText('Create New Song').closest('form')!;
    const titleInput = within(modal).getByPlaceholderText('My awesome MIDI');
    await user.type(titleInput, 'My Song');
    await user.click(within(modal).getByRole('button', { name: 'Create' }));

    expect(createSongMock).toHaveBeenCalledWith('My Song', undefined);
  });

  it('calls fetchSongs on mount', () => {
    const fetchSongsMock = vi.fn().mockResolvedValue(undefined);
    useSongStore.setState({ fetchSongs: fetchSongsMock } as never);

    render(<DashboardPage />);

    expect(fetchSongsMock).toHaveBeenCalled();
  });
});
