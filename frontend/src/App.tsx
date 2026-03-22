import { useState } from "react";
import type { Session } from "./api/types";
import SessionPanel from "./components/SessionPanel";
import { createSession } from "./api/client";

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [creating, setCreating] = useState(false);

  async function handleNew() {
    setCreating(true);
    try {
      const session = await createSession();
      setSessions((prev) => [...prev, session]);
    } finally {
      setCreating(false);
    }
  }

  function handleUpdate(updated: Session) {
    setSessions((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s)),
    );
  }

  function handleRemove(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 28 }}>
        <h1>Video Editing Tool</h1>
        <button
          className="primary"
          onClick={handleNew}
          disabled={creating}
        >
          {creating ? "Creating…" : "+ New session"}
        </button>
      </div>

      {sessions.length === 0 && (
        <p style={{ color: "#666" }}>
          No sessions yet. Click <strong>+ New session</strong> to start.
        </p>
      )}

      {sessions.map((session) => (
        <SessionPanel
          key={session.id}
          session={session}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
        />
      ))}
    </div>
  );
}
