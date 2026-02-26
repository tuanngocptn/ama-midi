import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthPage } from '@/pages/AuthPage';
import { useAuthStore } from '@/stores/auth-store';
import { ApiHttpError } from '@/lib/api';

describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      token: null,
      isLoading: false,
    });
  });

  const submitButton = () =>
    screen.getAllByRole('button').find((btn) => btn.getAttribute('type') === 'submit')!;

  it('renders sign-in form by default', () => {
    render(<AuthPage />);

    expect(screen.getByText('AMA-MIDI')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    expect(submitButton()).toHaveTextContent('Sign In');
  });

  it('switches to sign-up form showing name field', async () => {
    const user = userEvent.setup();
    render(<AuthPage />);

    const tabButtons = screen.getAllByRole('button', { name: 'Sign Up' });
    await user.click(tabButtons[0]!);

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('calls login on sign-in submit', async () => {
    const loginMock = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ login: loginMock } as never);

    const user = userEvent.setup();
    render(<AuthPage />);

    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(submitButton());

    expect(loginMock).toHaveBeenCalledWith('a@b.com', 'secret');
  });

  it('calls register on sign-up submit', async () => {
    const registerMock = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ register: registerMock } as never);

    const user = userEvent.setup();
    render(<AuthPage />);

    const tabButtons = screen.getAllByRole('button', { name: 'Sign Up' });
    await user.click(tabButtons[0]!);
    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Name'), 'Alice');
    await user.type(screen.getByLabelText('Password'), 'pass');
    await user.click(submitButton());

    expect(registerMock).toHaveBeenCalledWith('a@b.com', 'Alice', 'pass');
  });

  it('shows loading text while submitting', () => {
    useAuthStore.setState({ isLoading: true });
    render(<AuthPage />);

    expect(submitButton()).toHaveTextContent(/signing in/i);
  });

  it('displays ApiHttpError message', async () => {
    const loginMock = vi.fn().mockRejectedValue(
      new ApiHttpError(401, 'Invalid credentials', 'UNAUTHORIZED'),
    );
    useAuthStore.setState({ login: loginMock } as never);

    const user = userEvent.setup();
    render(<AuthPage />);

    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(submitButton());

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });

  it('displays generic error for non-ApiHttpError', async () => {
    const loginMock = vi.fn().mockRejectedValue(new Error('boom'));
    useAuthStore.setState({ login: loginMock } as never);

    const user = userEvent.setup();
    render(<AuthPage />);

    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Password'), 'x');
    await user.click(submitButton());

    expect(await screen.findByText('An unexpected error occurred')).toBeInTheDocument();
  });

  it('resets form fields when switching tabs', async () => {
    const user = userEvent.setup();
    render(<AuthPage />);

    await user.type(screen.getByLabelText('Email'), 'test@test.com');
    const tabButtons = screen.getAllByRole('button', { name: 'Sign Up' });
    await user.click(tabButtons[0]!);

    expect(screen.getByLabelText('Email')).toHaveValue('');
  });
});
