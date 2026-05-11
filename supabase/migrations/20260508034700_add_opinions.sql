-- 意見投稿、コメント、リアクション機能

-- 意見投稿
CREATE TABLE opinions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public_user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE opinions IS 'ユーザーが投稿する意見';

ALTER TABLE opinions ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_all_opinions ON opinions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY insert_own_opinion ON opinions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY update_own_opinion ON opinions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY delete_own_opinion ON opinions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_opinions_user_id ON opinions(user_id);
CREATE INDEX idx_opinions_created_at ON opinions(created_at DESC);

-- コメント
CREATE TABLE opinion_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opinion_id UUID NOT NULL REFERENCES opinions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public_user_profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE opinion_comments IS '意見投稿へのコメント';

ALTER TABLE opinion_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_all_opinion_comments ON opinion_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY insert_own_opinion_comment ON opinion_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY update_own_opinion_comment ON opinion_comments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY delete_own_opinion_comment ON opinion_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_opinion_comments_opinion_id ON opinion_comments(opinion_id, created_at);
CREATE INDEX idx_opinion_comments_user_id ON opinion_comments(user_id);

-- リアクション（投稿・コメント両対応）
CREATE TABLE opinion_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type TEXT NOT NULL CHECK (target_type IN ('opinion', 'comment')),
    opinion_id UUID REFERENCES opinions(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES opinion_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public_user_profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 16),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (
        (target_type = 'opinion' AND opinion_id IS NOT NULL AND comment_id IS NULL)
        OR (target_type = 'comment' AND comment_id IS NOT NULL AND opinion_id IS NULL)
    )
);

COMMENT ON TABLE opinion_reactions IS '意見投稿・コメントへの絵文字リアクション';

CREATE UNIQUE INDEX uniq_opinion_reactions_opinion
  ON opinion_reactions(opinion_id, user_id, emoji)
  WHERE target_type = 'opinion';

CREATE UNIQUE INDEX uniq_opinion_reactions_comment
  ON opinion_reactions(comment_id, user_id, emoji)
  WHERE target_type = 'comment';

CREATE INDEX idx_opinion_reactions_opinion ON opinion_reactions(opinion_id) WHERE opinion_id IS NOT NULL;
CREATE INDEX idx_opinion_reactions_comment ON opinion_reactions(comment_id) WHERE comment_id IS NOT NULL;

ALTER TABLE opinion_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_all_opinion_reactions ON opinion_reactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY insert_own_opinion_reaction ON opinion_reactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY delete_own_opinion_reaction ON opinion_reactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION set_updated_at_opinions()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_opinions_updated_at
  BEFORE UPDATE ON opinions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_opinions();

CREATE TRIGGER trg_opinion_comments_updated_at
  BEFORE UPDATE ON opinion_comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_opinions();
