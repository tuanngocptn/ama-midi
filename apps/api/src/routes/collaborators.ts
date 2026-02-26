import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { addCollaboratorSchema, updateCollaboratorSchema } from '@ama-midi/shared';
import * as collabService from '../services/collaborator-service';
import { authMiddleware } from '../middleware/auth';
import type { Env, Variables } from '../types';

const collaboratorsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

collaboratorsRouter.use('/*', authMiddleware);

collaboratorsRouter.get('/:songId/collaborators', async (c) => {
  const db = drizzle(c.env.DB);
  const data = await collabService.listCollaborators(db, c.req.param('songId'), c.get('user').id);
  return c.json({ data });
});

collaboratorsRouter.post('/:songId/collaborators', async (c) => {
  const input = addCollaboratorSchema.parse(await c.req.json());
  const db = drizzle(c.env.DB);
  const data = await collabService.addCollaborator(
    db, c.req.param('songId'), c.get('user').id, input,
  );
  return c.json({ data }, 201);
});

collaboratorsRouter.put('/:songId/collaborators/:userId', async (c) => {
  const input = updateCollaboratorSchema.parse(await c.req.json());
  const db = drizzle(c.env.DB);
  const data = await collabService.updateCollaboratorRole(
    db, c.req.param('songId'), c.get('user').id, c.req.param('userId'), input.role,
  );
  return c.json({ data });
});

collaboratorsRouter.delete('/:songId/collaborators/:userId', async (c) => {
  const db = drizzle(c.env.DB);
  const data = await collabService.removeCollaborator(
    db, c.req.param('songId'), c.get('user').id, c.req.param('userId'),
  );
  return c.json({ data });
});

export default collaboratorsRouter;
