import Image from "next/image";
import Link from "next/link";
import { OpinionForm } from "@/app/opinions/_components/OpinionForm";
import { ReactionBar } from "@/app/opinions/_components/ReactionBar";
import { listOpinions } from "@/lib/services/opinions";
import { createClient } from "@/lib/supabase/client";
import { generateRootMetadata } from "@/lib/utils/metadata";

export const dynamic = "force-dynamic";

export const generateMetadata = generateRootMetadata;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP");
}

function authorLabel(o: {
  author: { name: string | null } | null;
  display_name: string | null;
}) {
  return o.author?.name ?? o.display_name ?? "匿名";
}

export default async function Home(_props: {
  searchParams: Promise<{ ref?: string; preview?: string }>;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = Boolean(user);

  const opinions = await listOpinions();

  return (
    <div className="flex flex-col min-h-screen w-full">
      <section className="relative w-full bg-linear-to-b from-[#64d8c6] to-[#bcecd3] overflow-hidden mt-[-96px] pt-32 pb-12">
        <div className="relative z-10 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <Image
                src="/img/logo.png"
                alt="チームはやま"
                width={143}
                height={120}
                sizes="100vw"
                className="h-[96px] w-auto"
                priority
              />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
              アクションボード
            </h1>
            <p className="text-sm md:text-base font-bold text-gray-800 mb-6 px-3">
              テクノロジーで政治をかえる。あなたと一緒に未来をつくる。
            </p>
            <p className="text-sm md:text-base text-gray-800/90 px-3">
              まずはあなたのご意見を聞かせてください。
              <br className="hidden sm:block" />
              葉山町をもっと良くするためのアイデア・困りごと・要望を、
              ログインなしで投稿できます。
            </p>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12 bg-background">
        <div className="mx-auto max-w-3xl space-y-6 p-4">
          <h2 className="text-xl md:text-2xl font-bold">ご意見を投稿する</h2>
          <OpinionForm isLoggedIn={isLoggedIn} />

          <div className="space-y-3">
            <h3 className="text-lg font-semibold pt-4">最近のご意見</h3>
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
                <p className="line-clamp-3 whitespace-pre-wrap text-sm">
                  {o.body}
                </p>
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
      </section>
    </div>
  );
}
