CREATE TABLE IF NOT EXISTS tasks (
  task_id       TEXT PRIMARY KEY,
  type          TEXT NOT NULL CHECK(type IN ('image','video')),
  provider      TEXT NOT NULL,
  dashscope_id  TEXT,
  status        TEXT NOT NULL CHECK(status IN ('pending','success','failed')),
  prompt        TEXT NOT NULL,
  params        TEXT,
  result_urls   TEXT,
  error_code    TEXT,
  error_message TEXT,
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_expires ON tasks(expires_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status  ON tasks(status);
