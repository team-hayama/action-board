import Link from "next/link";
import { notFound } from "next/navigation";
import { getOpinion } from "@/lib/services/opinions";
import { createClient } from "@/lib/supabase/client";
import { CommentForm } from "../_components/CommentForm";
import { DeleteButton } from "../_components/DeleteButton";
import { ReactionBar } from "../_components/ReactionBar";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP");
}

function authorLabel(o: {
  author: { name: string | null } | null;
  display_name: string | null;
}) {
  return o.author?.name ?? o.display_name ?? "匿名";
}

export default async function OpinionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = Boolean(user);

  const result = await getOpinion(id);
  if (!result) notFound();
  const { opinion, comments } = result;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <Link
        href="/opinions"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← 一覧に戻る
      </Link>
      <article className="space-y-3 rounded-lg border p-4">
        <header className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">{opinion.title}</h1>
            <p className="text-sm text-muted-foreground">
              {authorLabel(opinion)}
              {opinion.author?.address_prefecture
                ? `・${opinion.author.address_prefecture}`
                : ""}
              ・{formatDate(opinion.created_at)}
            </p>
          </div>
          {user && opinion.user_id === user.id && (
            <DeleteButton kind="opinion" opinionId={opinion.id} />
          )}
        </header>
        <p className="whitespace-pre-wrap text-base">{opinion.body}</p>
        <ReactionBar
          targetType="opinion"
          targetId={opinion.id}
          opinionIdForRevalidate={opinion.id}
          reactions={opinion.reactions}
          disabled={!isLoggedIn}
        />
      </article>

      <section className="space-y-4">
        <h2 className="font-semibold">コメント ({comments.length})</h2>
        <CommentForm opinionId={opinion.id} isLoggedIn={isLoggedIn} />
        <div className="space-y-3">
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground">
              まだコメントはありません。
            </p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {authorLabel(c)}・{formatDate(c.created_at)}
                </p>
                {user && c.user_id === user.id && (
                  <DeleteButton
                    kind="comment"
                    commentId={c.id}
                    opinionId={opinion.id}
                  />
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm">{c.body}</p>
              <ReactionBar
                targetType="comment"
                targetId={c.id}
                opinionIdForRevalidate={opinion.id}
                reactions={c.reactions}
                disabled={!isLoggedIn}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
