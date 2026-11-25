export const dynamic = "force-dynamic";

export const metadata = {
  title: "Closed for maintenance",
  robots: { index: false, follow: false },
};

// The root layout draws the closed page for this URL, so the route only has to
// exist for the proxy rewrite to land on.
export default function MaintenanceRoute() {
  return null;
}
