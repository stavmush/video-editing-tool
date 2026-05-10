# Session Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add click-to-rename to the Editor header and Sidebar row so users can change a session's display name without visiting the Dashboard.

**Architecture:** A shared `RenameField` UI component manages the idle → editing → saved state machine. It is wired into `Editor` and `Sidebar` via a new `onRename` prop threaded from `App`. The backend endpoint (`PATCH /sessions/:id`) and `renameSession` API client already exist; only frontend changes are needed.

**Tech Stack:** React 18, TypeScript, Vitest + @testing-library/react, inline CSS via style props, existing `var(--*)` design tokens.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `frontend/src/components/ui/RenameField.tsx` | Shared inline-rename component |
| Create | `frontend/src/components/ui/RenameField.test.tsx` | Unit tests for RenameField |
| Modify | `frontend/src/components/Editor.tsx` | Add `onRename` prop + use RenameField in header |
| Modify | `frontend/src/components/Sidebar.tsx` | Add `onRename` prop + use RenameField in SidebarRow |
| Modify | `frontend/src/App.tsx` | Pass `onRename={handleRename}` to Editor and Sidebar |

---

## Task 1: Create `RenameField` component with tests (TDD)

**Files:**
- Create: `frontend/src/components/ui/RenameField.tsx`
- Create: `frontend/src/components/ui/RenameField.test.tsx`

- [ ] **Step 1.1: Write the failing tests**

Create `frontend/src/components/ui/RenameField.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import RenameField from "./RenameField";

describe("RenameField", () => {
  it("displays the custom name when provided", () => {
    render(<RenameField value="My Movie" fallback="IMG_1979.MP4" onSave={vi.fn()} />);
    expect(screen.getByText("My Movie")).toBeTruthy();
  });

  it("falls back to video filename when name is null", () => {
    render(<RenameField value={null} fallback="IMG_1979.MP4" onSave={vi.fn()} />);
    expect(screen.getByText("IMG_1979.MP4")).toBeTruthy();
  });

  it("falls back to 'Untitled' when both are null", () => {
    render(<RenameField value={null} fallback={null} onSave={vi.fn()} />);
    expect(screen.getByText("Untitled")).toBeTruthy();
  });

  it("clicking the span shows an input pre-filled with the current name", () => {
    render(<RenameField value="My Movie" fallback="IMG_1979.MP4" onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("My Movie"));
    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement).value).toBe("My Movie");
  });

  it("clicking when value is null prefills input with empty string, placeholder is fallback", () => {
    render(<RenameField value={null} fallback="IMG_1979.MP4" onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("IMG_1979.MP4"));
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("");
    expect(input.placeholder).toBe("IMG_1979.MP4");
  });

  it("pressing Enter calls onSave with the trimmed value", () => {
    const onSave = vi.fn();
    render(<RenameField value="My Movie" fallback="IMG_1979.MP4" onSave={onSave} />);
    fireEvent.click(screen.getByText("My Movie"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "  New Name  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSave).toHaveBeenCalledWith("New Name");
  });

  it("pressing Escape reverts without calling onSave", () => {
    const onSave = vi.fn();
    render(<RenameField value="My Movie" fallback="IMG_1979.MP4" onSave={onSave} />);
    fireEvent.click(screen.getByText("My Movie"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Something else" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("My Movie")).toBeTruthy();
  });

  it("blurring the input calls onSave", () => {
    const onSave = vi.fn();
    render(<RenameField value="My Movie" fallback="IMG_1979.MP4" onSave={onSave} />);
    fireEvent.click(screen.getByText("My Movie"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Blurred Name" } });
    fireEvent.blur(input);
    expect(onSave).toHaveBeenCalledWith("Blurred Name");
  });
});
```

- [ ] **Step 1.2: Run tests to verify they fail**

```bash
cd /Users/stav/video-editing-tool/frontend && npm test -- RenameField
```

Expected: `FAIL` — "Cannot find module './RenameField'"

- [ ] **Step 1.3: Implement `RenameField`**

Create `frontend/src/components/ui/RenameField.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

interface RenameFieldProps {
  value: string | null;
  fallback: string | null;
  onSave: (name: string) => void;
  font?: string;
  style?: React.CSSProperties;
}

export default function RenameField({ value, fallback, onSave, font, style }: RenameFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function startEdit() {
    setDraft(value ?? "");
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    onSave(draft.trim());
  }

  const displayText = value ?? fallback ?? "Untitled";
  const baseFont = font ?? "500 12.5px/1.25 var(--sans)";

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        placeholder={fallback ?? "Untitled"}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setEditing(false); setDraft(""); }
          e.stopPropagation();
        }}
        onClick={(e) => e.stopPropagation()}
        style={{
          font: baseFont,
          background: "var(--bg-inset)",
          border: "1px solid var(--accent-line)",
          borderRadius: 4,
          padding: "1px 4px",
          color: "var(--text-1)",
          outline: "none",
          width: "100%",
          ...style,
        }}
      />
    );
  }

  return (
    <span
      title="Click to rename"
      onClick={(e) => { e.stopPropagation(); startEdit(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        font: baseFont,
        color: "var(--text-3)",
        cursor: "text",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        maxWidth: "100%",
        overflow: "hidden",
        ...style,
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {displayText}
      </span>
      {hovered && <Icon name="edit" size={11} style={{ flexShrink: 0, opacity: 0.5 }} />}
    </span>
  );
}
```

- [ ] **Step 1.4: Run tests to verify they pass**

```bash
cd /Users/stav/video-editing-tool/frontend && npm test -- RenameField
```

Expected: all 8 tests `PASS`

- [ ] **Step 1.5: Commit**

```bash
cd /Users/stav/video-editing-tool/frontend && git add src/components/ui/RenameField.tsx src/components/ui/RenameField.test.tsx && git commit -m "feat: add RenameField shared component"
```

---

## Task 2: Wire `RenameField` into `Editor.tsx`

**Files:**
- Modify: `frontend/src/components/Editor.tsx` (lines 40–47 and 223–230)

- [ ] **Step 2.1: Add `onRename` to `EditorProps` and fix the name display**

In `frontend/src/components/Editor.tsx`, make these two changes:

**Change 1** — Add import and prop (around line 1–47):

```tsx
// Add to imports at top of file
import RenameField from "./ui/RenameField";
```

```tsx
// Update EditorProps interface (lines 40-47)
interface EditorProps {
  session: Session;
  onUpdate: (s: Session) => void;
  onRemove: (id: string) => void;
  onRename?: (id: string, name: string) => void;
  showWaveform?: boolean;
  subtitleView?: SubtitleView;
  showAI?: boolean;
}
```

**Change 2** — Add `onRename` to the destructured props (line 65–72):

```tsx
export default function Editor({
  session,
  onUpdate,
  onRemove,
  onRename,
  showWaveform = false,
  subtitleView = "grid",
  showAI = false,
}: EditorProps) {
```

**Change 3** — Replace the static name span in the header strip (lines 223–230). Replace:

```tsx
<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
  <span style={{ font: "500 15px/1 var(--sans)", color: "var(--text-1)" }}>
    {s.video_filename ?? "Untitled session"}
  </span>
  <span className="t-mono" style={{ color: "var(--text-3)", fontSize: 11.5 }}>
    · {s.video_filename ?? "—"}
  </span>
</div>
```

with:

```tsx
<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
  <RenameField
    value={s.name}
    fallback={s.video_filename}
    onSave={(name) => onRename?.(s.id, name)}
    font="500 15px/1 var(--sans)"
  />
  <span className="t-mono" style={{ color: "var(--text-3)", fontSize: 11.5 }}>
    · {s.video_filename ?? "—"}
  </span>
</div>
```

- [ ] **Step 2.2: Verify TypeScript compiles**

```bash
cd /Users/stav/video-editing-tool/frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 2.3: Commit**

```bash
cd /Users/stav/video-editing-tool/frontend && git add src/components/Editor.tsx && git commit -m "feat: add inline rename to Editor header"
```

---

## Task 3: Wire `RenameField` into `Sidebar.tsx`

**Files:**
- Modify: `frontend/src/components/Sidebar.tsx`

- [ ] **Step 3.1: Add `onRename` to `SidebarProps` and thread it to `SidebarRow`**

In `frontend/src/components/Sidebar.tsx`, make these changes:

**Change 1** — Add import at the top:

```tsx
import RenameField from "./ui/RenameField";
```

**Change 2** — Add `onRename` to `SidebarProps` interface (around line 8–16):

```tsx
interface SidebarProps {
  sessions: Session[];
  activeId: string | null;
  setActiveId: (id: string) => void;
  view: View;
  setView: (v: View) => void;
  onBulkRemove: (ids: string[]) => void;
  onRename: (id: string, name: string) => void;
}
```

**Change 3** — Destructure `onRename` in the `Sidebar` function signature (line 18):

```tsx
export default function Sidebar({ sessions, activeId, setActiveId, view, setView, onBulkRemove, onRename }: SidebarProps) {
```

**Change 4** — Pass `onRename` to each `SidebarRow` in the list (around line 104–114):

```tsx
{sessions.map((s) => (
  <SidebarRow
    key={s.id}
    session={s}
    active={s.id === activeId && view === "editor"}
    selected={selectedIds.has(s.id)}
    anySelected={selectedIds.size > 0}
    onOpen={() => { setActiveId(s.id); setView("editor"); }}
    onSelect={(checked) => toggleSelect(s.id, checked)}
    onRename={(name) => onRename(s.id, name)}
  />
))}
```

**Change 5** — Add `onRename` to `SidebarRow`'s props type and use `RenameField` (around line 122–170):

```tsx
function SidebarRow({
  session: s,
  active,
  selected,
  anySelected,
  onOpen,
  onSelect,
  onRename,
}: {
  session: Session;
  active: boolean;
  selected: boolean;
  anySelected: boolean;
  onOpen: () => void;
  onSelect: (checked: boolean) => void;
  onRename: (name: string) => void;
}) {
```

Replace the static name `<div>` inside `SidebarRow` (the div that contains `{s.name ?? s.video_filename ?? "Untitled"}`):

```tsx
// Replace this:
<div
  style={{
    font: "500 12.5px/1.25 var(--sans)",
    color: "var(--text-1)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }}
>
  {s.name ?? s.video_filename ?? "Untitled"}
</div>
```

with:

```tsx
<RenameField
  value={s.name}
  fallback={s.video_filename}
  onSave={anySelected ? () => {} : onRename}
  style={{ maxWidth: "100%" }}
/>
```

- [ ] **Step 3.2: Verify TypeScript compiles**

```bash
cd /Users/stav/video-editing-tool/frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3.3: Commit**

```bash
cd /Users/stav/video-editing-tool/frontend && git add src/components/Sidebar.tsx && git commit -m "feat: add inline rename to Sidebar row"
```

---

## Task 4: Update `App.tsx` to pass `onRename`

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 4.1: Pass `onRename` to `<Editor>` and `<Sidebar>`**

In `frontend/src/App.tsx`, two changes:

**Change 1** — `<Sidebar>` already missing `onRename`; add it (around line 81–88):

```tsx
<Sidebar
  sessions={sessions}
  activeId={activeId}
  setActiveId={setActiveId}
  view={view}
  setView={setView}
  onBulkRemove={handleBulkRemove}
  onRename={handleRename}
/>
```

**Change 2** — `<Editor>` already missing `onRename`; add it (around line 115–124):

```tsx
{view === "editor" && activeSession && (
  <Editor
    session={activeSession}
    onUpdate={handleUpdate}
    onRemove={handleRemove}
    onRename={handleRename}
    showWaveform={showWaveform}
    subtitleView={subtitleView}
    showAI={showAI}
  />
)}
```

- [ ] **Step 4.2: Verify TypeScript compiles cleanly**

```bash
cd /Users/stav/video-editing-tool/frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4.3: Run all tests**

```bash
cd /Users/stav/video-editing-tool/frontend && npm test
```

Expected: all tests pass including the 8 new RenameField tests

- [ ] **Step 4.4: Commit**

```bash
cd /Users/stav/video-editing-tool/frontend && git add src/App.tsx && git commit -m "feat: wire onRename into Editor and Sidebar from App"
```

---

## Self-Review

**Spec coverage:**
- ✅ Muted grey display (`var(--text-3)`) — RenameField idle style
- ✅ Pencil/edit icon on hover — RenameField uses `Icon name="edit"`
- ✅ Click starts editing with pre-filled input — tested in Task 1
- ✅ Enter/blur saves, Escape reverts — tested in Task 1
- ✅ Editor header gets RenameField — Task 2
- ✅ Editor header now uses `s.name ?? s.video_filename` (bug fix) — Task 2
- ✅ Sidebar row gets RenameField — Task 3
- ✅ Rename disabled during bulk-select — Task 3 (`anySelected ? () => {} : onRename`)
- ✅ App wires `handleRename` to both surfaces — Task 4
- ✅ Backend/API unchanged — not in scope

**Placeholder scan:** None found.

**Type consistency:**
- `onRename: (id: string, name: string) => void` — consistent across App, Editor, Sidebar
- `onSave: (name: string) => void` — RenameField internal prop, consistent throughout
- `RenameField` props (`value`, `fallback`, `onSave`, `font`, `style`) — used identically in Tasks 2 and 3
