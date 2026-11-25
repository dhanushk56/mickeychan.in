import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { memberFromCookieStore } from "@/lib/members";
import { clientKey, requestIps, requestLocation } from "@/lib/request-ips";
import { limitReached, recordHit } from "@/lib/rate-limit";
import { categoryMeta, createEnquiry, enquiryProblem, isEnquiryCategory } from "@/lib/enquiries";
import { logActivity } from "@/lib/activity-log";
import { enquiryConfirmation, isEmailConfigured, sendEmail } from "@/lib/email";
import { CLOSED_ERROR, submissionsClosed } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

const IP_LIMIT = { max: 6, windowMs: 60 * 60 * 1000 };
const EMAIL_LIMIT = { max: 3, windowMs: 60 * 60 * 1000 };
const MIN_FILL_MS = 1200;

function originAllowed(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const hosts = [
      request.headers.get("host"),
      request.headers.get("x-forwarded-host"),
      new URL(request.url).host,
    ].filter(Boolean);
    return hosts.includes(new URL(origin).host);
  } catch {
    return false;
  }
}

export async function POST(request) {
  if (await submissionsClosed()) {
    return NextResponse.json({ error: CLOSED_ERROR }, { status: 503 });
  }

  if (!originAllowed(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const category = isEnquiryCategory(body.category) ? body.category : "general";

  // A hidden field and a minimum fill time: bots fill everything instantly.
  if (typeof body.company === "string" && body.company.trim()) {
    return NextResponse.json({ error: "That didn't look like a real message." }, { status: 400 });
  }
  const startedAt = Number(body.startedAt);
  if (Number.isFinite(startedAt) && startedAt > 0 && Date.now() - startedAt < MIN_FILL_MS) {
    return NextResponse.json({ error: "That didn't look like a real message." }, { status: 400 });
  }

  const problem = enquiryProblem({ name, email, subject, message });
  if (problem) {
    return NextResponse.json({ error: problem }, { status: 400 });
  }

  const ipKey = `contact-ip:${clientKey(request)}`;
  const emailKey = `contact-email:${email}`;
  const [byIp, byEmail] = await Promise.all([
    limitReached(ipKey, "contact", IP_LIMIT),
    limitReached(emailKey, "contact", EMAIL_LIMIT),
  ]);
  if (byIp.limited || byEmail.limited) {
    return NextResponse.json(
      {
        error: "You've sent a few messages already. Give it an hour, or email business@mickeychan.in directly.",
      },
      { status: 429, headers: { "Retry-After": String(byIp.retryAfter || byEmail.retryAfter) } }
    );
  }

  const member = await memberFromCookieStore(cookies());
  const location = requestLocation(request);
  const ips = requestIps(request);

  const enquiry = await createEnquiry({
    name,
    email,
    category,
    subject,
    message,
    memberUsername: member?.username || null,
    ip: ips[0] || null,
    city: location?.city || null,
    country: location?.country || null,
  });

  if (!enquiry) {
    return NextResponse.json(
      { error: "Could not save your message. Please try again, or email business@mickeychan.in." },
      { status: 500 }
    );
  }

  await Promise.all([
    recordHit(ipKey, "contact", IP_LIMIT),
    recordHit(emailKey, "contact", EMAIL_LIMIT),
  ]);

  await logActivity({
    area: "website",
    action: "enquiry",
    username: member?.username || name,
    detail: `Contact enquiry ${enquiry.reference} (${categoryMeta(category).label}): "${subject}"`,
    request,
  });

  let emailed = false;
  if (isEmailConfigured()) {
    const template = enquiryConfirmation({
      name,
      reference: enquiry.reference,
      subject,
      category: categoryMeta(category).label,
    });
    const result = await sendEmail({ to: email, ...template });
    emailed = result?.ok === true;
  }

  return NextResponse.json(
    { ok: true, reference: enquiry.reference, emailed },
    { headers: { "Cache-Control": "no-store" } }
  );
}
