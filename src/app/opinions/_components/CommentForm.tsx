"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCommentAction } from "@/app/actions/opinions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CommentForm({
  opinionId,
  isLoggedIn,
}: {
  opinionId: string;
  isLoggedIn: boolean;
}) {
  const [state, action, pending] = useActionState(createCommentAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && !state.error && !pending) {
      formRef.current?.reset();
    }
  }, [state, pending]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <input type="hidden" name="opinion_id" value={opinionId} />
      {!isLoggedIn && (
        <Input
          name="display_name"
          placeholder="お名前（任意・40文字以内）"
          maxLength={40}
        />
      )}
      <textarea
        name="body"
        placeholder="コメントを入力"
        maxLength={2000}
        rows={3}
        required
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "送信中..." : "コメントする"}
        </Button>
      </div>
    </form>
  );
}
