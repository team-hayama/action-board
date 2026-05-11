"use client";

import { useTransition } from "react";
import {
  deleteCommentAction,
  deleteOpinionAction,
} from "@/app/actions/opinions";
import { Button } from "@/components/ui/button";

type Props =
  | { kind: "opinion"; opinionId: string }
  | { kind: "comment"; commentId: string; opinionId: string };

export function DeleteButton(props: Props) {
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    const message =
      props.kind === "opinion"
        ? "この投稿を削除しますか？"
        : "このコメントを削除しますか？";
    if (!confirm(message)) return;
    startTransition(async () => {
      if (props.kind === "opinion") {
        await deleteOpinionAction(props.opinionId);
      } else {
        await deleteCommentAction(props.commentId, props.opinionId);
      }
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={pending}
    >
      {pending ? "削除中..." : "削除"}
    </Button>
  );
}
