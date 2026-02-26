import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { verifyToken } from '../lib/jwt';
import type { Env } from '../types';

const wsRouter = new Hono<{ Bindings: Env }>();

wsRouter.get('/:songId/ws', async (c) => {
  const upgrade = c.req.header('Upgrade');
  if (upgrade !== 'websocket') {
    throw new HTTPException(426, { message: 'Expected WebSocket upgrade' });
  }

  const token = c.req.query('token');
  if (!token) {
    throw new HTTPException(401, { message: 'Missing token query parameter' });
  }

  let user;
  try {
    user = await verifyToken(token, c.env.JWT_SECRET);
  } catch {
    throw new HTTPException(401, { message: 'Invalid token' });
  }

  const songId = c.req.param('songId');
  const roomId = c.env.SONG_ROOM.idFromName(songId);
  const room = c.env.SONG_ROOM.get(roomId);

  const wsUrl = new URL('http://internal/websocket');
  wsUrl.searchParams.set('userId', user.id);
  wsUrl.searchParams.set('name', user.name);

  return room.fetch(wsUrl.toString(), {
    headers: c.req.raw.headers,
  });
});

export default wsRouter;
