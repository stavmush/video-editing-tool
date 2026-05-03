import { useEffect, useState } from "react";
import type { Session } from "./api/types";
import { deleteSession, listSessions, renameSession } from "./api/client";
import type { View } from "./components/Topbar";
import Topbar from "./components/Topbar";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import UploadFlow from "./components/UploadFlow";
import Editor from "./components/Editor";
import TweaksPanel from "./components/TweaksPanel";
import type { SubtitleView } from "./components/TweaksPanel";

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("dashboard");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showWaveform, setShowWaveform] = useState(false);
  const [subtitleView, setSubtitleView] = useState<SubtitleView>("grid");
  const [showAI, setShowAI] = useState(false);

  useEffect(() => {
    listSessions()
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleUpdate(updated: Session) {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  function handleRename(id: string, name: string) {
    renameSession(id, name)
      .then((updated) => handleUpdate(updated))
      .catch(() => {});
  }

  function handleRemove(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    deleteSession(id).catch(() => {});
    if (activeId === id) {
      setActiveId(null);
      setView("dashboard");
    }
  }

  function handleBulkRemove(ids: string[]) {
    setSessions((prev) => prev.filter((s) => !ids.includes(s.id)));
    ids.forEach((id) => {
      deleteSession(id).catch(() => {});
      if (activeId === id) {
        setActiveId(null);
        setView("dashboard");
      }
    });
  }

  function openSession(id: string) {
    setActiveId(id);
    setView("editor");
  }

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  return (
    <div
      className={theme === "light" ? "theme-light" : undefined}
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
            onRename={handleRename}
            onBulkRemove={handleBulkRemove}
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
          <Editor
            session={activeSession}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
            showWaveform={showWaveform}
            subtitleView={subtitleView}
            showAI={showAI}
          />
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
      <TweaksPanel
        theme={theme}
        setTheme={setTheme}
        subtitleView={subtitleView}
        setSubtitleView={setSubtitleView}
        showWaveform={showWaveform}
        setShowWaveform={setShowWaveform}
        showAI={showAI}
        setShowAI={setShowAI}
      />
    </div>
  );
}
