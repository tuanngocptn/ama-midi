export interface Env {
  DB: D1Database;
  SONG_ROOM: DurableObjectNamespace;
  JWT_SECRET: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export type Variables = {
  user: AuthUser;
};
