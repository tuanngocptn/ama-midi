import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import authRouter from './routes/auth';
import songsRouter from './routes/songs';
import notesRouter from './routes/notes';
import collaboratorsRouter from './routes/collaborators';
import historyRouter from './routes/history';
import wsRouter from './routes/websocket';
import { csrfMiddleware } from './middleware/csrf';
import { rateLimit } from './middleware/rate-limit';
import type { Env, Variables } from './types';

export { SongRoom } from './durable-objects/SongRoom';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use(
  '/*',
  cors({
    origin: ['http://localhost:5173', 'https://ama-midi.pages.dev'],
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  }),
);

app.route('/api/auth', authRouter);

app.use('/api/songs/*', csrfMiddleware);
app.use('/api/songs/*', rateLimit(100, 60_000));
app.route('/api/songs', songsRouter);
app.route('/api/songs', notesRouter);
app.route('/api/songs', collaboratorsRouter);
app.route('/api/songs', historyRouter);
app.route('/api/songs', wsRouter);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      { error: err.message, code: getErrorCode(err.status) },
      err.status,
    );
  }

  if (err && typeof err === 'object' && 'issues' in err) {
    const zodErr = err as { issues: Array<{ path: (string | number)[]; message: string }> };
    return c.json(
      {
        error: zodErr.issues
          .map((e: { path: (string | number)[]; message: string }) => `${e.path.join('.')}: ${e.message}`)
          .join(', '),
        code: 'VALIDATION_ERROR',
      },
      400,
    );
  }

  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
});

function getErrorCode(status: number): string {
  const codes: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    429: 'RATE_LIMITED',
  };
  return codes[status] ?? 'INTERNAL_ERROR';
}

export default app;
