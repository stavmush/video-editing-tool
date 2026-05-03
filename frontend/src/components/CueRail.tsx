import { useRef, useState } from "react";
import type { RefObject } from "react";
import type { Session } from "../api/types";
import type { Segment } from "../api/types";
import type { SubtitleEditorHandle } from "./SubtitleEditor";
import type { SubtitleView } from "./TweaksPanel";
import SubtitleEditor from "./SubtitleEditor";
import CueList from "./CueList";
import CueTimeline from "./CueTimeline";
import Icon from "./ui/Icon";

const LANG_OPTIONS = [
  { code: "auto", label: "Auto-detect" },
  { code: "en",   label: "English" },
  { code: "he",   label: "Hebrew" },
  { code: "fr",   label: "French" },
  { code: "de",   label: "German" },
  { code: "es",   label: "Spanish" },
  { code: "ar",   label: "Arabic" },
  { code: "ru",   label: "Russian" },
];

const AI_SUGGESTIONS = [
  "Consider splitting this long cue at the natural pause.",
  'Possible spelling: "their" instead of "there".',
  "This cue overlaps the next by 80 ms — adjust timing?",
];

interface CueRailProps {
  session: Session;
  segments: Segment[];
  subtitleVersion: number;
  onSave: () => void;
  srcLang: string;
  setSrcLang: (v: string) => void;
  tgtLang: string;
  setTgtLang: (v: string) => void;
  onTranslate: () => void;
  srtRef: RefObject<HTMLInputElement | null>;
  busy: boolean;
  currentTimeSeconds: number;
  onSeek: (s: number) => void;
  subtitleView: SubtitleView;
  showAI: boolean;
}

export default function CueRail({
  session: s,
  segments,
  subtitleVersion,
  onSave,
  srcLang,
  setSrcLang,
  tgtLang,
  setTgtLang,
  onTranslate,
  srtRef,
  busy,
  currentTimeSeconds,
  onSeek,
  subtitleView,
  showAI,
}: CueRailProps) {
  const editorRef = useRef<SubtitleEditorHandle>(null);
  const [showFR, setShowFR] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [replaceMsg, setReplaceMsg] = useState<string | null>(null);
  const [aiIdx, setAiIdx] = useState(0);
  const [aiDismissed, setAiDismissed] = useState(false);

  function handleReplaceAll() {
    const count = editorRef.current?.replaceAll(findText, replaceText) ?? 0;
    setReplaceMsg(count > 0 ? `Replaced in ${count} row${count > 1 ? "s" : ""}` : "No matches");
    setTimeout(() => setReplaceMsg(null), 2500);
  }

  async function handleSave() {
    await editorRef.current?.save();
    onSave();
  }

  const useGrid = subtitleView === "grid" || subtitleView === "twopane";

  return (
    <aside
      style={{
        borderLeft: "1px solid var(--line-soft)",
        background: "var(--bg-1)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Rail header */}
      <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid var(--line-soft)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="t-eyebrow">Cues</span>
          {segments.length > 0 && (
            <span className="pill" style={{ fontSize: 9, padding: "2px 6px" }}>
              {segments.length}
            </span>
          )}
          <div style={{ flex: 1 }} />
          {useGrid && (
            <>
              <button
                className="btn sm ghost icon"
                title="Find & replace"
                onClick={() => setShowFR((v) => !v)}
                style={{ background: showFR ? "var(--bg-2)" : undefined }}
              >
                <Icon name="search" size={13} />
              </button>
              <button
                className="btn sm ghost icon"
                title="Insert cue"
                onClick={() => editorRef.current?.insertRowAfter()}
              >
                <Icon name="plus" size={13} />
              </button>
              <button
                className="btn sm ghost icon"
                title="Delete selected"
                onClick={() => editorRef.current?.deleteSelected()}
              >
                <Icon name="trash" size={13} />
              </button>
              <button className="btn sm primary" onClick={handleSave} disabled={busy}>
                <Icon name="save" size={12} /> Save
              </button>
            </>
          )}
        </div>

        {/* Find & replace bar — height transition */}
        {useGrid && (
          <div
            style={{
              maxHeight: showFR ? 80 : 0,
              overflow: "hidden",
              transition: "max-height 0.18s ease",
            }}
          >
            <div style={{ display: "flex", gap: 6, alignItems: "center", paddingTop: 8, paddingBottom: 2 }}>
              <input
                className="input"
                style={{ height: 28, fontSize: 12, flex: 1 }}
                placeholder="Find…"
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                dir="auto"
              />
              <input
                className="input"
                style={{ height: 28, fontSize: 12, flex: 1 }}
                placeholder="Replace…"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                dir="auto"
              />
              <button
                className="btn sm"
                onClick={handleReplaceAll}
                disabled={!findText}
              >
                All
              </button>
              {replaceMsg && (
                <span style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap" }}>
                  {replaceMsg}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Translate bar */}
      {s.capabilities.has_subtitles && (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            padding: "8px 14px",
            borderBottom: "1px solid var(--line-soft)",
            flexShrink: 0,
          }}
        >
          <select
            className="select"
            value={srcLang}
            onChange={(e) => setSrcLang(e.target.value)}
            style={{ height: 28, fontSize: 12, flex: 1 }}
          >
            {LANG_OPTIONS.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          <span style={{ color: "var(--text-4)" }}>→</span>
          <select
            className="select"
            value={tgtLang}
            onChange={(e) => setTgtLang(e.target.value)}
            style={{ height: 28, fontSize: 12, flex: 1 }}
          >
            {LANG_OPTIONS.filter((l) => l.code !== "auto").map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          <button className="btn sm" onClick={onTranslate} disabled={busy}>
            <Icon name="translate" size={12} />
          </button>
        </div>
      )}

      {/* SRT upload prompt */}
      {s.capabilities.has_video && !s.capabilities.has_subtitles && (
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)", flexShrink: 0 }}>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-2)" }}>
            No subtitles yet — transcribe from the header, or upload an SRT.
          </p>
          <button
            className="btn sm"
            onClick={() => srtRef.current?.click()}
            disabled={busy}
          >
            <Icon name="upload" size={12} /> Upload SRT
          </button>
        </div>
      )}

      {/* View body */}
      {s.capabilities.has_subtitles && (
        <>
          {subtitleView === "timeline" ? (
            <CueTimeline
              segments={segments}
              currentTimeSeconds={currentTimeSeconds}
              onSeek={onSeek}
            />
          ) : subtitleView === "list" ? (
            <CueList
              segments={segments}
              currentTimeSeconds={currentTimeSeconds}
              onSeek={onSeek}
            />
          ) : (
            /* grid or twopane — use SubtitleEditor (editable) */
            <SubtitleEditor
              ref={editorRef}
              sessionId={s.id}
              version={subtitleVersion}
              onSave={onSave}
              onSeek={onSeek}
              currentTimeSeconds={currentTimeSeconds}
            />
          )}
        </>
      )}

      {/* AI suggestions footer */}
      {showAI && s.capabilities.has_subtitles && !aiDismissed && (
        <div
          style={{
            borderTop: "1px solid var(--accent-line)",
            background: "var(--accent-soft)",
            padding: "10px 14px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Icon name="sparkles" size={13} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--accent-hi)" }}>
              AI suggestion
            </span>
            <span className="pill accent" style={{ fontSize: 9, padding: "2px 6px" }}>BETA</span>
          </div>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--text-2)", lineHeight: 1.4 }}>
            {AI_SUGGESTIONS[aiIdx % AI_SUGGESTIONS.length]}
          </p>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="btn sm primary"
              style={{ fontSize: 11 }}
              onClick={() => setAiIdx((i) => i + 1)}
            >
              Next
            </button>
            <button
              className="btn sm ghost"
              style={{ fontSize: 11 }}
              onClick={() => setAiDismissed(true)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Replace SRT button at bottom */}
      {s.capabilities.has_subtitles && (
        <div
          style={{
            borderTop: "1px solid var(--line-soft)",
            padding: "8px 14px",
            flexShrink: 0,
          }}
        >
          <button
            className="btn sm ghost"
            onClick={() => srtRef.current?.click()}
            disabled={busy}
          >
            <Icon name="upload" size={12} /> Replace SRT
          </button>
        </div>
      )}
    </aside>
  );
}
