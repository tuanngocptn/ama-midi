import type { Env } from '../types';

interface SessionMeta {
  userId: string;
  name: string;
}

export class SongRoom implements DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/broadcast') {
      const message = await request.text();
      this.broadcast(message);
      return new Response('ok');
    }

    if (url.pathname === '/websocket') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 });
      }

      const userId = url.searchParams.get('userId') ?? 'anonymous';
      const name = url.searchParams.get('name') ?? 'Anonymous';

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.state.acceptWebSocket(server);
      server.serializeAttachment({ userId, name } satisfies SessionMeta);

      this.broadcast(
        JSON.stringify({ type: 'user:joined', data: { userId, name } }),
        server,
      );

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('Not found', { status: 404 });
  }

  async webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer) {
    // Note mutations go through REST API, which calls /broadcast.
  }

  async webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean) {
    const meta = ws.deserializeAttachment() as SessionMeta | null;
    if (meta) {
      this.broadcast(
        JSON.stringify({ type: 'user:left', data: { userId: meta.userId } }),
      );
    }
  }

  async webSocketError(ws: WebSocket, _error: unknown) {
    ws.close(1011, 'WebSocket error');
  }

  private broadcast(message: string, exclude?: WebSocket) {
    const sockets = this.state.getWebSockets();
    for (const ws of sockets) {
      if (ws === exclude) continue;
      try {
        ws.send(message);
      } catch {
        try { ws.close(1011, 'Send failed'); } catch { /* already closed */ }
      }
    }
  }
}
