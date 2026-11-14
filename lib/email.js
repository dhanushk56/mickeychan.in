const SENDER = "Mickey Chan <noreply@mickeychan.in>";

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export function senderAddress() {
  return process.env.MAIL_FROM || SENDER;
}

export async function sendEmail({ to, subject, html, text }) {
  if (!isEmailConfigured()) return { error: "not_configured" };

  const base = process.env.RESEND_API_URL || "https://api.resend.com";
  try {
    const response = await fetch(`${base.replace(/\/+$/, "")}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: senderAddress(), to: [to], subject, html, text }),
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("email send failed", response.status, detail.slice(0, 200));
      return { error: "send_failed" };
    }
    return { ok: true };
  } catch (error) {
    console.error("email send failed", error?.message || error);
    return { error: "send_failed" };
  }
}

export function verificationEmail({ username, url }) {
  const name = String(username || "there");
  const text = [
    `Hi ${name},`,
    "",
    "Confirm this email address to finish creating your Mickey Chan site account:",
    "",
    url,
    "",
    "The link works for 24 hours and can be used once.",
    "If you didn't create an account, you can ignore this message.",
    "",
    "— mickeychan.in",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f4ff;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#191627">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e3dcff;border-radius:16px;padding:32px">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#6d54c8">Mickey Chan</p>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">Confirm your email address</h1>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#403a52">Hi ${name}, click the button below to finish creating your site account.</p>
                <p style="margin:0 0 24px">
                  <a href="${url}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#5b2ee0;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none">Confirm email</a>
                </p>
                <p style="margin:0 0 12px;font-size:12px;line-height:1.6;color:#6b6580">The link works for 24 hours and can be used once. If the button doesn't work, paste this into your browser:</p>
                <p style="margin:0 0 20px;font-size:12px;line-height:1.6;word-break:break-all;color:#403a52">${url}</p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6b6580">If you didn't create an account, you can ignore this message.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: "Confirm your email address", text, html };
}
