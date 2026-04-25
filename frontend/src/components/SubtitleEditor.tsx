import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridApi, CellEditingStoppedEvent } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { getSubtitles, saveSubtitles } from "../api/client";
import type { Segment } from "../api/types";

/** RTL-aware textarea editor — sets dir="auto" so Hebrew types right-to-left */
const RtlTextareaEditor = forwardRef(function RtlTextareaEditor(
  props: { value: string },
  ref: React.Ref<unknown>,
) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    getValue: () => taRef.current?.value ?? props.value,
    afterGuiAttached() {
      if (taRef.current) {
        taRef.current.focus();
        const len = taRef.current.value.length;
        taRef.current.setSelectionRange(len, len);
      }
    },
  }));

  return (
    <textarea
      ref={taRef}
      defaultValue={props.value ?? ""}
      dir="auto"
      style={{
        width: "100%",
        height: "100%",
        minHeight: 72,
        border: "none",
        outline: "none",
        background: "#2a2d3e",
        color: "#e0e0e0",
        fontSize: 13,
        padding: "6px 8px",
        resize: "vertical",
        boxSizing: "border-box",
        fontFamily: "inherit",
        lineHeight: 1.5,
      }}
    />
  );
});

interface Props {
  sessionId: string;
  version?: number;
  onSave?: () => void;
  onSeek?: (seconds: number) => void;
}


export default function SubtitleEditor({ sessionId, version, onSave, onSeek }: Props) {
  const [rows, setRows] = useState<Segment[]>([]);
  const rowsRef = useRef<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const gridRef = useRef<GridApi | null>(null);

  useEffect(() => {
    setLoading(true);
    getSubtitles(sessionId)
      .then((data) => { setRows(data); rowsRef.current = data; })
      .finally(() => setLoading(false));
  }, [sessionId, version]);

  const columnDefs = useMemo<ColDef<Segment>[]>(
    () => [
      { field: "id", headerName: "#", width: 60, editable: false },
      { field: "start", headerName: "Start", width: 130 },
      { field: "end", headerName: "End", width: 130 },
      {
        field: "text",
        headerName: "Text",
        flex: 1,
        wrapText: true,
        autoHeight: true,
        cellEditor: RtlTextareaEditor,
        cellRenderer: (params: { value: string }) => (
          <span dir="auto" style={{ width: "100%", display: "block", whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.5, padding: "4px 0" }}>
            {params.value ?? ""}
          </span>
        ),
      },
    ],
    [],
  );

  const onCellEditingStopped = useCallback(
    (e: CellEditingStoppedEvent<Segment>) => {
      if (!e.valueChanged || !e.data) return;
      const updated = { ...e.data, [e.column.getColId()]: e.newValue };
      rowsRef.current = rowsRef.current.map((r) => (r.id === updated.id ? updated : r));
      gridRef.current?.applyTransaction({ update: [updated] });
    },
    [],
  );

  async function save() {
    setSaving(true);
    try {
      await saveSubtitles(sessionId, rowsRef.current);
      setSaved(true);
      onSave?.();
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function resequence(rows: Segment[]): Segment[] {
    return rows.map((r, i) => ({ ...r, id: i + 1 }));
  }

  function insertRowAfter() {
    const selected = gridRef.current?.getSelectedRows() as Segment[] | undefined;
    const current = rowsRef.current;
    const afterId = selected?.[0]?.id ?? current[current.length - 1]?.id ?? 0;
    const idx = current.findIndex((r) => r.id === afterId);
    const prev = current[idx];
    const next = current[idx + 1];
    const newRow: Segment = {
      id: 0,
      start: prev?.end ?? "00:00:00,000",
      end: next?.start ?? bumpTime(prev?.end ?? "00:00:00,000", 2),
      text: "",
    };
    const resequenced = resequence([...current.slice(0, idx + 1), newRow, ...current.slice(idx + 1)]);
    rowsRef.current = resequenced;
    setRows(resequenced);
  }

  function insertSpeakerRow() {
    const selected = gridRef.current?.getSelectedRows() as Segment[] | undefined;
    const current = rowsRef.current;
    if (!selected?.length) return;
    const afterId = selected[0].id;
    const idx = current.findIndex((r) => r.id === afterId);
    const prev = current[idx];
    const newRow: Segment = {
      id: 0,
      start: prev.start,
      end: prev.end,
      text: "",
    };
    const resequenced = resequence([...current.slice(0, idx + 1), newRow, ...current.slice(idx + 1)]);
    rowsRef.current = resequenced;
    setRows(resequenced);
  }

  function deleteSelected() {
    const selected = gridRef.current?.getSelectedRows() as Segment[] | undefined;
    if (!selected?.length) return;
    const ids = new Set(selected.map((r) => r.id));
    const resequenced = resequence(rowsRef.current.filter((r) => !ids.has(r.id)));
    rowsRef.current = resequenced;
    setRows(resequenced);
  }

  const [showReplace, setShowReplace] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [replaceCount, setReplaceCount] = useState<number | null>(null);

  function replaceAll() {
    if (!findText) return;
    let count = 0;
    const updated = rowsRef.current.map((r) => {
      if (!r.text.includes(findText)) return r;
      count++;
      return { ...r, text: r.text.split(findText).join(replaceText) };
    });
    rowsRef.current = updated;
    setRows(updated);
    setReplaceCount(count);
    setTimeout(() => setReplaceCount(null), 2500);
  }

  if (loading) return <p style={{ color: "#aaa", marginTop: 8 }}>Loading subtitles…</p>;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <button onClick={insertRowAfter}>+ Insert row</button>
        <button onClick={insertSpeakerRow} title="Insert a new row with the same timestamps (for multiple speakers)">+ Add speaker</button>
        <button onClick={deleteSelected} style={{ color: "#e55", borderColor: "#e55" }}>
          Delete selected
        </button>
        <button onClick={() => { setShowReplace((v) => !v); setReplaceCount(null); }}>
          {showReplace ? "Hide replace" : "Find & replace"}
        </button>
        <button onClick={save} disabled={saving} className="primary">
          {saving ? "Saving…" : saved ? "Saved!" : "Save"}
        </button>
      </div>
      {showReplace && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
          <input
            placeholder="Find…"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            dir="auto"
            style={{ padding: "4px 8px", background: "#1e2130", border: "1px solid #444", borderRadius: 4, color: "#e0e0e0", fontSize: 13, minWidth: 160 }}
          />
          <input
            placeholder="Replace with…"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            dir="auto"
            style={{ padding: "4px 8px", background: "#1e2130", border: "1px solid #444", borderRadius: 4, color: "#e0e0e0", fontSize: 13, minWidth: 160 }}
          />
          <button onClick={replaceAll} disabled={!findText}>Replace all</button>
          {replaceCount !== null && (
            <span style={{ color: replaceCount > 0 ? "#5c5" : "#aaa", fontSize: 13 }}>
              {replaceCount > 0 ? `Replaced in ${replaceCount} row${replaceCount > 1 ? "s" : ""}` : "No matches"}
            </span>
          )}
        </div>
      )}

      <div
        className="ag-theme-alpine-dark"
        style={{ height: 400, width: "100%" }}
      >
        <AgGridReact<Segment>
          rowData={rows}
          columnDefs={columnDefs}
          getRowId={(p) => String(p.data.id)}
          onGridReady={(p) => { gridRef.current = p.api; }}
          onCellEditingStopped={onCellEditingStopped}
          onRowClicked={(e) => { if (e.data && onSeek) onSeek(timestampToSeconds(e.data.start)); }}
          rowSelection="multiple"
          defaultColDef={{ editable: true, resizable: true }}
          stopEditingWhenCellsLoseFocus
          enableCellEditingOnBackspace
        />
      </div>
    </div>
  );
}

function timestampToSeconds(ts: string | number): number {
  if (typeof ts === "number") return ts;
  const [hms, ms = "0"] = ts.split(",");
  const [h, m, s] = hms.split(":").map(Number);
  return h * 3600 + m * 60 + s + parseInt(ms, 10) / 1000;
}

function bumpTime(ts: string, seconds: number): string {
  // Parse HH:MM:SS,mmm and add seconds
  const [hms, ms = "000"] = ts.split(",");
  const [h, m, s] = hms.split(":").map(Number);
  const total = (h * 3600 + m * 60 + (s || 0) + seconds) * 1000 + parseInt(ms, 10);
  const hh = Math.floor(total / 3600000);
  const mm = Math.floor((total % 3600000) / 60000);
  const ss = Math.floor((total % 60000) / 1000);
  const mmm = total % 1000;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")},${String(mmm).padStart(3, "0")}`;
}
