/**
 * Seed script — run via: pnpm --filter @ama-midi/api db:seed
 *
 * Creates 5 users (password: Aa123@123), 50 songs, and notes.
 * All users have TOTP enabled with a shared secret (code 000000 works locally).
 */

import { execSync } from 'node:child_process';

const API = 'http://localhost:8787/api';
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

interface AuthResult {
  token: string;
  csrf: string;
  userId: string;
}

async function api(
  method: string,
  path: string,
  opts?: { token?: string; csrf?: string; body?: unknown },
): Promise<unknown> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts?.token) headers['Authorization'] = `Bearer ${opts.token}`;
  if (opts?.csrf) {
    headers['X-CSRF-Token'] = opts.csrf;
    headers['Cookie'] = `csrf_token=${opts.csrf}`;
  }

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { data: unknown };
  return json.data;
}

async function getCsrf(token: string): Promise<string> {
  const res = await fetch(`${API}/songs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const cookie = res.headers.get('set-cookie') ?? '';
  const match = cookie.match(/csrf_token=([^;]+)/);
  return match?.[1] ?? '';
}

async function registerUser(email: string, name: string): Promise<AuthResult> {
  const data = (await api('POST', '/auth/register', {
    body: { email, name, password: PASSWORD },
  })) as { token: string; user: { id: string } };

  const csrf = await getCsrf(data.token);
  return { token: data.token, userId: data.user.id, csrf };
}

function randomPitch(): number {
  return Math.floor(Math.random() * 88);
}

function randomColor(): string {
  const colors = ['#3B82F6', '#EF4444', '#22C55E', '#A855F7', '#EAB308', '#EC4899', '#06B6D4', '#F97316'];
  return colors[Math.floor(Math.random() * colors.length)]!;
}

async function createNotesForSong(
  songId: string,
  count: number,
  auth: AuthResult,
): Promise<void> {
  const usedPositions = new Set<string>();
  let created = 0;
  const batchSize = 50;

  while (created < count) {
    const promises: Promise<void>[] = [];

    for (let b = 0; b < batchSize && created + b < count; b++) {
      let track: number, pitch: number, time: number, key: string;
      let attempts = 0;
      do {
        track = Math.floor(Math.random() * 8) + 1;
        pitch = randomPitch();
        time = Math.floor(Math.random() * 300);
        key = `${track}:${pitch}:${time}`;
        attempts++;
      } while (usedPositions.has(key) && attempts < 100);

      if (usedPositions.has(key)) continue;
      usedPositions.add(key);

      const pitchNames = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
      const midi = 21 + pitch;
      const noteName = pitchNames[midi % 12];
      const octave = Math.floor(midi / 12) - 1;

      promises.push(
        api('POST', `/songs/${songId}/notes`, {
          token: auth.token,
          csrf: auth.csrf,
          body: {
            title: `${noteName}${octave} @ beat ${time}`,
            track,
            pitch,
            time,
            color: randomColor(),
          },
        }).then(() => {}) // discard return value
          .catch(() => {}), // skip duplicates silently
      );
    }

    await Promise.all(promises);
    created += batchSize;
    if (created % 500 === 0 && created < count) {
      process.stdout.write(`  ${created}/${count} notes...`);
    }
  }
}

async function main() {
  console.log('Seeding AMA-MIDI database...\n');

  // Check API is running
  try {
    const check = await fetch(`${API}/songs`, { method: 'GET' });
    if (!check.ok && check.status !== 401) throw new Error();
  } catch {
    console.error('ERROR: API not running at http://localhost:8787');
    console.error('Start it first: pnpm --filter @ama-midi/api dev');
    process.exit(1);
  }

  // 1. Register 5 users
  console.log('Creating 5 users (password: Aa123@123)...');
  const auths: AuthResult[] = [];

  for (const u of USERS) {
    try {
      const auth = await registerUser(u.email, u.name);
      auths.push(auth);
      console.log(`  ✓ ${u.name} <${u.email}> (id: ${auth.userId})`);
    } catch {
      console.log(`  ⚠ ${u.name} already exists, logging in...`);
      const loginData = (await api('POST', '/auth/login', {
        body: { email: u.email, password: PASSWORD },
      })) as { token?: string; user?: { id: string }; requires2fa?: boolean };

      let token: string;
      let userId: string;

      if (loginData.requires2fa) {
        const twoFaData = (await api('POST', '/auth/login/2fa', {
          body: { email: u.email, password: PASSWORD, code: '000000' },
        })) as { token: string; user: { id: string } };
        token = twoFaData.token;
        userId = twoFaData.user.id;
      } else {
        token = loginData.token!;
        userId = loginData.user!.id;
      }

      const csrf = await getCsrf(token);
      auths.push({ token, userId, csrf });
      console.log(`  ✓ ${u.name} logged in (id: ${userId})`);
    }
  }

  // 2. Enable TOTP for all users with shared secret
  console.log(`\nEnabling 2FA for all users (secret: ${TOTP_SECRET})...`);
  for (let i = 0; i < USERS.length; i++) {
    const auth = auths[i]!;
    try {
      await api('POST', '/auth/2fa/setup', { token: auth.token, csrf: auth.csrf });
      await api('POST', '/auth/2fa/verify-setup', {
        token: auth.token,
        csrf: auth.csrf,
        body: { code: '000000' },
      });
    } catch {
      console.log(`  ⚠ ${USERS[i]!.name} — 2FA already enabled (OK)`);
    }
    try {
      execSync(
        `npx wrangler d1 execute ama-midi-db --local --command "UPDATE users SET totp_secret = '${TOTP_SECRET}' WHERE id = '${auth.userId}'"`,
        { stdio: 'pipe' },
      );
      console.log(`  ✓ ${USERS[i]!.name} — 2FA secret set`);
    } catch {
      console.log(`  ⚠ ${USERS[i]!.name} — failed to set TOTP secret`);
    }
  }

  // 3. Create 50 songs distributed across users
  console.log('\nCreating 50 songs...');

  interface SongInfo { id: string; ownerIdx: number; noteTarget: number; title: string }
  const songs: SongInfo[] = [];

  // 5 "extra-heavy" songs with 5000+ notes, one per user
  const extraHeavyIndices = [0, 10, 20, 30, 40];
  const extraHeavyCounts = [5000, 5200, 5500, 5100, 5300];

  for (let i = 0; i < 50; i++) {
    const ownerIdx = i % 5;
    const auth = auths[ownerIdx]!;
    const title = SONG_TITLES[i]!;
    const isExtraHeavy = extraHeavyIndices.includes(i);
    const noteTarget = isExtraHeavy
      ? extraHeavyCounts[extraHeavyIndices.indexOf(i)]!
      : 1500 + Math.floor(Math.random() * 500);

    try {
      const song = (await api('POST', '/songs', {
        token: auth.token,
        csrf: auth.csrf,
        body: { title, description: `Seed song #${i + 1} by ${USERS[ownerIdx]!.name}` },
      })) as { id: string };

      songs.push({ id: song.id, ownerIdx, noteTarget, title });
      const tag = isExtraHeavy ? ` [${noteTarget} notes]` : '';
      console.log(`  ✓ #${i + 1} "${title}" by ${USERS[ownerIdx]!.name}${tag}`);
    } catch {
      console.log(`  ⚠ #${i + 1} "${title}" — failed to create`);
    }
  }

  // 4. Add collaborators: each song gets 1-2 random collaborators
  console.log('\nAdding collaborators...');
  let collabCount = 0;
  for (const song of songs) {
    const numCollabs = Math.floor(Math.random() * 2) + 1;
    const candidates = [0, 1, 2, 3, 4].filter((i) => i !== song.ownerIdx);
    for (let c = 0; c < numCollabs; c++) {
      const pick = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0]!;
      const auth = auths[song.ownerIdx]!;
      try {
        await api('POST', `/songs/${song.id}/collaborators`, {
          token: auth.token,
          csrf: auth.csrf,
          body: { email: USERS[pick]!.email, role: c === 0 ? 'editor' : 'viewer' },
        });
        collabCount++;
      } catch { /* skip */ }
    }
  }
  console.log(`  ✓ ${collabCount} collaborator links created`);

  // 5. Create notes
  console.log('\nCreating notes...');
  for (const song of songs) {
    const auth = auths[song.ownerIdx]!;
    process.stdout.write(`  "${song.title}" — ${song.noteTarget} notes...`);
    await createNotesForSong(song.id, song.noteTarget, auth);
    console.log(' ✓');
  }

  console.log('\n✅ Seed complete!');
  console.log('\nLogin credentials:');
  console.log('  Password for all users: Aa123@123');
  console.log(`  TOTP secret (all users): ${TOTP_SECRET}`);
  console.log('  2FA code (local dev):    000000');
  console.log('\nUsers:');
  for (const u of USERS) {
    console.log(`  ${u.email}`);
  }
}

main().catch((err) => {
  console.error('\nSeed failed:', err);
  process.exit(1);
});
