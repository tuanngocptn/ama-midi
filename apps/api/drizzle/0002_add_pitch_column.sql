ALTER TABLE notes ADD COLUMN pitch integer DEFAULT 0 NOT NULL;
DROP INDEX IF EXISTS uq_song_track_time;
CREATE UNIQUE INDEX uq_song_track_pitch_time ON notes (song_id, track, pitch, time);
