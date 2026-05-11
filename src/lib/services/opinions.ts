import "server-only";

import { createAdminClient } from "@/lib/supabase/adminClient";
import { createClient } from "@/lib/supabase/client";
import type {
  CommentWithAuthor,
  Opinion,
  OpinionAuthor,
  OpinionComment,
  OpinionReaction,
  OpinionWithAuthor,
  ReactionSummary,
} from "@/lib/types/opinions";

// 生成された Database 型に未反映のため、DB 操作のみ any キャストで読む。
// 型は src/lib/types/opinions.ts で明示的に保証する。
// supabase types regen で正式な型に置き換えられる想定。
// biome-ignore lint/suspicious/noExplicitAny: PostgrestBuilder の連鎖メソッドを型安全に定義し直すコストが高いため、ここだけ any を許容する。
type AnyQueryBuilder = any;
function db(client: { from: (table: string) => unknown }) {
  return client as unknown as {
    from: (table: string) => AnyQueryBuilder;
  };
}

function summarizeReactions(
  reactions: Pick<OpinionReaction, "emoji" | "user_id">[],
  myUserId: string | null,
): ReactionSummary[] {
  const map = new Map<string, { count: number; reactedByMe: boolean }>();
  for (const r of reactions) {
    const entry = map.get(r.emoji) ?? { count: 0, reactedByMe: false };
    entry.count += 1;
    if (myUserId && r.user_id === myUserId) entry.reactedByMe = true;
    map.set(r.emoji, entry);
  }
  return Array.from(map.entries()).map(([emoji, v]) => ({
    emoji,
    count: v.count,
    reacted_by_me: v.reactedByMe,
  }));
}

async function fetchAuthorMap(
  userIds: (string | null)[],
): Promise<Map<string, OpinionAuthor>> {
  const map = new Map<string, OpinionAuthor>();
  const ids = Array.from(
    new Set(userIds.filter((id): id is string => Boolean(id))),
  );
  if (ids.length === 0) return map;
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("public_user_profiles")
    .select("id, name, avatar_url, address_prefecture")
    .in("id", ids);
  for (const u of (data ?? []) as OpinionAuthor[]) {
    map.set(u.id, u);
  }
  return map;
}

async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function listOpinions(limit = 50): Promise<OpinionWithAuthor[]> {
  const supabase = await createAdminClient();
  const myUserId = await getCurrentUserId();

  const { data: opinions } = await db(supabase)
    .from("opinions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  const list = ((opinions ?? []) as Opinion[]) || [];
  if (list.length === 0) return [];

  const ids = list.map((o) => o.id);
  const userIds = list.map((o) => o.user_id);

  const [{ data: comments }, { data: reactions }, authorMap] =
    await Promise.all([
      db(supabase)
        .from("opinion_comments")
        .select("opinion_id")
        .in("opinion_id", ids),
      db(supabase)
        .from("opinion_reactions")
        .select("opinion_id, emoji, user_id")
        .eq("target_type", "opinion")
        .in("opinion_id", ids),
      fetchAuthorMap(userIds),
    ]);

  const commentCounts = new Map<string, number>();
  for (const c of (comments ?? []) as { opinion_id: string }[]) {
    commentCounts.set(c.opinion_id, (commentCounts.get(c.opinion_id) ?? 0) + 1);
  }

  const reactionsByOpinion = new Map<
    string,
    Pick<OpinionReaction, "emoji" | "user_id">[]
  >();
  for (const r of (reactions ?? []) as {
    opinion_id: string;
    emoji: string;
    user_id: string;
  }[]) {
    const arr = reactionsByOpinion.get(r.opinion_id) ?? [];
    arr.push({ emoji: r.emoji, user_id: r.user_id });
    reactionsByOpinion.set(r.opinion_id, arr);
  }

  return list.map((o) => ({
    ...o,
    author: o.user_id ? (authorMap.get(o.user_id) ?? null) : null,
    comment_count: commentCounts.get(o.id) ?? 0,
    reactions: summarizeReactions(reactionsByOpinion.get(o.id) ?? [], myUserId),
  }));
}

export async function getOpinion(opinionId: string): Promise<{
  opinion: OpinionWithAuthor;
  comments: CommentWithAuthor[];
} | null> {
  const supabase = await createAdminClient();
  const myUserId = await getCurrentUserId();

  const { data: opinion } = await db(supabase)
    .from("opinions")
    .select("*")
    .eq("id", opinionId)
    .maybeSingle();

  if (!opinion) return null;
  const op = opinion as Opinion;

  const [{ data: comments }, { data: opinionReactions }] = await Promise.all([
    db(supabase)
      .from("opinion_comments")
      .select("*")
      .eq("opinion_id", opinionId)
      .order("created_at", { ascending: true }),
    db(supabase)
      .from("opinion_reactions")
      .select("opinion_id, comment_id, emoji, user_id, target_type")
      .or(`opinion_id.eq.${opinionId},and(target_type.eq.comment)`),
  ]);

  const commentList = ((comments ?? []) as OpinionComment[]) || [];
  const commentIds = new Set(commentList.map((c) => c.id));

  const userIds = [op.user_id, ...commentList.map((c) => c.user_id)];
  const authorMap = await fetchAuthorMap(userIds);

  const allReactions = (
    (opinionReactions ?? []) as (OpinionReaction & {
      target_type: "opinion" | "comment";
    })[]
  ).filter((r) =>
    r.target_type === "opinion"
      ? r.opinion_id === opinionId
      : r.comment_id !== null && commentIds.has(r.comment_id),
  );

  const opinionReactionList = allReactions.filter(
    (r) => r.target_type === "opinion",
  );
  const commentReactionsMap = new Map<
    string,
    Pick<OpinionReaction, "emoji" | "user_id">[]
  >();
  for (const r of allReactions.filter((r) => r.target_type === "comment")) {
    if (!r.comment_id) continue;
    const arr = commentReactionsMap.get(r.comment_id) ?? [];
    arr.push({ emoji: r.emoji, user_id: r.user_id });
    commentReactionsMap.set(r.comment_id, arr);
  }

  const opinionWithAuthor: OpinionWithAuthor = {
    ...op,
    author: op.user_id ? (authorMap.get(op.user_id) ?? null) : null,
    comment_count: commentList.length,
    reactions: summarizeReactions(opinionReactionList, myUserId),
  };

  const commentsWithAuthors: CommentWithAuthor[] = commentList.map((c) => ({
    ...c,
    author: c.user_id ? (authorMap.get(c.user_id) ?? null) : null,
    reactions: summarizeReactions(
      commentReactionsMap.get(c.id) ?? [],
      myUserId,
    ),
  }));

  return { opinion: opinionWithAuthor, comments: commentsWithAuthors };
}

export async function createOpinion(input: {
  userId: string | null;
  displayName: string | null;
  title: string;
  body: string;
}): Promise<{ id: string }> {
  const supabase = await createAdminClient();
  const { data, error } = await db(supabase)
    .from("opinions")
    .insert({
      user_id: input.userId,
      display_name: input.userId ? null : input.displayName,
      title: input.title,
      body: input.body,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "投稿に失敗しました");
  return { id: (data as { id: string }).id };
}

export async function deleteOpinion(input: {
  userId: string;
  opinionId: string;
}): Promise<void> {
  const supabase = await createAdminClient();
  const { error } = await db(supabase)
    .from("opinions")
    .delete()
    .eq("id", input.opinionId)
    .eq("user_id", input.userId);
  if (error) throw new Error(error.message);
}

export async function createComment(input: {
  userId: string | null;
  displayName: string | null;
  opinionId: string;
  body: string;
}): Promise<void> {
  const supabase = await createAdminClient();
  const { error } = await db(supabase)
    .from("opinion_comments")
    .insert({
      user_id: input.userId,
      display_name: input.userId ? null : input.displayName,
      opinion_id: input.opinionId,
      body: input.body,
    });
  if (error) throw new Error(error.message);
}

export async function deleteComment(input: {
  userId: string;
  commentId: string;
}): Promise<void> {
  const supabase = await createAdminClient();
  const { error } = await db(supabase)
    .from("opinion_comments")
    .delete()
    .eq("id", input.commentId)
    .eq("user_id", input.userId);
  if (error) throw new Error(error.message);
}

export async function toggleReaction(input: {
  userId: string;
  targetType: "opinion" | "comment";
  targetId: string;
  emoji: string;
}): Promise<{ added: boolean }> {
  const supabase = await createAdminClient();

  const idColumn = input.targetType === "opinion" ? "opinion_id" : "comment_id";

  const { data: existing } = await db(supabase)
    .from("opinion_reactions")
    .select("id")
    .eq("target_type", input.targetType)
    .eq(idColumn, input.targetId)
    .eq("user_id", input.userId)
    .eq("emoji", input.emoji)
    .maybeSingle();

  if (existing) {
    const { error } = await db(supabase)
      .from("opinion_reactions")
      .delete()
      .eq("id", (existing as { id: string }).id);
    if (error) throw new Error(error.message);
    return { added: false };
  }

  const row = {
    target_type: input.targetType,
    user_id: input.userId,
    emoji: input.emoji,
    opinion_id: input.targetType === "opinion" ? input.targetId : null,
    comment_id: input.targetType === "comment" ? input.targetId : null,
  };
  const { error } = await db(supabase).from("opinion_reactions").insert(row);
  if (error) throw new Error(error.message);
  return { added: true };
}
