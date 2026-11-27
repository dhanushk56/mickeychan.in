"use client";

// The last net. app/error.js catches a page that throws; this catches the root
// layout failing, where no site styles or navigation are available.
export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          background: "#0f0d16",
          color: "#f4f1ff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main style={{ maxWidth: "28rem", display: "grid", gap: ".8rem" }}>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Something broke.</h1>
          <p style={{ margin: 0, lineHeight: 1.6, color: "#c9c2e0" }}>
            The page did not load. Try again, and if it keeps happening, send a note through the
            contact form.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              justifySelf: "start",
              padding: ".6rem 1.1rem",
              borderRadius: "999px",
              border: "1px solid #7a5cff",
              background: "#7a5cff",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
