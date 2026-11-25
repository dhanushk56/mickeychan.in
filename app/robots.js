const BASE_URL = "https://mickeychan.in";

// Anything behind a session, an admin gate or a one-off token stays out of the
// index. Public pages are allowed by default.
const PRIVATE_PATHS = [
  "/admin",
  "/api/",
  "/audit",
  "/form-builder",
  "/my-account",
  "/login",
  "/register",
  "/verify",
  "/forgot-password",
];

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
