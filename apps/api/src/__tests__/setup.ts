import { env } from 'cloudflare:test';
import { beforeAll } from 'vitest';

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    password_hash text NOT NULL,
    totp_secret text,
    totp_enabled integer DEFAULT 0 NOT NULL,
    created_at integer DEFAULT (unixepoch()) NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)`,
  `CREATE TABLE IF NOT EXISTS songs (
    id text PRIMARY KEY NOT NULL,
    title text NOT NULL,
    description text,
    owner_id text NOT NULL,
    created_at integer DEFAULT (unixepoch()) NOT NULL,
    updated_at integer DEFAULT (unixepoch()) NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS song_collaborators (
    id text PRIMARY KEY NOT NULL,
    song_id text NOT NULL,
    user_id text NOT NULL,
    role text DEFAULT 'editor' NOT NULL,
    created_at integer DEFAULT (unixepoch()) NOT NULL,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_song_user ON song_collaborators (song_id, user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_song_collaborators_user ON song_collaborators (user_id)`,
  `CREATE TABLE IF NOT EXISTS notes (
    id text PRIMARY KEY NOT NULL,
    song_id text NOT NULL,
    track integer NOT NULL,
    time real NOT NULL,
    title text NOT NULL,
    description text,
    color text DEFAULT '#3B82F6' NOT NULL,
    created_at integer DEFAULT (unixepoch()) NOT NULL,
    updated_at integer DEFAULT (unixepoch()) NOT NULL,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_song_track_time ON notes (song_id, track, time)`,
  `CREATE INDEX IF NOT EXISTS idx_notes_song_id ON notes (song_id)`,
  `CREATE TABLE IF NOT EXISTS note_events (
    id text PRIMARY KEY NOT NULL,
    note_id text NOT NULL,
    song_id text NOT NULL,
    user_id text NOT NULL,
    action text NOT NULL,
    payload text,
    created_at integer DEFAULT (unixepoch()) NOT NULL,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE INDEX IF NOT EXISTS idx_note_events_song ON note_events (song_id, created_at)`,
];

beforeAll(async () => {
  for (const sql of STATEMENTS) {
    await env.DB.prepare(sql).run();
  }
});
