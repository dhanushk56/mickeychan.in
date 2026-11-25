// Achievements are derived from what a member has actually done — saves,
// playlists, watches and applications. Nothing here is stored, so a badge can
// never drift away from the underlying data.

export function buildAchievements({ library, applications = [], settings } = {}) {
  const saves = library?.watchLater?.length || 0;
  const playlists = library?.playlists?.length || 0;
  const history = library?.history?.length || 0;
  const apps = applications?.length || 0;
  const published = settings?.profileVisible === true;

  const items = [
    {
      id: "first-save",
      label: "First save",
      detail: "Save a video for later",
      earned: saves >= 1,
      have: Math.min(saves, 1),
      need: 1,
    },
    {
      id: "collector",
      label: "Collector",
      detail: "Keep 10 videos in watch later",
      earned: saves >= 10,
      have: Math.min(saves, 10),
      need: 10,
    },
    {
      id: "curator",
      label: "Curator",
      detail: "Build 3 playlists",
      earned: playlists >= 3,
      have: Math.min(playlists, 3),
      need: 3,
    },
    {
      id: "regular",
      label: "Regular viewer",
      detail: "Watch 25 videos",
      earned: history >= 25,
      have: Math.min(history, 25),
      need: 25,
    },
    {
      id: "applicant",
      label: "Applied",
      detail: "Send a collab or job application",
      earned: apps >= 1,
      have: Math.min(apps, 1),
      need: 1,
    },
    {
      id: "on-the-map",
      label: "On the map",
      detail: "Publish your community profile",
      earned: published,
      have: published ? 1 : 0,
      need: 1,
    },
  ];

  return {
    items,
    earned: items.filter((entry) => entry.earned).length,
    total: items.length,
  };
}
