/**
 * Seed script — writes directly to the D1 SQLite database file.
 * Run: pnpm --filter @ama-midi/api db:seed
 *
 * Creates 5 users (password: Aa123@123), 50 songs, notes, and collaborators.
 * All users have TOTP enabled with shared secret.
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID, pbkdf2Sync, randomBytes } from 'node:crypto';
import Database from 'better-sqlite3';

const PASSWORD = 'Aa123@123';
const TOTP_SECRET = 'CZ3QM5LI7FB2QZJTZS6CH5KZS35W2V74';

const USERS = [
  { email: 'alice@ama-midi.local', name: 'Alice Nguyen' },
  { email: 'bob@ama-midi.local', name: 'Bob Tran' },
  { email: 'charlie@ama-midi.local', name: 'Charlie Le' },
  { email: 'diana@ama-midi.local', name: 'Diana Pham' },
  { email: 'eddie@ama-midi.local', name: 'Eddie Vo' },
];

const SONG_TITLES = [
  'Morning Dew', 'Sunset Waltz', 'Rainy Monday', 'City Lights', 'Ocean Breeze',
  'Moonlit Path', 'Electric Dream', 'Autumn Leaves', 'Spring Bloom', 'Winter Snow',
  'Jazz Cafe', 'Blues Night', 'Pop Anthem', 'Rock Ballad', 'Folk Story',
  'Classical Suite', 'Piano Sonata', 'Guitar Solo', 'Drum Beat', 'Bass Line',
  'Midnight Run', 'Dawn Chorus', 'Starry Night', 'Cloud Nine', 'Thunder Roll',
  'Lullaby', 'March Forward', 'Dance Floor', 'Slow Groove', 'Fast Lane',
  'Echoes', 'Whisper', 'Roar', 'Cascade', 'Horizon',
  'First Light', 'Last Dance', 'Deep Blue', 'Crimson Sky', 'Golden Hour',
  'Silver Moon', 'Bronze Age', 'Iron Will', 'Crystal Clear', 'Velvet Touch',
  'Silk Road', 'Bamboo Forest', 'Cherry Blossom', 'Lotus Pond', 'Dragon Fly',
];

const COLORS = ['#3B82F6', '#EF4444', '#22C55E', '#A855F7', '#EAB308', '#EC4899', '#06B6D4', '#F97316'];
const PITCH_NAMES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
const EXTRA_HEAVY_INDICES = [0, 10, 20, 30, 40];
const EXTRA_HEAVY_COUNTS = [5000, 5200, 5500, 5100, 5300];

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, 100_000, 32, 'sha256');
  return salt.toString('hex') + ':' + hash.toString('hex');
}

let seed = 42;
function rng(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

function findDbPath(): string {
  const d1Dir = join(process.cwd(), '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
  const files = readdirSync(d1Dir).filter((f) => f.endsWith('.sqlite'));
  if (files.length === 0) throw new Error(`No .sqlite file found in ${d1Dir}. Run migrations first.`);
  return join(d1Dir, files[0]!);
}

function main() {
  const dbPath = findDbPath();
  console.log(`Database: ${dbPath}`);

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = OFF');

  const now = Math.floor(Date.now() / 1000);
  const passwordHash = hashPassword(PASSWORD);

  // Clear existing data
  console.log('Clearing existing data...');
  db.exec('DELETE FROM note_events; DELETE FROM notes; DELETE FROM song_collaborators; DELETE FROM songs; DELETE FROM users;');

  // 1. Users
  console.log('Creating 5 users...');
  const userIds: string[] = [];
  const insertUser = db.prepare(
    'INSERT INTO users (id, email, name, password_hash, totp_secret, totp_enabled, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
  );
  for (const u of USERS) {
    const id = randomUUID();
    userIds.push(id);
    insertUser.run(id, u.email, u.name, passwordHash, TOTP_SECRET, now);
    console.log(`  ✓ ${u.name} <${u.email}>`);
  }

  // 2. Songs
  console.log('\nCreating 50 songs...');
  interface SongInfo { id: string; ownerIdx: number; noteTarget: number; title: string }
  const songs: SongInfo[] = [];

  const insertSong = db.prepare(
    'INSERT INTO songs (id, title, description, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  );

  for (let i = 0; i < 50; i++) {
    const ownerIdx = i % 5;
    const id = randomUUID();
    const title = SONG_TITLES[i]!;
    const desc = `Seed song #${i + 1} by ${USERS[ownerIdx]!.name}`;
    const isHeavy = EXTRA_HEAVY_INDICES.includes(i);
    const noteTarget = isHeavy
      ? EXTRA_HEAVY_COUNTS[EXTRA_HEAVY_INDICES.indexOf(i)]!
      : 1500 + Math.floor(rng() * 500);

    const daysAgo = Math.floor((i / 50) * 90);
    const hoursOffset = Math.floor(rng() * 24);
    const createdAt = now - (daysAgo * 86400) - (hoursOffset * 3600);
    const updatedAt = Math.min(createdAt + Math.floor(rng() * Math.max(daysAgo, 1) * 86400), now);

    insertSong.run(id, title, desc, userIds[ownerIdx]!, createdAt, updatedAt);
    songs.push({ id, ownerIdx, noteTarget, title });

    const tag = isHeavy ? ` [${noteTarget} notes]` : '';
    console.log(`  ✓ #${i + 1} "${title}" by ${USERS[ownerIdx]!.name}${tag}`);
  }

  // 3. Collaborators
  console.log('\nAdding collaborators...');
  let collabCount = 0;
  const insertCollab = db.prepare(
    'INSERT INTO song_collaborators (id, song_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)',
  );

  for (const song of songs) {
    const numCollabs = 1 + Math.floor(rng() * 2);
    const candidates = [0, 1, 2, 3, 4].filter((i) => i !== song.ownerIdx);
    for (let c = 0; c < numCollabs && candidates.length > 0; c++) {
      const pickIdx = Math.floor(rng() * candidates.length);
      const pick = candidates.splice(pickIdx, 1)[0]!;
      const role = c === 0 ? 'editor' : 'viewer';
      insertCollab.run(randomUUID(), song.id, userIds[pick]!, role, now);
      collabCount++;
    }
  }
  console.log(`  ✓ ${collabCount} collaborator links created`);

  // 4. Notes (use transaction for speed)
  console.log('\nCreating notes...');
  const insertNote = db.prepare(
    'INSERT INTO notes (id, song_id, track, pitch, time, title, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );

  let totalNotes = 0;
  const batchInsert = db.transaction((songInfo: SongInfo) => {
    const used = new Set<string>();
    for (let n = 0; n < songInfo.noteTarget; n++) {
      let track: number, pitch: number, time: number, key: string;
      let attempts = 0;
      do {
        track = 1 + Math.floor(rng() * 8);
        pitch = Math.floor(rng() * 88);
        time = Math.floor(rng() * 300);
        key = `${track}:${pitch}:${time}`;
        attempts++;
      } while (used.has(key) && attempts < 100);
      if (used.has(key)) continue;
      used.add(key);

      const midi = 21 + pitch;
      const noteName = PITCH_NAMES[midi % 12]!;
      const octave = Math.floor(midi / 12) - 1;
      const color = COLORS[Math.floor(rng() * COLORS.length)]!;
      const title = `${noteName}${octave} @ beat ${time}`;

      insertNote.run(randomUUID(), songInfo.id, track, pitch, time, title, color, now, now);
      totalNotes++;
    }
  });

  for (const song of songs) {
    process.stdout.write(`  "${song.title}" — ${song.noteTarget} notes...`);
    batchInsert(song);
    console.log(' ✓');
  }

  db.pragma('foreign_keys = ON');
  db.close();

  console.log(`\n✅ Seed complete!`);
  console.log(`  ${USERS.length} users, ${songs.length} songs, ${collabCount} collaborators, ${totalNotes} notes`);
  console.log('\nLogin credentials:');
  console.log('  Password for all users: Aa123@123');
  console.log(`  TOTP secret (all users): ${TOTP_SECRET}`);
  console.log('  2FA code (local dev):    000000');
  console.log('\nUsers:');
  for (const u of USERS) {
    console.log(`  ${u.email}`);
  }
}

main();
