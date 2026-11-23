CREATE TABLE IF NOT EXISTS staff_messages (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  CHECK (sender_id <> recipient_id)
);
CREATE INDEX IF NOT EXISTS staff_messages_sender_idx ON staff_messages (school_id, sender_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS staff_messages_recipient_idx ON staff_messages (school_id, recipient_id, created_at DESC, id DESC);
