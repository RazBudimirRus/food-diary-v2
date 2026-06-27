import nodemailer from "nodemailer";

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim()
    && process.env.SMTP_USER?.trim()
    && process.env.SMTP_PASS?.trim(),
  );
}

function smtpPort(): number {
  const parsed = Number(process.env.SMTP_PORT || 587);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 587;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!isSmtpConfigured()) {
    throw new Error("SMTP is not configured");
  }

  const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER!.trim();
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort(),
    secure: smtpPort() === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from,
    to,
    subject: "Сброс пароля — Food Diary",
    text: [
      "Вы запросили сброс пароля для дневника питания.",
      "",
      `Перейдите по ссылке (действует 1 час):`,
      resetUrl,
      "",
      "Если вы не запрашивали сброс, просто проигнорируйте это письмо.",
    ].join("\n"),
    html: [
      "<p>Вы запросили сброс пароля для дневника питания.</p>",
      `<p><a href="${resetUrl}">Сбросить пароль</a></p>`,
      "<p>Ссылка действует 1 час.</p>",
      "<p>Если вы не запрашивали сброс, просто проигнорируйте это письмо.</p>",
    ].join(""),
  });
}
