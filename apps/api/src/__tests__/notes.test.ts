import { describe, it, expect, beforeEach } from 'vitest';
import { request, createTestUser, getCsrfToken } from './helpers';

describe('Notes Routes', () => {
  let token: string;
  let csrf: string;
  let songId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    token = user.token;
    csrf = await getCsrfToken(token);

    const songRes = await request('POST', '/api/songs', {
      token, csrf,
      body: { title: `Test Song ${crypto.randomUUID().slice(0, 8)}` },
    });
    const { data } = await songRes.json() as { data: { id: string } };
    songId = data.id;
  });

  describe('POST /api/songs/:id/notes', () => {
    it('creates a note', async () => {
      const res = await request('POST', `/api/songs/${songId}/notes`, {
        token, csrf,
        body: { title: 'Kick', track: 1, time: 5.0, color: '#EF4444' },
      });
      expect(res.status).toBe(201);
      const { data } = await res.json() as { data: { track: number; time: number } };
      expect(data.track).toBe(1);
      expect(data.time).toBe(5.0);
    });

    it('rejects duplicate position with 409', async () => {
      const time = Math.floor(Math.random() * 100);
      await request('POST', `/api/songs/${songId}/notes`, {
        token, csrf,
        body: { title: 'First', track: 1, time },
      });
      const res = await request('POST', `/api/songs/${songId}/notes`, {
        token, csrf,
        body: { title: 'Duplicate', track: 1, time },
      });
      expect(res.status).toBe(409);
    });

    it('allows same track, different time', async () => {
      await request('POST', `/api/songs/${songId}/notes`, {
        token, csrf,
        body: { title: 'Note1', track: 2, time: 100 },
      });
      const res = await request('POST', `/api/songs/${songId}/notes`, {
        token, csrf,
        body: { title: 'Note2', track: 2, time: 110 },
      });
      expect(res.status).toBe(201);
    });

    it('rejects track out of range with 400', async () => {
      const res = await request('POST', `/api/songs/${songId}/notes`, {
        token, csrf,
        body: { title: 'Bad', track: 9, time: 5.0 },
      });
      expect(res.status).toBe(400);
    });

    it('rejects time > 300 with 400', async () => {
      const res = await request('POST', `/api/songs/${songId}/notes`, {
        token, csrf,
        body: { title: 'Bad', track: 1, time: 301 },
      });
      expect(res.status).toBe(400);
    });

    it('rejects time < 0 with 400', async () => {
      const res = await request('POST', `/api/songs/${songId}/notes`, {
        token, csrf,
        body: { title: 'Bad', track: 1, time: -1 },
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/songs/:id/notes', () => {
    it('lists all notes for a song', async () => {
      await request('POST', `/api/songs/${songId}/notes`, {
        token, csrf,
        body: { title: 'A', track: 3, time: 200 },
      });
      await request('POST', `/api/songs/${songId}/notes`, {
        token, csrf,
        body: { title: 'B', track: 4, time: 210 },
      });

      const res = await request('GET', `/api/songs/${songId}/notes`, { token });
      expect(res.status).toBe(200);
      const { data } = await res.json() as { data: unknown[] };
      expect(data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('PUT /api/songs/:id/notes/:noteId', () => {
    it('updates a note', async () => {
      const createRes = await request('POST', `/api/songs/${songId}/notes`, {
        token, csrf,
        body: { title: 'Original', track: 5, time: 50 },
      });
      const { data: note } = await createRes.json() as { data: { id: string } };

      const res = await request('PUT', `/api/songs/${songId}/notes/${note.id}`, {
        token, csrf,
        body: { title: 'Updated', color: '#22C55E' },
      });
      expect(res.status).toBe(200);
      const { data } = await res.json() as { data: { title: string; color: string } };
      expect(data.title).toBe('Updated');
      expect(data.color).toBe('#22C55E');
    });

    it('rejects move to occupied position with 409', async () => {
      await request('POST', `/api/songs/${songId}/notes`, {
        token, csrf,
        body: { title: 'Occupant', track: 6, time: 60 },
      });
      const createRes = await request('POST', `/api/songs/${songId}/notes`, {
        token, csrf,
        body: { title: 'Mover', track: 7, time: 70 },
      });
      const { data: note } = await createRes.json() as { data: { id: string } };

      const res = await request('PUT', `/api/songs/${songId}/notes/${note.id}`, {
        token, csrf,
        body: { track: 6, time: 60 },
      });
      expect(res.status).toBe(409);
    });
  });

  describe('DELETE /api/songs/:id/notes/:noteId', () => {
    it('deletes a note', async () => {
      const createRes = await request('POST', `/api/songs/${songId}/notes`, {
        token, csrf,
        body: { title: 'ToDelete', track: 8, time: 80 },
      });
      const { data: note } = await createRes.json() as { data: { id: string } };

      const res = await request('DELETE', `/api/songs/${songId}/notes/${note.id}`, {
        token, csrf,
      });
      expect(res.status).toBe(200);
    });

    it('returns 404 for non-existent note', async () => {
      const res = await request('DELETE', `/api/songs/${songId}/notes/non-existent`, {
        token, csrf,
      });
      expect(res.status).toBe(404);
    });
  });
});
