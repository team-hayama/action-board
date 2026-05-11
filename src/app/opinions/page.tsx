import Link from "next/link";
import { listOpinions } from "@/lib/services/opinions";
import { createClient } from "@/lib/supabase/client";
import { OpinionForm } from "./_components/OpinionForm";
import { ReactionBar } from "./_components/ReactionBar";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "意見投稿",
  description: "ユーザーの意見投稿一覧",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP");
}

function authorLabel(o: {
  author: { name: string | null } | null;
  display_name: string | null;
}) {
  return o.author?.name ?? o.display_name ?? "匿名";
}

export default async function OpinionsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = Boolean(user);

  const opinions = await listOpinions();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">意見投稿</h1>
      <OpinionForm isLoggedIn={isLoggedIn} />
      <div className="space-y-3">
        {opinions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            まだ投稿がありません。最初の投稿をしてみましょう。
          </p>
        )}
        {opinions.map((o) => (
          <article key={o.id} className="space-y-2 rounded-lg border p-4">
            <header className="flex items-center justify-between">
              <Link
                href={`/opinions/${o.id}`}
                className="text-lg font-semibold hover:underline"
              >
                {o.title}
              </Link>
              <span className="text-xs text-muted-foreground">
                {formatDate(o.created_at)}
              </span>
            </header>
            <p className="text-sm text-muted-foreground">
              {authorLabel(o)}
              {o.author?.address_prefecture
                ? `・${o.author.address_prefecture}`
                : ""}
            </p>
            <p className="line-clamp-3 whitespace-pre-wrap text-sm">{o.body}</p>
            <div className="flex items-center justify-between gap-2">
              <ReactionBar
                targetType="opinion"
                targetId={o.id}
                opinionIdForRevalidate={o.id}
                reactions={o.reactions}
                disabled={!isLoggedIn}
              />
              <Link
                href={`/opinions/${o.id}`}
                className="text-sm text-muted-foreground hover:underline"
              >
                💬 {o.comment_count}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
