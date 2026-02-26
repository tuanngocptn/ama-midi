import { describe, it, expect, beforeEach } from 'vitest';
import { request, createTestUser, getCsrfToken } from './helpers';

describe('History Routes', () => {
  let token: string;
  let csrf: string;
  let songId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    token = user.token;
    csrf = await getCsrfToken(token);

    const songRes = await request('POST', '/api/songs', {
      token, csrf,
      body: { title: `History Song ${crypto.randomUUID().slice(0, 8)}` },
    });
    const { data } = await songRes.json() as { data: { id: string } };
    songId = data.id;
  });

  it('records CREATE events', async () => {
    await request('POST', `/api/songs/${songId}/notes`, {
      token, csrf,
      body: { title: 'Note1', track: 1, time: 5.0 },
    });

    const res = await request('GET', `/api/songs/${songId}/history`, { token });
    expect(res.status).toBe(200);
    const { data } = await res.json() as { data: Array<{ action: string }> };
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data.some((e) => e.action === 'CREATE')).toBe(true);
  });

  it('records UPDATE events', async () => {
    const createRes = await request('POST', `/api/songs/${songId}/notes`, {
      token, csrf,
      body: { title: 'ToUpdate', track: 2, time: 15.0 },
    });
    const { data: note } = await createRes.json() as { data: { id: string } };

    await request('PUT', `/api/songs/${songId}/notes/${note.id}`, {
      token, csrf,
      body: { title: 'Updated' },
    });

    const res = await request('GET', `/api/songs/${songId}/history`, { token });
    const { data } = await res.json() as { data: Array<{ action: string }> };
    expect(data.some((e) => e.action === 'UPDATE')).toBe(true);
    expect(data.some((e) => e.action === 'CREATE')).toBe(true);
  });

  it('records DELETE events', async () => {
    const createRes = await request('POST', `/api/songs/${songId}/notes`, {
      token, csrf,
      body: { title: 'ToDelete', track: 3, time: 25.0 },
    });
    const { data: note } = await createRes.json() as { data: { id: string } };

    await request('DELETE', `/api/songs/${songId}/notes/${note.id}`, { token, csrf });

    const res = await request('GET', `/api/songs/${songId}/history`, { token });
    const { data } = await res.json() as { data: Array<{ action: string }> };
    expect(data.some((e) => e.action === 'DELETE')).toBe(true);
  });

  it('supports pagination', async () => {
    for (let i = 0; i < 5; i++) {
      await request('POST', `/api/songs/${songId}/notes`, {
        token, csrf,
        body: { title: `Note${i}`, track: i + 1, time: i * 10 + 50 },
      });
    }

    const res = await request('GET', `/api/songs/${songId}/history?limit=2&offset=0`, { token });
    const { data } = await res.json() as { data: unknown[] };
    expect(data.length).toBe(2);

    const res2 = await request('GET', `/api/songs/${songId}/history?limit=2&offset=2`, { token });
    const { data: page2 } = await res2.json() as { data: unknown[] };
    expect(page2.length).toBe(2);
  });
});
