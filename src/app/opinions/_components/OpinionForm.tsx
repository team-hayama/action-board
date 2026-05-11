"use client";

import { useActionState } from "react";
import { createOpinionAction } from "@/app/actions/opinions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function OpinionForm({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [state, action, pending] = useActionState(createOpinionAction, null);

  return (
    <form action={action} className="space-y-3 rounded-lg border p-4">
      <h2 className="font-semibold">意見を投稿する</h2>
      {!isLoggedIn && (
        <Input
          name="display_name"
          placeholder="お名前（任意・40文字以内）"
          maxLength={40}
        />
      )}
      <Input
        name="title"
        placeholder="タイトル（120文字以内）"
        maxLength={120}
        required
      />
      <textarea
        name="body"
        placeholder="本文（4000文字以内）"
        maxLength={4000}
        rows={5}
        required
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {!isLoggedIn && (
        <p className="text-xs text-muted-foreground">
          ログインせずに投稿できます。投稿後の編集・削除・リアクションにはログインが必要です。
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "投稿中..." : "投稿する"}
        </Button>
      </div>
    </form>
  );
}
