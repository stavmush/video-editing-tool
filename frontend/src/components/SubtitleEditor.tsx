import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridApi, CellEditingStoppedEvent } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { getSubtitles, saveSubtitles } from "../api/client";
import type { Segment } from "../api/types";

interface Props {
  sessionId: string;
}

const RTL_REGEX = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F]/;

function isRtlText(rows: Segment[]): boolean {
  const sample = rows.slice(0, 5).map((r) => r.text).join(" ");
  const rtlCount = (sample.match(RTL_REGEX) ?? []).length;
  return rtlCount > sample.length * 0.3;
}

export default function SubtitleEditor({ sessionId }: Props) {
  const [rows, setRows] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rtl, setRtl] = useState(false);
  const gridRef = useRef<GridApi | null>(null);

  useEffect(() => {
    setLoading(true);
    getSubtitles(sessionId)
      .then((data) => {
        setRows(data);
        setRtl(isRtlText(data));
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  const columnDefs = useMemo<ColDef<Segment>[]>(
    () => [
      { field: "id", headerName: "#", width: 60, editable: false },
      { field: "start", headerName: "Start", width: 130 },
      { field: "end", headerName: "End", width: 130 },
      {
        field: "text",
        headerName: "Text",
        flex: 1,
        cellStyle: rtl ? { direction: "rtl", textAlign: "right" } : {},
      },
    ],
    [rtl],
  );

  const onCellEditingStopped = useCallback(
    (e: CellEditingStoppedEvent<Segment>) => {
      if (!e.valueChanged) return;
      setRows((prev) =>
        prev.map((r) => (r.id === e.data?.id ? { ...r, [e.column.getColId()]: e.newValue } : r)),
      );
    },
    [],
  );

  async function save() {
    setSaving(true);
    try {
      await saveSubtitles(sessionId, rows);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function insertRowAfter() {
    const selected = gridRef.current?.getSelectedRows() as Segment[] | undefined;
    const afterId = selected?.[0]?.id ?? rows[rows.length - 1]?.id ?? 0;
    const idx = rows.findIndex((r) => r.id === afterId);
    const prev = rows[idx];
    const next = rows[idx + 1];
    const newRow: Segment = {
      id: Math.max(...rows.map((r) => r.id)) + 1,
      start: prev?.end ?? "00:00:00,000",
      end: next?.start ?? bumpTime(prev?.end ?? "00:00:00,000", 2),
      text: "",
    };
    const updated = [...rows.slice(0, idx + 1), newRow, ...rows.slice(idx + 1)];
    setRows(updated);
  }

  function deleteSelected() {
    const selected = gridRef.current?.getSelectedRows() as Segment[] | undefined;
    if (!selected?.length) return;
    const ids = new Set(selected.map((r) => r.id));
    setRows((prev) => prev.filter((r) => !ids.has(r.id)));
  }

  if (loading) return <p style={{ color: "#aaa", marginTop: 8 }}>Loading subtitles…</p>;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={insertRowAfter}>+ Insert row</button>
        <button onClick={deleteSelected} style={{ color: "#e55", borderColor: "#e55" }}>
          Delete selected
        </button>
        <button onClick={save} disabled={saving} className="primary">
          {saving ? "Saving…" : saved ? "Saved!" : "Save"}
        </button>
      </div>
      <div
        className="ag-theme-alpine-dark"
        style={{ height: 400, width: "100%" }}
      >
        <AgGridReact<Segment>
          rowData={rows}
          columnDefs={columnDefs}
          onGridReady={(p) => { gridRef.current = p.api; }}
          onCellEditingStopped={onCellEditingStopped}
          rowSelection="multiple"
          defaultColDef={{ editable: true, resizable: true }}
          stopEditingWhenCellsLoseFocus
          enableCellEditingOnBackspace
        />
      </div>
    </div>
  );
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
