"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createComment,
  createOpinion,
  deleteComment,
  deleteOpinion,
  toggleReaction,
} from "@/lib/services/opinions";
import { createClient } from "@/lib/supabase/client";
import { REACTION_EMOJIS } from "@/lib/types/opinions";

async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("ログインが必要です");
  return userId;
}

function normalizeDisplayName(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 40);
}

export async function createOpinionAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const title = formData.get("title")?.toString().trim() ?? "";
  const body = formData.get("body")?.toString().trim() ?? "";
  const displayNameRaw = formData.get("display_name")?.toString() ?? "";
  if (!title) return { error: "タイトルを入力してください" };
  if (title.length > 120)
    return { error: "タイトルは120文字以内で入力してください" };
  if (!body) return { error: "本文を入力してください" };
  if (body.length > 4000)
    return { error: "本文は4000文字以内で入力してください" };

  let opinionId: string;
  try {
    const userId = await getCurrentUserId();
    const displayName = userId ? null : normalizeDisplayName(displayNameRaw);
    const created = await createOpinion({ userId, displayName, title, body });
    opinionId = created.id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "投稿に失敗しました" };
  }
  revalidatePath("/opinions");
  redirect(`/opinions/${opinionId}`);
}

export async function deleteOpinionAction(opinionId: string): Promise<void> {
  const userId = await requireUserId();
  await deleteOpinion({ userId, opinionId });
  revalidatePath("/opinions");
  redirect("/opinions");
}

export async function createCommentAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const opinionId = formData.get("opinion_id")?.toString();
  const body = formData.get("body")?.toString().trim() ?? "";
  const displayNameRaw = formData.get("display_name")?.toString() ?? "";
  if (!opinionId) return { error: "投稿が指定されていません" };
  if (!body) return { error: "コメントを入力してください" };
  if (body.length > 2000)
    return { error: "コメントは2000文字以内で入力してください" };

  try {
    const userId = await getCurrentUserId();
    const displayName = userId ? null : normalizeDisplayName(displayNameRaw);
    await createComment({ userId, displayName, opinionId, body });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "コメントに失敗しました" };
  }
  revalidatePath(`/opinions/${opinionId}`);
  return {};
}

export async function deleteCommentAction(
  commentId: string,
  opinionId: string,
): Promise<void> {
  const userId = await requireUserId();
  await deleteComment({ userId, commentId });
  revalidatePath(`/opinions/${opinionId}`);
}

export async function toggleReactionAction(input: {
  targetType: "opinion" | "comment";
  targetId: string;
  emoji: string;
  opinionIdForRevalidate: string;
}): Promise<{ error?: string }> {
  if (
    !REACTION_EMOJIS.includes(input.emoji as (typeof REACTION_EMOJIS)[number])
  ) {
    return { error: "無効なリアクションです" };
  }
  try {
    const userId = await requireUserId();
    await toggleReaction({
      userId,
      targetType: input.targetType,
      targetId: input.targetId,
      emoji: input.emoji,
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "リアクションに失敗しました",
    };
  }
  revalidatePath(`/opinions/${input.opinionIdForRevalidate}`);
  revalidatePath("/opinions");
  return {};
}
