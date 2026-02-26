import { describe, it, expect, beforeEach } from 'vitest';
import { request, createTestUser, getCsrfToken } from './helpers';

describe('Collaborators Routes', () => {
  let ownerToken: string;
  let ownerCsrf: string;
  let ownerEmail: string;
  let songId: string;
  let otherUserId: string;
  let otherEmail: string;

  beforeEach(async () => {
    const owner = await createTestUser();
    ownerToken = owner.token;
    ownerEmail = owner.email;
    ownerCsrf = await getCsrfToken(ownerToken);

    const other = await createTestUser();
    otherUserId = other.id;
    otherEmail = other.email;

    const songRes = await request('POST', '/api/songs', {
      token: ownerToken,
      csrf: ownerCsrf,
      body: { title: 'Shared Song' },
    });
    const { data } = await songRes.json() as { data: { id: string } };
    songId = data.id;
  });

  describe('POST /api/songs/:id/collaborators', () => {
    it('adds a collaborator', async () => {
      const res = await request('POST', `/api/songs/${songId}/collaborators`, {
        token: ownerToken,
        csrf: ownerCsrf,
        body: { email: otherEmail, role: 'editor' },
      });
      expect(res.status).toBe(201);
      const { data } = await res.json() as { data: { userId: string; role: string } };
      expect(data.userId).toBe(otherUserId);
      expect(data.role).toBe('editor');
    });

    it('rejects duplicate collaborator with 409', async () => {
      await request('POST', `/api/songs/${songId}/collaborators`, {
        token: ownerToken, csrf: ownerCsrf,
        body: { email: otherEmail, role: 'editor' },
      });
      const res = await request('POST', `/api/songs/${songId}/collaborators`, {
        token: ownerToken, csrf: ownerCsrf,
        body: { email: otherEmail, role: 'viewer' },
      });
      expect(res.status).toBe(409);
    });

    it('rejects adding self as collaborator with 400', async () => {
      const res = await request('POST', `/api/songs/${songId}/collaborators`, {
        token: ownerToken, csrf: ownerCsrf,
        body: { email: ownerEmail, role: 'editor' },
      });
      expect(res.status).toBe(400);
    });

    it('rejects non-owner with 403', async () => {
      const nonOwner = await createTestUser();
      const nonOwnerCsrf = await getCsrfToken(nonOwner.token);
      const someUser = await createTestUser();

      const res = await request('POST', `/api/songs/${songId}/collaborators`, {
        token: nonOwner.token,
        csrf: nonOwnerCsrf,
        body: { email: someUser.email, role: 'editor' },
      });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/songs/:id/collaborators', () => {
    it('lists collaborators', async () => {
      await request('POST', `/api/songs/${songId}/collaborators`, {
        token: ownerToken, csrf: ownerCsrf,
        body: { email: otherEmail, role: 'editor' },
      });

      const res = await request('GET', `/api/songs/${songId}/collaborators`, {
        token: ownerToken,
      });
      expect(res.status).toBe(200);
      const { data } = await res.json() as { data: Array<{ userId: string }> };
      expect(data.some((c) => c.userId === otherUserId)).toBe(true);
    });
  });

  describe('PUT /api/songs/:id/collaborators/:userId', () => {
    it('updates collaborator role', async () => {
      await request('POST', `/api/songs/${songId}/collaborators`, {
        token: ownerToken, csrf: ownerCsrf,
        body: { email: otherEmail, role: 'editor' },
      });

      const res = await request('PUT', `/api/songs/${songId}/collaborators/${otherUserId}`, {
        token: ownerToken, csrf: ownerCsrf,
        body: { role: 'viewer' },
      });
      expect(res.status).toBe(200);
      const { data } = await res.json() as { data: { role: string } };
      expect(data.role).toBe('viewer');
    });
  });

  describe('DELETE /api/songs/:id/collaborators/:userId', () => {
    it('removes a collaborator', async () => {
      await request('POST', `/api/songs/${songId}/collaborators`, {
        token: ownerToken, csrf: ownerCsrf,
        body: { email: otherEmail, role: 'editor' },
      });

      const res = await request('DELETE', `/api/songs/${songId}/collaborators/${otherUserId}`, {
        token: ownerToken, csrf: ownerCsrf,
      });
      expect(res.status).toBe(200);
    });
  });

  describe('Access control via collaboration', () => {
    it('collaborator can read notes', async () => {
      const collab = await createTestUser();
      await request('POST', `/api/songs/${songId}/collaborators`, {
        token: ownerToken, csrf: ownerCsrf,
        body: { email: collab.email, role: 'editor' },
      });

      const res = await request('GET', `/api/songs/${songId}/notes`, {
        token: collab.token,
      });
      expect(res.status).toBe(200);
    });

    it('viewer cannot create notes (403)', async () => {
      const viewer = await createTestUser();
      await request('POST', `/api/songs/${songId}/collaborators`, {
        token: ownerToken, csrf: ownerCsrf,
        body: { email: viewer.email, role: 'viewer' },
      });

      const viewerCsrf = await getCsrfToken(viewer.token);

      const res = await request('POST', `/api/songs/${songId}/notes`, {
        token: viewer.token,
        csrf: viewerCsrf,
        body: { title: 'Blocked', track: 1, time: 5.0 },
      });
      expect(res.status).toBe(403);
    });

    it('editor can create notes', async () => {
      const editor = await createTestUser();
      await request('POST', `/api/songs/${songId}/collaborators`, {
        token: ownerToken, csrf: ownerCsrf,
        body: { email: editor.email, role: 'editor' },
      });

      const editorCsrf = await getCsrfToken(editor.token);

      const res = await request('POST', `/api/songs/${songId}/notes`, {
        token: editor.token,
        csrf: editorCsrf,
        body: { title: 'Allowed', track: 1, time: Math.random() * 300 },
      });
      expect(res.status).toBe(201);
    });
  });
});
