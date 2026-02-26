/**
 * Remote seed script — generates batched SQL files and executes via wrangler d1.
 * Run: pnpm --filter @ama-midi/api db:seed:remote
 *
 * Creates 5 users (password: Aa123@123), 50 songs, notes, and collaborators.
 * All users have TOTP enabled with shared secret.
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID, pbkdf2Sync, randomBytes } from 'node:crypto';

const PASSWORD = 'Aa123@123';
const TOTP_SECRET = 'CZ3QM5LI7FB2QZJTZS6CH5KZS35W2V74';
const BATCH_DIR = join(process.cwd(), 'scripts', '.seed-batches');
const WRANGLER_FLAGS = '--remote';
const MAX_STATEMENTS_PER_BATCH = 2000;

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

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

let seed = 42;
function rng(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

function sleep(ms: number) {
  execSync(`sleep ${ms / 1000}`);
}

function executeBatch(file: string, batchNum: number, totalBatches: number) {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      process.stdout.write(`  Batch ${batchNum}/${totalBatches}...`);
      execSync(
        `npx wrangler d1 execute ama-midi-db ${WRANGLER_FLAGS} --file=${file}`,
        { stdio: 'pipe', cwd: process.cwd() },
      );
      console.log(' ✓');
      return;
    } catch (e: unknown) {
      if (attempt < maxRetries) {
        const wait = attempt * 5000;
        console.log(` ✗ (retrying in ${wait / 1000}s...)`);
        sleep(wait);
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(` ✗ Failed after ${maxRetries} attempts: ${msg}`);
        throw e;
      }
    }
  }
}

function main() {
  console.log('Generating seed SQL for remote D1...\n');

  rmSync(BATCH_DIR, { recursive: true, force: true });
  mkdirSync(BATCH_DIR, { recursive: true });

  const now = Math.floor(Date.now() / 1000);
  const passwordHash = hashPassword(PASSWORD);

  const allStatements: string[] = [];

  // Clear existing data
  allStatements.push('DELETE FROM note_events;');
  allStatements.push('DELETE FROM notes;');
  allStatements.push('DELETE FROM song_collaborators;');
  allStatements.push('DELETE FROM songs;');
  allStatements.push('DELETE FROM users;');

  // 1. Users
  console.log('Generating users...');
  const userIds: string[] = [];
  for (const u of USERS) {
    const id = randomUUID();
    userIds.push(id);
    allStatements.push(
      `INSERT INTO users (id, email, name, password_hash, totp_secret, totp_enabled, created_at) VALUES ('${id}', '${esc(u.email)}', '${esc(u.name)}', '${passwordHash}', '${TOTP_SECRET}', 1, ${now});`,
    );
    console.log(`  ✓ ${u.name} <${u.email}>`);
  }

  // 2. Songs
  console.log('\nGenerating 50 songs...');
  interface SongInfo { id: string; ownerIdx: number; noteTarget: number; title: string }
  const songs: SongInfo[] = [];

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

    allStatements.push(
      `INSERT INTO songs (id, title, description, owner_id, created_at, updated_at) VALUES ('${id}', '${esc(title)}', '${esc(desc)}', '${userIds[ownerIdx]}', ${createdAt}, ${updatedAt});`,
    );
    songs.push({ id, ownerIdx, noteTarget, title });

    const tag = isHeavy ? ` [${noteTarget} notes]` : '';
    console.log(`  ✓ #${i + 1} "${title}" by ${USERS[ownerIdx]!.name}${tag}`);
  }

  // 3. Collaborators
  console.log('\nGenerating collaborators...');
  let collabCount = 0;
  for (const song of songs) {
    const numCollabs = 1 + Math.floor(rng() * 2);
    const candidates = [0, 1, 2, 3, 4].filter((i) => i !== song.ownerIdx);
    for (let c = 0; c < numCollabs && candidates.length > 0; c++) {
      const pickIdx = Math.floor(rng() * candidates.length);
      const pick = candidates.splice(pickIdx, 1)[0]!;
      const role = c === 0 ? 'editor' : 'viewer';
      allStatements.push(
        `INSERT INTO song_collaborators (id, song_id, user_id, role, created_at) VALUES ('${randomUUID()}', '${song.id}', '${userIds[pick]}', '${role}', ${now});`,
      );
      collabCount++;
    }
  }
  console.log(`  ✓ ${collabCount} collaborator links`);

  // 4. Notes
  console.log('\nGenerating notes...');
  let totalNotes = 0;
  for (const song of songs) {
    const used = new Set<string>();
    for (let n = 0; n < song.noteTarget; n++) {
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

      allStatements.push(
        `INSERT INTO notes (id, song_id, track, pitch, time, title, color, created_at, updated_at) VALUES ('${randomUUID()}', '${song.id}', ${track}, ${pitch}, ${time}, '${esc(title)}', '${color}', ${now}, ${now});`,
      );
      totalNotes++;
    }
  }
  console.log(`  ✓ ${totalNotes} notes generated`);

  // Split into batch files
  const totalBatches = Math.ceil(allStatements.length / MAX_STATEMENTS_PER_BATCH);
  console.log(`\nSplit into ${totalBatches} batches (${MAX_STATEMENTS_PER_BATCH} statements each)`);

  const batchFiles: string[] = [];
  for (let i = 0; i < allStatements.length; i += MAX_STATEMENTS_PER_BATCH) {
    const batch = allStatements.slice(i, i + MAX_STATEMENTS_PER_BATCH);
    const batchNum = Math.floor(i / MAX_STATEMENTS_PER_BATCH) + 1;
    const filePath = join(BATCH_DIR, `batch_${String(batchNum).padStart(3, '0')}.sql`);
    writeFileSync(filePath, batch.join('\n'));
    batchFiles.push(filePath);
  }

  // Execute each batch with 1s delay to avoid rate limits
  console.log(`\nExecuting ${totalBatches} batches on remote D1...`);
  for (let i = 0; i < batchFiles.length; i++) {
    executeBatch(batchFiles[i]!, i + 1, totalBatches);
    if (i < batchFiles.length - 1) sleep(1000);
  }

  // Cleanup
  rmSync(BATCH_DIR, { recursive: true, force: true });

  console.log(`\n✅ Remote seed complete!`);
  console.log(`  ${USERS.length} users, ${songs.length} songs, ${collabCount} collaborators, ${totalNotes} notes`);
  console.log('\nLogin credentials:');
  console.log('  Password for all users: Aa123@123');
  console.log(`  TOTP secret (all users): ${TOTP_SECRET}`);
  console.log('  2FA code: use authenticator app with the secret above');
  console.log('\nUsers:');
  for (const u of USERS) {
    console.log(`  ${u.email}`);
  }
}

main();
