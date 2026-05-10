# Session Rename — Design Spec

**Date:** 2026-05-10  
**Status:** Approved

## Overview

Add inline rename to the Editor header and Sidebar row, so users can change a session's display name without leaving their current view. The backend endpoint and API client function already exist; this is purely a frontend change.

## Behaviour

### Idle state
- Display: `s.name ?? s.video_filename ?? "Untitled"` (or "Untitled session" in Editor header)
- Colour: `var(--text-3)` (muted grey) to signal the field is editable
- Hover: faint pencil icon appears beside the name as a discoverability cue
- Clicking the name text begins editing

### Editing state
- The text is replaced by a borderless `<input>` pre-filled with the current `name` (or `video_filename` as placeholder when no custom name is set)
- **Enter / blur** → saves, calls `renameSession(id, value)`, reverts to display with updated name
- **Escape** → reverts without saving
- Empty submit clears the custom name (backend trims and sets to `null`), falling back to `video_filename`

## Components

### `RenameField` (new, `frontend/src/components/ui/RenameField.tsx`)
Encapsulates idle → editing → saved state machine.

Props:
```ts
interface RenameFieldProps {
  value: string | null;       // s.name
  fallback: string | null;    // s.video_filename
  onSave: (name: string) => void;
  style?: React.CSSProperties;
}
```

Renders a `<span>` in idle mode, swaps to `<input>` in editing mode. Handles Enter/Escape/blur internally.

### `Editor.tsx` changes
- Accept new `onRename: (id: string, name: string) => void` prop
- Replace the static name `<span>` at line 226 with `<RenameField>`
- Show `s.name ?? s.video_filename ?? "Untitled session"` in muted colour

### `Sidebar.tsx` / `SidebarRow` changes
- Accept new `onRename: (id: string, name: string) => void` prop, threaded from `Sidebar` → `SidebarRow`
- Replace the static name `<div>` in `SidebarRow` with `<RenameField>`
- Click on the name text begins editing only when `anySelected` is false (no conflict with bulk-select)
- Clicking the thumbnail / checkbox area continues to select as before

### `App.tsx` changes
- Pass `onRename={handleRename}` to `<Editor>` (already passed to `<Dashboard>`)
- Pass `onRename={handleRename}` to `<Sidebar>`

## Data flow

```
User clicks name
  → RenameField enters editing state
  → User types, confirms (Enter/blur)
  → onSave(newName) called
  → onRename(id, newName) in App.tsx
  → renameSession(id, name) [API PATCH /sessions/:id]
  → handleUpdate(updatedSession) refreshes sessions state
  → RenameField receives new value prop, displays updated name
```

## What is NOT changing
- Backend: already implemented (`PATCH /sessions/:id`, `RenameRequest` model)
- API client: `renameSession` already exists
- Dashboard: already has inline rename; unchanged
- Bulk-select flow in Sidebar: unchanged
