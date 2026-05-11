export type Opinion = {
  id: string;
  user_id: string | null;
  display_name: string | null;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type OpinionComment = {
  id: string;
  opinion_id: string;
  user_id: string | null;
  display_name: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};

export type OpinionReaction = {
  id: string;
  target_type: "opinion" | "comment";
  opinion_id: string | null;
  comment_id: string | null;
  user_id: string;
  emoji: string;
  created_at: string;
};

export type OpinionAuthor = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  address_prefecture: string | null;
};

export type OpinionWithAuthor = Opinion & {
  author: OpinionAuthor | null;
  comment_count: number;
  reactions: ReactionSummary[];
};

export type CommentWithAuthor = OpinionComment & {
  author: OpinionAuthor | null;
  reactions: ReactionSummary[];
};

export type ReactionSummary = {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
};

export const REACTION_EMOJIS = ["👍", "❤️", "🎉", "💡", "🤔"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];
