export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Song {
  id: string;
  title: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  noteCount?: number;
  collaboratorCount?: number;
}

export interface Note {
  id: string;
  songId: string;
  track: number;
  pitch: number;
  time: number;
  title: string;
  description: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteEvent {
  id: string;
  noteId: string;
  songId: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: string | null;
  createdAt: string;
}

export interface SongCollaborator {
  id: string;
  songId: string;
  userId: string;
  role: 'editor' | 'viewer';
  createdAt: string;
  user?: Pick<User, 'id' | 'email' | 'name'>;
}

// API response wrappers
export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: string;
  code: string;
}

// WebSocket server -> client messages
export type WsServerMessage =
  | { type: 'note:created'; data: Note }
  | { type: 'note:updated'; data: Note }
  | { type: 'note:deleted'; data: { id: string } }
  | { type: 'user:joined'; data: { userId: string; name: string } }
  | { type: 'user:left'; data: { userId: string } }
  | { type: 'error'; data: { message: string } };
