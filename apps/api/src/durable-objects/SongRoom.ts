import type { Env } from '../types';

interface Session {
  socket: WebSocket;
  userId: string;
  name: string;
}

export class SongRoom implements DurableObject {
  private sessions: Map<WebSocket, Session> = new Map();
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

      const session: Session = { socket: server, userId, name };
      this.sessions.set(server, session);

      this.broadcast(
        JSON.stringify({
          type: 'user:joined',
          data: { userId, name },
        }),
        server,
      );

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('Not found', { status: 404 });
  }

  async webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer) {
    // Client messages are handled via REST API, which calls /broadcast.
  }

  async webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean) {
    const session = this.sessions.get(ws);
    if (session) {
      this.sessions.delete(ws);
      this.broadcast(
        JSON.stringify({
          type: 'user:left',
          data: { userId: session.userId },
        }),
      );
    }
  }

  async webSocketError(ws: WebSocket, _error: unknown) {
    const session = this.sessions.get(ws);
    if (session) {
      this.sessions.delete(ws);
    }
  }

  private broadcast(message: string, exclude?: WebSocket) {
    for (const [socket] of this.sessions) {
      if (socket === exclude) continue;
      try {
        socket.send(message);
      } catch {
        this.sessions.delete(socket);
      }
    }
  }
}
