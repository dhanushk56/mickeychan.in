import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PetalField from "@/components/PetalField";

export const metadata = {
  title: "Mickey Chan",
  description:
    "Welcome to the official channel of Mickey Chan — gamer, streamer, and storyteller. Watch the latest videos, explore open positions, and join the community.",
};

// Runs before React hydrates so the correct theme is on <html> for the
// very first paint — without this, the page would flash light-mode
// (or dark-mode) for a frame before switching to the saved preference.
const noFlashScript = `
(function () {
  try {
    var stored = localStorage.getItem('mc-theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className="bg-grid-pattern">
        <PetalField />
        <Navbar />
        <main className="relative z-10 pt-20">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
