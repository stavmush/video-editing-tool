import { useEffect, useState } from "react";
import type { Session } from "./api/types";
import { deleteSession, listSessions } from "./api/client";
import type { View } from "./components/Topbar";
import Topbar from "./components/Topbar";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import UploadFlow from "./components/UploadFlow";
import SessionPanel from "./components/SessionPanel";

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("dashboard");
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    listSessions()
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleUpdate(updated: Session) {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  function handleRemove(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    deleteSession(id).catch(() => {});
    if (activeId === id) {
      setActiveId(null);
      setView("dashboard");
    }
  }

  function openSession(id: string) {
    setActiveId(id);
    setView("editor");
  }

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        gridTemplateRows: "52px 1fr",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg-0)",
        color: "var(--text-1)",
      }}
    >
      <Topbar view={view} setView={setView} />
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        setActiveId={setActiveId}
        view={view}
        setView={setView}
      />
      <main style={{ overflow: "hidden", position: "relative", background: "var(--bg-0)" }}>
        {loading && (
          <div style={{ padding: 40, color: "var(--text-3)" }}>Restoring sessions…</div>
        )}

        {!loading && view === "dashboard" && (
          <Dashboard
            sessions={sessions}
            onOpen={openSession}
            onNew={() => setView("upload")}
            onRemove={handleRemove}
          />
        )}

        {view === "upload" && (
          <UploadFlow
            onCancel={() => setView("dashboard")}
            onDone={(session) => {
              setSessions((prev) => [...prev, session]);
              openSession(session.id);
            }}
          />
        )}

        {view === "editor" && activeSession && (
          <div style={{ height: "100%", overflow: "auto", padding: 24 }}>
            <SessionPanel
              session={activeSession}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
            />
          </div>
        )}

        {view === "editor" && !activeSession && !loading && (
          <div style={{ padding: 40, color: "var(--text-3)" }}>
            No session selected.{" "}
            <button className="btn" onClick={() => setView("dashboard")}>
              Back to Library
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
