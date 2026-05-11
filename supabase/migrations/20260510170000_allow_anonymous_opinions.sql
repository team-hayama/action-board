-- 意見投稿・コメントを未ログインでも投稿可能にする
-- user_id を nullable にし、display_name (任意の表示名) を追加

ALTER TABLE opinions
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS display_name TEXT
    CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 40);

ALTER TABLE opinion_comments
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS display_name TEXT
    CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 40);

COMMENT ON COLUMN opinions.user_id IS 'NULL の場合は未ログイン投稿（匿名）。display_name に表示名が入る場合がある';
COMMENT ON COLUMN opinions.display_name IS '未ログイン投稿時の表示名（任意）';
COMMENT ON COLUMN opinion_comments.user_id IS 'NULL の場合は未ログイン投稿（匿名）。display_name に表示名が入る場合がある';
COMMENT ON COLUMN opinion_comments.display_name IS '未ログイン投稿時の表示名（任意）';
