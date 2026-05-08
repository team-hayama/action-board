// Mock mailgun.js before importing the service
const mockCreate = jest.fn();
const mockClient = jest.fn(() => ({
  messages: { create: mockCreate },
}));
const mockMailgunConstructor = jest.fn().mockImplementation(() => ({
  client: mockClient,
}));

jest.mock("mailgun.js", () => ({
  __esModule: true,
  default: mockMailgunConstructor,
}));

// Required env vars (checked at module load)
process.env.MAILGUN_API_KEY = "test-api-key";
process.env.MAILGUN_DOMAIN = "example.com";

describe("mail service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("sendMail", () => {
    it("mailgun.messages.createを正しい引数で呼ぶ", async () => {
      mockCreate.mockResolvedValue({ id: "msg-1" });
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      const { sendMail } = require("./mail");
      await sendMail({
        to: "user@example.com",
        subject: "Hello",
        html: "<p>Hi</p>",
      });

      expect(mockCreate).toHaveBeenCalledWith("example.com", {
        from: '"チームはやま" <noreply@example.com>',
        to: "user@example.com",
        subject: "Hello",
        html: "<p>Hi</p>",
      });
      expect(logSpy).toHaveBeenCalledWith("Mailgun response:", { id: "msg-1" });

      logSpy.mockRestore();
    });

    it("送信失敗時はエラーをログして再スローする", async () => {
      const err = new Error("network");
      mockCreate.mockRejectedValue(err);
      const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const { sendMail } = require("./mail");

      await expect(
        sendMail({
          to: "user@example.com",
          subject: "x",
          html: "y",
        }),
      ).rejects.toThrow("network");

      expect(errSpy).toHaveBeenCalledWith("Mailgun error:", err);
      errSpy.mockRestore();
    });
  });

  describe("sendWelcomeMail", () => {
    it("インラインテンプレートでウェルカムメールを送信する", async () => {
      mockCreate.mockResolvedValue({ id: "msg-welcome" });
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      const { sendWelcomeMail } = require("./mail");
      await sendWelcomeMail("new@example.com");

      expect(mockCreate).toHaveBeenCalledWith(
        "example.com",
        expect.objectContaining({
          to: "new@example.com",
          subject:
            "「チームはやま」アクションボードに登録いただきありがとうございます",
          html: expect.stringContaining("チームはやま"),
        }),
      );

      logSpy.mockRestore();
    });
  });
});
