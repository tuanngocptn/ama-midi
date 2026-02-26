import { z } from 'zod';
import {
  TRACK_RANGE,
  TIME_RANGE,
  PITCH_RANGE,
  DEFAULT_NOTE_COLOR,
  COLLABORATOR_ROLES,
  NOTE_ACTIONS,
} from './constants';

// --- Auth ---

export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// --- Songs ---

export const createSongSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export const updateSongSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
});

// --- Notes ---

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

export const createNoteSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  track: z.number().int().min(TRACK_RANGE.min).max(TRACK_RANGE.max),
  pitch: z.number().int().min(PITCH_RANGE.min).max(PITCH_RANGE.max).default(0),
  time: z.number().min(TIME_RANGE.min).max(TIME_RANGE.max),
  color: z.string().regex(hexColorRegex).default(DEFAULT_NOTE_COLOR),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  track: z.number().int().min(TRACK_RANGE.min).max(TRACK_RANGE.max).optional(),
  pitch: z.number().int().min(PITCH_RANGE.min).max(PITCH_RANGE.max).optional(),
  time: z.number().min(TIME_RANGE.min).max(TIME_RANGE.max).optional(),
  color: z.string().regex(hexColorRegex).optional(),
});

// --- Collaborators ---

export const addCollaboratorSchema = z.object({
  email: z.string().email(),
  role: z.enum(COLLABORATOR_ROLES).default('editor'),
});

export const updateCollaboratorSchema = z.object({
  role: z.enum(COLLABORATOR_ROLES),
});

// --- WebSocket Messages ---

export const wsNoteCreateSchema = z.object({
  type: z.literal('note:create'),
  data: createNoteSchema,
});

export const wsNoteUpdateSchema = z.object({
  type: z.literal('note:update'),
  data: updateNoteSchema.extend({ id: z.string().uuid() }),
});

export const wsNoteDeleteSchema = z.object({
  type: z.literal('note:delete'),
  data: z.object({ id: z.string().uuid() }),
});

export const wsClientMessageSchema = z.discriminatedUnion('type', [
  wsNoteCreateSchema,
  wsNoteUpdateSchema,
  wsNoteDeleteSchema,
]);

// --- Response Types ---

export const noteEventActionSchema = z.enum(NOTE_ACTIONS);

// --- 2FA ---

export const login2faSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  code: z.string().length(6),
});

export const verify2faCodeSchema = z.object({
  code: z.string().length(6),
});

// --- Type exports ---

export type Login2faInput = z.infer<typeof login2faSchema>;
export type Verify2faCodeInput = z.infer<typeof verify2faCodeSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateSongInput = z.infer<typeof createSongSchema>;
export type UpdateSongInput = z.infer<typeof updateSongSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type AddCollaboratorInput = z.infer<typeof addCollaboratorSchema>;
export type UpdateCollaboratorInput = z.infer<typeof updateCollaboratorSchema>;
export type WsClientMessage = z.infer<typeof wsClientMessageSchema>;
export type NoteEventAction = z.infer<typeof noteEventActionSchema>;
