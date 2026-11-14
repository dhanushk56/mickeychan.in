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

export function otpEmail({ username, code }) {
  const name = String(username || "there");
  const text = [
    `Hi ${name},`,
    "",
    `Your Mickey Chan confirmation code is ${code}.`,
    "",
    "Enter it on the site to confirm your email address. The code expires in 10 minutes.",
    "If you didn't ask for it, you can ignore this message.",
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
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">Your confirmation code</h1>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#403a52">Hi ${name}, enter this code on the site to confirm your email address.</p>
                <p style="margin:0 0 20px;font-size:34px;font-weight:700;letter-spacing:.32em;color:#191627">${code}</p>
                <p style="margin:0 0 20px;font-size:12px;line-height:1.6;color:#6b6580">The code expires in 10 minutes. If you didn't ask for it, you can ignore this message.</p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6b6580">— mickeychan.in</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: `${code} is your confirmation code`, text, html };
}
