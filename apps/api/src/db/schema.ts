import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const songs = sqliteTable('songs', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const songCollaborators = sqliteTable(
  'song_collaborators',
  {
    id: text('id').primaryKey(),
    songId: text('song_id')
      .notNull()
      .references(() => songs.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['editor', 'viewer'] })
      .notNull()
      .default('editor'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uniqueCollaborator: uniqueIndex('uq_song_user').on(
      table.songId,
      table.userId,
    ),
    userIdx: index('idx_song_collaborators_user').on(table.userId),
  }),
);

export const notes = sqliteTable(
  'notes',
  {
    id: text('id').primaryKey(),
    songId: text('song_id')
      .notNull()
      .references(() => songs.id, { onDelete: 'cascade' }),
    track: integer('track').notNull(),
    time: real('time').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    color: text('color').notNull().default('#3B82F6'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uniquePosition: uniqueIndex('uq_song_track_time').on(
      table.songId,
      table.track,
      table.time,
    ),
    songIdx: index('idx_notes_song_id').on(table.songId),
  }),
);

export const noteEvents = sqliteTable(
  'note_events',
  {
    id: text('id').primaryKey(),
    noteId: text('note_id').notNull(),
    songId: text('song_id')
      .notNull()
      .references(() => songs.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    action: text('action', { enum: ['CREATE', 'UPDATE', 'DELETE'] }).notNull(),
    payload: text('payload'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    songEventIdx: index('idx_note_events_song').on(
      table.songId,
      table.createdAt,
    ),
  }),
);
