// Achievements are derived from what a member has actually done: applications,
// ideas and the public profile switch. Nothing here is stored, so a badge can
// never drift away from the underlying data.

export function buildAchievements({ applications = [], ideas = [], profileVisible = false, username = "" } = {}) {
  const apps = applications.length;
  const posted = ideas.filter((idea) => idea.author === username);
  const backed = ideas.filter((idea) => Array.isArray(idea.votes) && idea.votes.includes(username));
  const shipped = posted.filter((idea) => idea.status === "shipped");

  const items = [
    {
      id: "applicant",
      label: "Applied",
      detail: "Send a collab or job application",
      earned: apps >= 1,
      have: Math.min(apps, 1),
      need: 1,
    },
    {
      id: "on-the-board",
      label: "On the board",
      detail: "Post an idea for what to make next",
      earned: posted.length >= 1,
      have: Math.min(posted.length, 1),
      need: 1,
    },
    {
      id: "backer",
      label: "Backer",
      detail: "Back three ideas you want to see",
      earned: backed.length >= 3,
      have: Math.min(backed.length, 3),
      need: 3,
    },
    {
      id: "shipped",
      label: "Shipped",
      detail: "Have an idea of yours make it to shipped",
      earned: shipped.length >= 1,
      have: Math.min(shipped.length, 1),
      need: 1,
    },
    {
      id: "on-the-map",
      label: "On the map",
      detail: "Publish your public profile",
      earned: profileVisible,
      have: profileVisible ? 1 : 0,
      need: 1,
    },
  ];

  return {
    items,
    earned: items.filter((entry) => entry.earned).length,
    total: items.length,
  };
}
