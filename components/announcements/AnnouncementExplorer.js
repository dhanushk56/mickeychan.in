"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AnnouncementCard from "@/components/announcements/AnnouncementCard";
import EmptyState from "@/components/ui/EmptyState";
import { CATEGORIES, filterAnnouncements, splitAnnouncements } from "@/lib/announcements";

const EMPTY_FILTERS = { query: "", category: "all", from: "", to: "" };

function hasFilters(filters) {
  return Boolean(
    filters.query.trim() || filters.category !== "all" || filters.from || filters.to
  );
}

export default function AnnouncementExplorer({ announcements = [], now = Date.now() }) {
  const [tab, setTab] = useState("current");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const urlReady = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab");
    setFilters({
      query: params.get("q") || "",
      category: params.get("category") || "all",
      from: params.get("from") || "",
      to: params.get("to") || "",
    });
    if (requestedTab === "current" || requestedTab === "past" || requestedTab === "all") {
      setTab(requestedTab);
    }
    urlReady.current = true;
  }, []);

  // Rewriting the query string keeps a filtered view linkable without turning
  // it into a navigation, the same way the video filters behave.
  useEffect(() => {
    if (!urlReady.current) return;
    const params = new URLSearchParams();
    if (filters.query.trim()) params.set("q", filters.query.trim());
    if (filters.category !== "all") params.set("category", filters.category);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (tab !== "current") params.set("tab", tab);
    const search = params.toString();
    const next = `${window.location.pathname}${search ? `?${search}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, "", next);
    }
  }, [filters, tab]);

  const { current, past } = useMemo(() => splitAnnouncements(announcements, now), [announcements, now]);
  const matchedCurrent = useMemo(() => filterAnnouncements(current, filters), [current, filters]);
  const matchedPast = useMemo(() => filterAnnouncements(past, filters), [past, filters]);
  const filtered = hasFilters(filters);

  const tabs = [
    { id: "current", label: "Current", count: matchedCurrent.length },
    { id: "past", label: "Past", count: matchedPast.length },
    { id: "all", label: "Everything", count: matchedCurrent.length + matchedPast.length },
  ];

  const shown =
    tab === "current" ? matchedCurrent : tab === "past" ? matchedPast : [...matchedCurrent, ...matchedPast];

  const update = (key, value) => setFilters((current_) => ({ ...current_, [key]: value }));

  return (
    <div className="grid gap-6">
      <section className="grid gap-3" aria-label="Find an announcement">
        <div className="flex flex-wrap items-end gap-2">
          <label className="field flex-1" style={{ minWidth: "16rem" }}>
            <span className="field-label">Search</span>
            <input
              className="input"
              type="search"
              value={filters.query}
              onChange={(event) => update("query", event.target.value)}
              placeholder="Title or message"
              aria-label="Search announcements"
            />
          </label>

          <label className="field" style={{ minWidth: "10rem" }}>
            <span className="field-label">Category</span>
            <select
              className="select"
              value={filters.category}
              onChange={(event) => update("category", event.target.value)}
              aria-label="Filter by category"
            >
              <option value="all">Everything</option>
              {CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field" style={{ minWidth: "9rem" }}>
            <span className="field-label">Posted from</span>
            <input
              className="input"
              type="date"
              value={filters.from}
              onChange={(event) => update("from", event.target.value)}
              aria-label="Posted from"
            />
          </label>

          <label className="field" style={{ minWidth: "9rem" }}>
            <span className="field-label">Posted to</span>
            <input
              className="input"
              type="date"
              value={filters.to}
              onChange={(event) => update("to", event.target.value)}
              aria-label="Posted to"
            />
          </label>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setFilters(EMPTY_FILTERS)}
            disabled={!filtered}
          >
            Clear filters
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="tabbar" role="tablist" aria-label="Show announcements">
            {tabs.map((item) => (
              <button
                key={item.id}
                role="tab"
                type="button"
                aria-selected={tab === item.id}
                className="tab"
                data-active={tab === item.id}
                onClick={() => setTab(item.id)}
              >
                {item.label}
                <span className="tab-count">{item.count}</span>
              </button>
            ))}
          </div>
          <p className="faint text-xs">
            {shown.length} {shown.length === 1 ? "notice" : "notices"}
            {filtered ? " matching" : ""}
          </p>
        </div>
      </section>

      {shown.length === 0 ? (
        <EmptyState
          title={filtered ? "Nothing matches those filters" : tab === "past" ? "Nothing archived yet" : "Nothing current right now"}
          description={
            filtered
              ? "Try a different word, category or date range."
              : tab === "past"
                ? "Once an announcement's window ends it moves down here and stays readable."
                : "When the team posts something, it shows up here first, and stays for as long as it was set to run."
          }
        />
      ) : (
        <div className="grid gap-3">
          {shown.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              past={!current.includes(announcement)}
              now={now}
            />
          ))}
        </div>
      )}
    </div>
  );
}
