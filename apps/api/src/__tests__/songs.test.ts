import { describe, it, expect, beforeEach } from 'vitest';
import { request, createTestUser, getCsrfToken } from './helpers';

describe('Songs Routes', () => {
  let token: string;
  let csrf: string;
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    token = user.token;
    userId = user.id;
    csrf = await getCsrfToken(token);
  });

  describe('POST /api/songs', () => {
    it('creates a song', async () => {
      const res = await request('POST', '/api/songs', {
        token,
        csrf,
        body: { title: 'Boss Battle', description: 'Epic' },
      });
      expect(res.status).toBe(201);
      const { data } = await res.json() as { data: { title: string; ownerId: string } };
      expect(data.title).toBe('Boss Battle');
      expect(data.ownerId).toBe(userId);
    });

    it('rejects without auth', async () => {
      const res = await request('POST', '/api/songs', {
        csrf,
        body: { title: 'No Auth' },
      });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/songs', () => {
    it('lists owned songs', async () => {
      await request('POST', '/api/songs', {
        token, csrf,
        body: { title: 'Song A' },
      });
      await request('POST', '/api/songs', {
        token, csrf,
        body: { title: 'Song B' },
      });

      const res = await request('GET', '/api/songs?filter=owned', { token });
      expect(res.status).toBe(200);
      const { data } = await res.json() as { data: Array<{ title: string }> };
      expect(data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /api/songs/:id', () => {
    it('returns song with counts', async () => {
      const createRes = await request('POST', '/api/songs', {
        token, csrf,
        body: { title: 'Detail Song' },
      });
      const { data: song } = await createRes.json() as { data: { id: string } };

      const res = await request('GET', `/api/songs/${song.id}`, { token });
      expect(res.status).toBe(200);
      const { data } = await res.json() as { data: { noteCount: number; collaboratorCount: number } };
      expect(data.noteCount).toBe(0);
      expect(data.collaboratorCount).toBe(0);
    });

    it('returns 404 for non-existent song', async () => {
      const res = await request('GET', '/api/songs/non-existent-id', { token });
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/songs/:id', () => {
    it('updates song title', async () => {
      const createRes = await request('POST', '/api/songs', {
        token, csrf,
        body: { title: 'Original' },
      });
      const { data: song } = await createRes.json() as { data: { id: string } };

      const res = await request('PUT', `/api/songs/${song.id}`, {
        token, csrf,
        body: { title: 'Updated' },
      });
      expect(res.status).toBe(200);
      const { data } = await res.json() as { data: { title: string } };
      expect(data.title).toBe('Updated');
    });
  });

  describe('DELETE /api/songs/:id', () => {
    it('deletes a song (owner only)', async () => {
      const createRes = await request('POST', '/api/songs', {
        token, csrf,
        body: { title: 'To Delete' },
      });
      const { data: song } = await createRes.json() as { data: { id: string } };

      const res = await request('DELETE', `/api/songs/${song.id}`, { token, csrf });
      expect(res.status).toBe(200);

      const getRes = await request('GET', `/api/songs/${song.id}`, { token });
      expect(getRes.status).toBe(404);
    });

    it('rejects delete by non-owner with 403', async () => {
      const createRes = await request('POST', '/api/songs', {
        token, csrf,
        body: { title: 'Protected' },
      });
      const { data: song } = await createRes.json() as { data: { id: string } };

      const other = await createTestUser();
      const otherCsrf = await getCsrfToken(other.token);

      const res = await request('DELETE', `/api/songs/${song.id}`, {
        token: other.token,
        csrf: otherCsrf,
      });
      expect(res.status).toBe(403);
    });
  });
});
