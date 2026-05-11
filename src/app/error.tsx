"use client";
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html>
      <body style={{ background: "#111", color: "#fff", padding: 24, fontFamily: "monospace", margin: 0 }}>
        <h2 style={{ color: "#f87171" }}>App Error</h2>
        <p style={{ color: "#fbbf24", wordBreak: "break-all" }}>{error.message}</p>
        <pre style={{ color: "#9ca3af", fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{error.stack}</pre>
      </body>
    </html>
  );
}
