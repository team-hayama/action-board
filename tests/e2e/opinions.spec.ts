import { expect, test } from "../e2e-test-helpers";

test.describe("意見投稿機能", () => {
  test("投稿 → コメント → リアクションの基本フロー", async ({
    signedInPage: page,
  }) => {
    const title = `テスト意見_${Date.now()}`;
    const body = "これはE2Eテストで投稿された意見の本文です。";
    const commentBody = "賛成です。テストコメント。";

    // 一覧ページへ
    await page.goto("/opinions");
    await expect(
      page.getByRole("heading", { level: 1, name: "意見投稿" }),
    ).toBeVisible();

    // 投稿
    await page.getByPlaceholder("タイトル（120文字以内）").fill(title);
    await page.getByPlaceholder("本文（4000文字以内）").fill(body);
    await page.getByRole("button", { name: "投稿する" }).click();

    // 詳細ページに遷移
    await expect(page).toHaveURL(/\/opinions\/[0-9a-f-]+/);
    await expect(
      page.getByRole("heading", { level: 1, name: title }),
    ).toBeVisible();
    await expect(page.getByText(body)).toBeVisible();

    // 投稿にリアクション（👍）
    const opinionThumbsUp = page
      .locator("article")
      .getByRole("button", { name: /👍/ })
      .first();
    await opinionThumbsUp.click();
    await expect(opinionThumbsUp).toHaveAttribute("aria-pressed", "true");

    // コメント投稿
    await page.getByPlaceholder("コメントを入力").fill(commentBody);
    await page.getByRole("button", { name: "コメントする" }).click();
    await expect(page.getByText(commentBody)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /コメント \(1\)/ }),
    ).toBeVisible();

    // コメントにリアクション（❤️）
    const commentReaction = page
      .locator("section")
      .getByRole("button", { name: /❤️/ })
      .last();
    await commentReaction.click();
    await expect(commentReaction).toHaveAttribute("aria-pressed", "true");

    // 一覧に戻ってコメント数とタイトルが見える
    await page.getByRole("link", { name: "← 一覧に戻る" }).click();
    await expect(page).toHaveURL("/opinions");
    await expect(page.getByRole("link", { name: title })).toBeVisible();
  });

  test("バリデーション: 空タイトルでは投稿不可", async ({
    signedInPage: page,
  }) => {
    await page.goto("/opinions");
    await page.getByPlaceholder("本文（4000文字以内）").fill("本文のみ");
    await page.getByRole("button", { name: "投稿する" }).click();
    // HTML5 required で送信が止まる、または server action がエラー返す
    await expect(page).toHaveURL("/opinions");
  });

  test("未ログインでも投稿フォームが表示され、匿名で投稿できる", async ({
    page,
  }) => {
    await page.goto("/opinions");
    await expect(page).toHaveURL("/opinions");
    await expect(
      page.getByRole("heading", { level: 1, name: "意見投稿" }),
    ).toBeVisible();
    await expect(page.getByPlaceholder(/お名前（任意/)).toBeVisible();

    const title = `匿名意見_${Date.now()}`;
    const body = "匿名ユーザーから投稿された本文です。";
    await page.getByPlaceholder(/お名前（任意/).fill("名無しさん");
    await page.getByPlaceholder("タイトル（120文字以内）").fill(title);
    await page.getByPlaceholder("本文（4000文字以内）").fill(body);
    await page.getByRole("button", { name: "投稿する" }).click();

    await expect(page).toHaveURL(/\/opinions\/[0-9a-f-]+/);
    await expect(
      page.getByRole("heading", { level: 1, name: title }),
    ).toBeVisible();
    await expect(page.getByText("名無しさん", { exact: false })).toBeVisible();
  });
});
