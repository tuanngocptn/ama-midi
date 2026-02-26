export const MAX_TRACKS = 8;
export const MAX_TIME = 300;
export const TRACK_RANGE = { min: 1, max: 8 } as const;
export const TIME_RANGE = { min: 0, max: 300 } as const;
export const DEFAULT_NOTE_COLOR = '#3B82F6';

export const NOTE_COLORS = [
  '#3B82F6',
  '#EF4444',
  '#22C55E',
  '#A855F7',
  '#EAB308',
  '#EC4899',
  '#06B6D4',
  '#F97316',
] as const;

export const COLLABORATOR_ROLES = ['editor', 'viewer'] as const;
export const NOTE_ACTIONS = ['CREATE', 'UPDATE', 'DELETE'] as const;

// 12-note chromatic solfege (C = Do)
export const CHROMATIC_SOLFEGE = [
  'Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa',
  'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si',
] as const;

// Keep old export for backward compat
export const SOLFEGE = CHROMATIC_SOLFEGE;

// 88 piano keys: A0 (MIDI 21) through C8 (MIDI 108)
export const TOTAL_PITCHES = 88;
export const PITCH_RANGE = { min: 0, max: TOTAL_PITCHES - 1 } as const;
export const OCTAVES = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

// MIDI note 21 = A0 (first piano key), pitch index 0
const FIRST_MIDI = 21;

export function pitchToMidi(pitch: number): number {
  return FIRST_MIDI + pitch;
}

export function pitchName(pitch: number): string {
  const midi = pitchToMidi(pitch);
  // C = Do is MIDI note class 0; MIDI note % 12: 0=C,1=C#,...,9=A,10=A#,11=B
  const noteIndex = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  const names = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
  return `${names[noteIndex]}${octave}`;
}

export function isBlackKey(pitch: number): boolean {
  const midi = pitchToMidi(pitch);
  const noteClass = midi % 12;
  return [1, 3, 6, 8, 10].includes(noteClass);
}

// Equal temperament: f = 440 * 2^((midi - 69) / 12)
export const PITCH_FREQUENCIES: number[] = [];
for (let i = 0; i < TOTAL_PITCHES; i++) {
  const midi = pitchToMidi(i);
  PITCH_FREQUENCIES.push(440 * Math.pow(2, (midi - 69) / 12));
}
