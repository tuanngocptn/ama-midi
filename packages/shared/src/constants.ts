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
