CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  hashed_password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
);
