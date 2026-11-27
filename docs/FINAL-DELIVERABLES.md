# Final deliverables

What is in mickeychan.in, how it is put together, and what still needs someone outside the codebase to set up.

## 1. Architecture

Next.js 16 App Router with React 19, deployed on Vercel. There is no SQL database and no ORM.

- **Persistence:** `lib/kv.js` wraps Vercel KV behind `kvGet`, `kvSet`, `kvPush`, `kvRange`, `kvHash*` and falls back to a per-process `Map` when `KV_REST_API_URL` and `KV_REST_API_TOKEN` are absent, which is what local development and the smoke suite use.
- **Records:** `lib/record-store.js` stores each entity as a hash field (`members:registered:records`, `enquiries:records`, `ideas:records`, `applications` per form). Old single-value keys are read on every call, copied into the hash and dropped, so the move to hashes migrated itself. `kvHashSetOnce` gives create-if-absent semantics, which is how username and email uniqueness is enforced.
- **Provisioned accounts:** `data/users.json` is imported at build time and wins over stored records for the handles it lists. The super owner only exists there.
- **Content:** YouTube data is fetched through `lib/content.js` and cached in KV with TTLs plus fetch `revalidate`, with a guard that keeps the previous list when a refresh returns suspiciously few videos.
- **Auth:** HMAC-SHA256 signed cookies. Members use `mc_member_session` (30 days), the console uses `mc_admin_session` (12 hours), OAuth state lives in short-lived cookies. Passwords use `crypto.scryptSync` with a random salt. Cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` outside development.
- **Authorization:** `lib/admin-guard.js` `authorize(permission)` and `authorizeAny([...])` read the session, resolve the role through `lib/roles.js` and check the permission list server side. Pages and routes never trust the client.
- **Files:** avatars and form-builder uploads are validated and stored as data URLs through the KV layer. Nothing writes to the filesystem.
- **Logging:** `lib/activity-log.js` records website and console events with actor, action, detail and timestamp. Addresses are still recorded there, but the console no longer returns or shows them.
- **Edge gate:** `proxy.js` (Next Proxy middleware) rejects mutating requests whose `Origin` or `Sec-Fetch-Site` do not match the host, and serves the maintenance screen while the site is closed.

## 2. Inspected routes and existing features

Pages: `/`, `/videos`, `/videos/[id]`, `/channels/[handle]`, `/hub`, `/community/[username]`, `/forums`, `/forums/[id]`, `/forums/new`, `/ideas`, `/polls`, `/events`, `/announcements`, `/stories`, `/stories/[slug]`, `/studio`, `/positions`, `/join`, `/contact`, `/socials`, `/search`, `/sitemap`, `/login`, `/register`, `/verify`, `/forgot-password`, `/my-account`, `/admin`, `/audit`, `/form-builder`, `/form-builder/[id]`, `/form-builder/apply/[id]`, `/maintenance`.

API groups: `/api/auth/*` (member login, register, verify, password request and reset, Google and Discord callbacks, console login and logout), `/api/account` (details, avatar, deletion), `/api/admin/*` (accounts, admins, activity, announcements, applications, backup, blacklist, content, enquiries, events, home, ideas, maintenance, messages, polls, reports, roles, socials, stories, studio, submissions), `/api/announcements`, `/api/applications`, `/api/contact`, `/api/form`, `/api/form-builder/forms` and uploads, `/api/forums`, `/api/ideas`, `/api/join`, `/api/notifications`, `/api/polls`, `/api/profile`, `/api/reports`, `/api/cron/snapshot`.

Existing behaviour includes the video library with search, filters and sorting, dedicated video pages with structured data, channel pages, the community hub, opt-in public profiles, forums with categories, pin, lock and delete, polls, events, announcements, an ideas board with backing, stories, the studio page, recruitment with forms and application review, contact enquiries, notifications, maintenance mode, the form builder, the audit log, roles and permissions, and the console tabs that manage all of it.

### Admin console modules

Status of the twenty modules from the additional master requirement, including the ones left out on purpose.

1. Admin Overview Dashboard: not built. The tab bar carries counts; there is no separate overview screen.
2. Website Content Management: built. Home page, Announcements, Stories, Studio, Socials, Events, Polls and Ideas panels, plus `/api/admin/content` for the video list.
3. User Management: built. Accounts panel with details, password, delete, form blocking, duplicate badges.
4. Roles and Permissions: built. Admins and Roles panels over 49 granular permissions.
5. Recruitment Management: built. Applications, Forms and Messages panels, including review and clearing.
6. ARG Management: excluded by request. No ARG code exists anywhere in the project.
7. Announcement and Notification Management: announcements built. Notification management is excluded by request and has no console screen. The member notification bell is a separate member feature and stays.
8. Contact and Support Inbox: built. Enquiries panel with status and notes, plus join us messages.
9. Community Moderation: built. Reports panel, forum pin, lock and delete, ideas moderation, account form blocking.
10. Website Appearance Editor: excluded by request. No appearance screen exists; `lib/skin.js` is runner geometry, not theme editing.
11. Media Library: excluded by request. Avatars and form attachments are stored with the record that owns them, with no shared library.
12. Website Analytics: not built. There is no traffic or engagement reporting; the audit log is the only activity record.
13. System Health and Diagnostics: not built.
14. Backup and Maintenance Center: maintenance mode is built. Backup is an API route plus the daily snapshot cron with no console screen.
15. Audit and Security Center: built. The `/audit` page and the activity API.
16. Global Admin Search: built. The command palette with keyboard shortcuts.
17. Quick Actions: partly. The palette switches tabs and runs the shortcuts; there is no separate quick action strip.
18. Scheduled Tasks: not built as a screen. The snapshot runs from `/api/cron/snapshot` on the host schedule.
19. Draft and Revision Management: excluded by request. Stories have a draft status and announcements can be scheduled, but there is no revision history or restore.
20. Integration Management: excluded by request. No integration screen.

## 3. Features added in this engagement

- Forum reporting with a moderator queue (Reports tab, open and handled, dedupe, 5 an hour per member).
- Self-serve account deletion with a confirmation dialog, session cleanup, reserved handle and audit entry.
- Duplicate account detection in the console (`Email also on @x`, `Username also on @x`, Duplicates count) and a sign-in method owner named on email clashes.
- Legacy record absorption so accounts written before the KV migration stay visible and still block duplicates.
- Per-area permissions, including forum moderation as its own grant.
- Console search palette with keyboard shortcuts, extended to the public search, with the mobile drawer collapsed to one field.
- One-press chaining of form questions.
- Shared scroll lock across dialogs, drawer and video player, and a keyboard-aware auth layout.
- Admin heading naming the active tab, and a phone layout for the console.
- Removal of the studio team roster, including the stored model, so old payloads are dropped on save.
- Removal of visitor addresses from the accounts and audit views and from the API payloads.
- Usernames in the console shown in their stored case.
- SEO and performance pass: `noindex` on private pages, corrected sitemap and robots, breadcrumb structured data, escaped JSON-LD, lazy avatars, font preconnect, root error screen.
- Accessibility pass: skip link, `aria-current` on navigation, focus trapping in the shared dialogs.
- Data retention in the daily snapshot: activity older than 180 days, handled reports older than 90.

## 4. Modified existing features

- Accounts and activity payloads no longer contain `ips`, `location` or the address fields, while the records keep them.
- The studio page and console lost the team editor; `lib/studio.js` no longer normalizes a `team` key.
- The sitemap no longer lists sign-in, registration or account pages, and now lists `/hub`, `/polls`, `/events` and `/ideas`.
- `robots.js` also disallows `/search` and `/maintenance`.
- The shared confirm and prompt dialogs now trap Tab and restore focus.
- `deleteMember` takes `{ keepHandle }`, which the self-deletion path uses to tombstone the handle.
- `/my-account` gained a delete card; the public profile toggle, details form and photo tools are unchanged.

## 5. Database migrations

No schema and no SQL. Migration is the read-through absorption in `lib/record-store.js`, which is idempotent and runs on the first read after deploy. Deleted members are tombstoned so their handles cannot be claimed, and duplicate-email accounts that predate the uniqueness check remain in place with a console badge rather than being merged or dropped automatically.

## 6. API endpoints

Every route below is same-origin guarded for mutations by the middleware unless it is a callback.

- Public reads: `GET /api/announcements`, `/api/polls`, `/api/ideas`, `/api/notifications`, `/api/profile`, `/api/form-builder/forms/[id]`, `/api/form-builder/uploads/[id]`.
- Member writes (session required): `POST /api/account/avatar`, `DELETE /api/account/avatar`, `PATCH /api/account/profile`, `DELETE /api/account`, `POST /api/applications`, `POST /api/join`, `POST /api/contact`, `POST /api/form`, `POST /api/polls`, `POST /api/ideas`, `POST /api/forums`, `POST /api/forums/[id]`, `PATCH` and `DELETE /api/forums/[id]` (moderators), `POST /api/reports`, `POST /api/profile`, notification reads.
- Auth: `POST /api/auth/member` (sign in), `POST /api/auth/member/logout`, `POST /api/auth/register`, `POST /api/auth/verify/otp`, `POST /api/auth/verify/confirm`, `POST /api/auth/password/request`, `POST /api/auth/password/reset`, `GET /api/auth/google` and `/api/auth/google/callback`, `GET /api/auth/discord` and `/api/auth/discord/callback`, `POST /api/auth/login` (console), `POST /api/auth/logout`.
- Console reads and writes, each gated on the permission shown: accounts (`accounts.view`, `.create`, `.password`, `.delete`, `.block`), admins (`admins.view`, `admins.manage`), activity (`audit.view`), announcements (`announcements.view`, `.create`, `.delete`), applications (`applications.view`, `.review`, `.delete`, `.clear`), backup (`admins.manage`), content and videos (`videos.view`, `videos.edit`), enquiries (`enquiries.view`, `.manage`, `.delete`), events (`events.view`, `.create`, `.delete`), home (`home.view`, `.edit`), ideas (`ideas.view`, `.moderate`, `.delete`), maintenance (`site.maintenance`), messages (`messages.delete`), polls (`polls.view`, `.create`, `.delete`), reports (`forums.moderate`), roles (`roles.view`, `roles.manage`), socials (`socials.view`, `.edit`), stories (`stories.view`, `.edit`), studio (`studio.view`, `.edit`), submissions (any of applications, messages, forms or accounts view).
- Automation: `GET /api/cron/snapshot` with `Authorization: Bearer $CRON_SECRET`, which stores a backup, keeps 14 snapshots and applies the retention windows.

## 7. Environment variables

- `ADMIN_PASSWORD` (required): the shared console password.
- `SESSION_SECRET` (required): signs member and console cookies. Falls back to `ADMIN_PASSWORD` if unset, which is not recommended.
- `KV_REST_API_URL`, `KV_REST_API_TOKEN` (required in production): injected by Vercel KV. Without them, data lives in process memory.
- `RESEND_API_KEY` (required for password sign-up): sends confirmation codes. Without it, username and password registration returns a setup message.
- `MAIL_FROM` (optional): sender for those emails.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (optional): Google sign-in.
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI` (optional): Discord sign-in.
- `SITE_URL` (optional): canonical origin for links; defaults to the request host.
- `CRON_SECRET` (required for the snapshot job): bearer token for `/api/cron/snapshot`.

## 8. External integration setup

- **Vercel KV:** create a KV store in the Vercel dashboard and connect it to the project. The URL and token arrive as environment variables; nothing else to configure.
- **Google sign-in:** create an OAuth client in Google Cloud Console, add `https://mickeychan.in/api/auth/google/callback` as an authorised redirect URI, then set the client id and secret. Only `openid`, `email` and `profile` are requested.
- **Discord sign-in:** create an application at discord.com/developers/applications, add `https://mickeychan.in/api/auth/discord/callback` under OAuth2 redirects, then set the client id and secret.
- **Confirmation email:** create a Resend API key and verify a sender domain for `MAIL_FROM`.
- **Daily snapshot:** add a Vercel Cron entry calling `/api/cron/snapshot` with the `CRON_SECRET` bearer token.

## 9. Security and permissions

- Every console operation calls `authorize` before touching data, and every member write reads the session cookie server side.
- Roles are custom: the super owner is hardcoded in `lib/roles.js` and cannot be deleted or renamed, and the console can build further roles from the permission groups (49 individual permissions across console, site, applications, messages, forms, accounts, announcements, polls, events, ideas, enquiries, home, stories, studio, socials, videos, forums, admins and roles).
- Mutating requests are rejected with 403 when the browser origin does not match, which covers CSRF for the cookie-authenticated forms.
- Rate limits: console and member sign-in, registration, password request and reset, confirmation codes, contact messages (per address and per email), forum threads and replies, and reports.
- Private data: public profiles expose name, handle, photo and ideas only; `publicMember` never includes email or phone. Admin payloads no longer carry addresses. Private pages send `noindex`.
- Audit: every console mutation is recorded with actor and detail. The console itself cannot edit log entries.
- Retention: activity 180 days, handled reports 90 days, both applied by the snapshot job. Blocked submissions and blacklist entries are managed from the console.
- Reporting: members can flag a thread or reply, and moderators resolve or delete reports from the console.

## 10. Testing results

- `npx next build`: passes with no errors.
- `npm run data-model`: 26 of 26 checks pass (record store reads through the legacy keys, concurrent sign-ups survive, password changes, deletes and tombstones).
- `npm run smoke`: 40 of 40 checks pass. It needs a fixture owner in `data/users.json`, which is bundled at build time, so the order is `npm run smoke:seed`, `npx next build`, `npm run smoke`; restore `data/users.json` afterwards so the fixture never ships. Covered: page rendering, anonymous rejection, password policy, reserved owner handle, registration, member and console sign-in, console rejection with a bad password, admin API access, address-free accounts and activity payloads, robots and sitemap contents, noindex on search, skip link and main landmark, forum thread creation, admin-created member, report creation, dedupe, moderator handling and deletion, self-deletion confirmation, session cleared, handle reserved, 404s, logout methods, and login throttling.
- Manual checks during the work: deletion end to end (wrong confirm 400, correct 200, old cookie resolves to `member:null`, password login refused, handle reserved), report flow (401 anonymous, 400 own post, 403 cross-origin, queue read and resolve), IP removal (0 `ips`, `location` and `ip` keys in the two console payloads while the stored record kept its address), SEO output (`/robots.txt`, `/sitemap.xml`, `noindex` meta, breadcrumb JSON-LD).
- Not run here: real Google and Discord round trips (no provider credentials), Resend email delivery, a real KV instance, cross-browser and screen-reader passes, and visual review at 320, 768 and 1440 px.

## 11. Known limitations

- Without KV configured, data is per-process memory: it disappears on restart and differs between worker instances. Production needs the KV variables.
- The super owner account can only come from `data/users.json`, so adding one requires a deploy.
- Moderation actions still happen in the thread (pin, lock, delete). The Reports queue records what was flagged but does not remove content itself.
- Enquiries, applications and join messages are kept indefinitely; only activity and handled reports have a retention window.
- Self-deletion removes the profile, photo, settings and notifications. Forum posts and past applications stay, attributed to a handle that can no longer be registered by anyone.
- Console lists (accounts, applications, enquiries) load in full and are bounded by caps rather than paged; only the audit log pages.
- Admin email and phone are visible to roles with `accounts.view`; there is no per-field redaction.
- Form-builder uploads and avatars live in KV as data URLs, so they are size-capped, not streamed to object storage.
- No CI job runs the smoke suite; it needs the fixture owner and a build, so it currently runs by hand.
- Not built from the wider brief: the ARG portal (storylines, puzzles, clues, progress), playlists, watch history and watch later, achievements, leaderboards and job drafts. Nothing there is stubbed to look finished.
- Console modules left out at the owner's request: ARG Management (6), the notification half of Announcement and Notification Management (7), Website Appearance Editor (10), Media Library (11), Draft and Revision Management (19) and Integration Management (20). The module status list in section 2 records what exists for each of the twenty.
- The home page "Featured members" strip is separate from the removed studio team roster and remains in place.

## 12. Still needs external configuration

- Vercel KV variables, otherwise nothing persists.
- `ADMIN_PASSWORD` and `SESSION_SECRET` in the hosting environment.
- Resend key and sender, otherwise password sign-up stays paused.
- Google and Discord OAuth clients if those buttons should work.
- A cron entry with `CRON_SECRET` for the daily snapshot and retention.
- A production deploy of `main`, since every change so far is only in the repository.
