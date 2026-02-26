import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api, ApiHttpError } from '@/lib/api';

type Stage = 'idle' | 'setup' | 'verify';

export function TwoFactorModal({ onClose }: { onClose: () => void }) {
  const [stage, setStage] = React.useState<Stage>('idle');
  const [secret, setSecret] = React.useState('');
  const [uri, setUri] = React.useState('');
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const handleSetup = async () => {
    setError('');
    try {
      const res = await api.post<{ secret: string; uri: string }>('/auth/2fa/setup');
      setSecret(res.secret);
      setUri(res.uri);
      setStage('setup');
    } catch (err) {
      if (err instanceof ApiHttpError) setError(err.message);
      else setError('Failed to start 2FA setup');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/2fa/verify-setup', { code });
      setSuccess('Two-factor authentication has been enabled.');
      setStage('idle');
      setCode('');
    } catch (err) {
      if (err instanceof ApiHttpError) setError(err.message);
      else setError('Invalid code. Try again.');
    }
  };

  const handleDisable = async () => {
    setError('');
    try {
      await api.post('/auth/2fa/disable');
      setSuccess('Two-factor authentication has been disabled.');
    } catch (err) {
      if (err instanceof ApiHttpError) setError(err.message);
      else setError('Failed to disable 2FA');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg bg-card p-6">
        <h2 className="text-lg font-semibold text-text-primary">Security Settings</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Protect your account with two-factor authentication (TOTP).
        </p>

        {success && (
          <div className="mt-4 rounded-md bg-accent-green/10 px-3 py-2 text-sm text-accent-green">
            {success}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md bg-accent-red/10 px-3 py-2 text-sm text-accent-red">
            {error}
          </div>
        )}

        {stage === 'idle' && (
          <div className="mt-4 flex flex-col gap-3">
            <button type="button" onClick={handleSetup} className="btn-primary w-full text-sm">
              Enable 2FA
            </button>
            <button type="button" onClick={handleDisable} className="btn-danger w-full text-sm">
              Disable 2FA
            </button>
          </div>
        )}

        {stage === 'setup' && (
          <div className="mt-4">
            <p className="text-sm text-text-secondary">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
            </p>
            <div className="mt-3 flex justify-center">
              <div className="rounded-lg bg-white p-3">
                <QRCodeSVG value={uri} size={180} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xs text-text-secondary">Or enter this secret manually:</p>
              <p className="mt-1 font-mono text-sm tracking-wider text-accent-blue">{secret}</p>
            </div>

            <form onSubmit={handleVerify} className="mt-4">
              <label htmlFor="verify-code" className="mb-1 block text-sm text-text-secondary">
                Enter the 6-digit code to verify setup:
              </label>
              <input
                id="verify-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full text-center text-lg tracking-[0.3em]"
              />
              <button type="submit" disabled={code.length !== 6} className="btn-primary mt-3 w-full text-sm">
                Verify & Enable
              </button>
              <button type="button" onClick={() => setStage('idle')} className="btn-ghost mt-2 w-full text-sm">
                Cancel
              </button>
            </form>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className="btn-ghost text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}
