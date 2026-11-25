"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EmptyState from "@/components/ui/EmptyState";
import { ideaStatusMeta } from "@/lib/ideas";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "applications", label: "Applications" },
];

function formatDay(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function Stat({ label, value, hint }) {
  return (
    <div className="dash-stat">
      <span className="dash-stat-value">{value}</span>
      <span className="dash-stat-label">{label}</span>
      {hint && <span className="dash-stat-hint">{hint}</span>}
    </div>
  );
}

export default function DashboardShell({
  profile,
  applications = [],
  myIdeas = [],
  stats = { applications: 0, ideasPosted: 0, ideasBacked: 0 },
  achievements = { items: [], earned: 0, total: 0 },
  profileVisible = false,
  initialTab = "overview",
}) {
  const router = useRouter();
  const [tab, setTab] = useState(
    TABS.some((entry) => entry.id === initialTab) ? initialTab : "overview"
  );

  function go(next) {
    setTab(next);
    router.replace(`/dashboard?tab=${next}`, { scroll: false });
  }

  return (
    <div className="dash">
      <header className="glass-card dash-head">
        <span className="avatar-frame" aria-hidden="true">
          {profile.avatar ? <img src={profile.avatar} alt="" /> : profile.initials}
        </span>
        <div className="dash-head-text">
          <p className="kicker">Dashboard</p>
          <h1 className="display-lg">{profile.name || profile.username}</h1>
          <p className="muted text-sm">
            @{profile.username} · your applications, ideas and achievements.
          </p>
        </div>
        <Link href="/my-account" className="btn btn-secondary btn-sm">
          Account settings
        </Link>
      </header>

      <div className="tabbar tabbar-fill dash-tabs" role="tablist" aria-label="Dashboard sections">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            className="tab"
            data-active={tab === entry.id}
            onClick={() => go(entry.id)}
          >
            <span>{entry.label}</span>
            <span className="tab-count">
              {entry.id === "applications" ? stats.applications : 0}
            </span>
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <section className="grid gap-4">
          <div className="dash-stats">
            <Stat label="Applications" value={stats.applications} hint="Roles you applied to" />
            <Stat label="Ideas posted" value={stats.ideasPosted} hint="Suggestions you sent in" />
            <Stat label="Ideas backed" value={stats.ideasBacked} hint="Ideas you voted for" />
          </div>

          <div className="glass-card dash-card">
            <div className="dash-card-head">
              <h2 className="font-display font-bold">Achievements</h2>
              <span className="badge badge-neutral">
                {achievements.earned} of {achievements.total}
              </span>
            </div>
            <ul className="ach-grid">
              {achievements.items.map((entry) => (
                <li key={entry.id} className="ach" data-earned={entry.earned}>
                  <span className="ach-label">{entry.label}</span>
                  <span className="ach-detail">{entry.detail}</span>
                  <span className="ach-bar" aria-hidden="true">
                    <span
                      className="ach-bar-fill"
                      style={{ width: `${Math.round((entry.have / entry.need) * 100)}%` }}
                    />
                  </span>
                  <span className="faint text-xs">
                    {entry.earned ? "Earned" : `${entry.have} of ${entry.need}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-card dash-card">
            <div className="dash-card-head">
              <h2 className="font-display font-bold">Your ideas</h2>
              <Link href="/ideas" className="btn btn-secondary btn-sm">
                Idea board
              </Link>
            </div>
            {myIdeas.length === 0 ? (
              <EmptyState
                title="No ideas yet"
                description="Post what you want to see next and other members can back it."
                action={
                  <Link href="/ideas" className="btn btn-primary btn-sm">
                    Post an idea
                  </Link>
                }
              />
            ) : (
              <ul className="dash-apps">
                {myIdeas.map((idea) => {
                  const meta = ideaStatusMeta(idea.status);
                  return (
                    <li key={idea.id} className="dash-app">
                      <div className="dash-app-head">
                        <Link href="/ideas" className="font-semibold hover:underline">
                          {idea.title}
                        </Link>
                        <span className={`badge ${meta.badge}`}>{meta.label}</span>
                      </div>
                      <p className="faint text-xs">
                        {idea.backers} {idea.backers === 1 ? "backer" : "backers"}
                        {idea.createdAt ? ` · posted ${formatDay(idea.createdAt)}` : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="glass-card dash-card">
            <div className="dash-card-head">
              <h2 className="font-display font-bold">Take part</h2>
              <span className="badge badge-neutral">
                {profileVisible ? "Profile live" : "Profile private"}
              </span>
            </div>
            <p className="muted text-sm leading-relaxed">
              Polls, the calendar and the idea board live in the community section. Your public
              profile is switched on or off from account settings.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/community" className="btn btn-primary btn-sm">
                Open community
              </Link>
              <Link href="/polls" className="btn btn-secondary btn-sm">
                Polls
              </Link>
              <Link href="/events" className="btn btn-secondary btn-sm">
                Events
              </Link>
              <Link href="/positions" className="btn btn-secondary btn-sm">
                Open positions
              </Link>
            </div>
          </div>
        </section>
      )}

      {tab === "applications" && (
        <section className="glass-card dash-card">
          <div className="dash-card-head">
            <h2 className="font-display font-bold">Your applications</h2>
            <Link href="/positions" className="btn btn-secondary btn-sm">
              Open positions
            </Link>
          </div>
          {applications.length === 0 ? (
            <EmptyState
              title="No applications yet"
              description="Apply to a role and its status, timeline and reviewer notes appear here."
              action={
                <Link href="/positions" className="btn btn-primary btn-sm">
                  See open roles
                </Link>
              }
            />
          ) : (
            <ul className="dash-apps">
              {applications.map((entry) => (
                <li key={entry.id} className="dash-app">
                  <div className="dash-app-head">
                    <Link href={entry.href} className="font-semibold hover:underline">
                      {entry.title}
                    </Link>
                    <span className={`badge ${entry.badge}`}>{entry.status}</span>
                  </div>
                  <p className="muted text-sm">{entry.note}</p>
                  <p className="faint text-xs">
                    Applied {formatDay(entry.at) || "recently"}
                    {entry.reviewedAt ? ` · last reviewed ${formatDay(entry.reviewedAt)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
