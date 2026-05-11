"use client";

import { useTransition } from "react";
import { toggleReactionAction } from "@/app/actions/opinions";
import { REACTION_EMOJIS, type ReactionSummary } from "@/lib/types/opinions";

type Props = {
  targetType: "opinion" | "comment";
  targetId: string;
  opinionIdForRevalidate: string;
  reactions: ReactionSummary[];
  disabled?: boolean;
};

export function ReactionBar({
  targetType,
  targetId,
  opinionIdForRevalidate,
  reactions,
  disabled,
}: Props) {
  const [pending, startTransition] = useTransition();
  const summaryByEmoji = new Map(reactions.map((r) => [r.emoji, r]));

  const onClick = (emoji: string) => {
    if (disabled || pending) return;
    startTransition(async () => {
      await toggleReactionAction({
        targetType,
        targetId,
        emoji,
        opinionIdForRevalidate,
      });
    });
  };

  return (
    <div className="flex flex-wrap gap-1">
      {REACTION_EMOJIS.map((emoji) => {
        const r = summaryByEmoji.get(emoji);
        const reacted = r?.reacted_by_me ?? false;
        const count = r?.count ?? 0;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onClick(emoji)}
            disabled={disabled || pending}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm transition-colors ${
              reacted
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-background hover:bg-accent"
            } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
            aria-pressed={reacted}
            aria-label={`${emoji} ${count}件`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="text-xs">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
