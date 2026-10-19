// The database tables. This runs every start-up and only creates what is missing.
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('writer','client','admin')),
  plan           TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','active','review','eligible','premium')),
  sample         TEXT,
  sample_note    TEXT,
  company        TEXT,
  need           TEXT,
  approval       TEXT CHECK (approval IN ('pending','approved','rejected')),
  email_verified INTEGER NOT NULL DEFAULT 0,
  token_version  INTEGER NOT NULL DEFAULT 0,
  created_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  client     TEXT NOT NULL,
  type       TEXT NOT NULL,
  pay        INTEGER NOT NULL,
  words      INTEGER NOT NULL,
  due        TEXT NOT NULL,
  premium    INTEGER NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','pending')),
  created_by TEXT NOT NULL,
  claimed_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
  id         TEXT PRIMARY KEY,
  job_id     TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  writer_id  TEXT NOT NULL REFERENCES users(id),
  words      INTEGER NOT NULL,
  text       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','revision','rejected')),
  note       TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE (job_id, writer_id)
);

-- Fees paid by writers. "review" is used for payments made outside the website
-- (bank, mobile money): NULL = not sent yet, 'submitted' = waiting for the admin, 'rejected'.
CREATE TABLE IF NOT EXISTS payments (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  kind         TEXT NOT NULL CHECK (kind IN ('activate','premium')),
  amount       INTEGER NOT NULL,
  task_id      TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  provider_ref TEXT,
  created_at   INTEGER NOT NULL,
  method       TEXT,
  currency     TEXT,
  reference    TEXT,
  proof        TEXT,
  review       TEXT,
  review_note  TEXT
);

-- Ways to pay that the admin sets up (bank transfer, mobile money, anything else).
CREATE TABLE IF NOT EXISTS payment_methods (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  instructions TEXT NOT NULL,
  enabled      INTEGER NOT NULL DEFAULT 1,
  sort         INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL
);

-- Money received from clients for their work, recorded by the admin.
CREATE TABLE IF NOT EXISTS received_payments (
  id           TEXT PRIMARY KEY,
  payer        TEXT NOT NULL,
  job_id       TEXT,
  method       TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  currency     TEXT NOT NULL,
  reference    TEXT,
  note         TEXT,
  created_by   TEXT NOT NULL,
  created_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('verify','reset')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  used_at    INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_claimed ON jobs(claimed_by);
CREATE INDEX IF NOT EXISTS idx_subs_writer ON submissions(writer_id);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON auth_tokens(user_id, kind);
`