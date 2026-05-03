import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridApi, CellEditingStoppedEvent } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { getSubtitles, saveSubtitles } from "../api/client";
import type { Segment } from "../api/types";
import { timestampToSeconds } from "../utils/time";

/** RTL-aware textarea editor — dir="auto" so Hebrew types right-to-left */
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
        background: "var(--bg-2)",
        color: "var(--text-1)",
        fontSize: 13,
        padding: "6px 8px",
        resize: "vertical",
        boxSizing: "border-box",
        fontFamily: "var(--sans)",
        lineHeight: 1.5,
      }}
    />
  );
});

export interface SubtitleEditorHandle {
  replaceAll: (find: string, replace: string) => number;
  insertRowAfter: () => void;
  deleteSelected: () => void;
  save: () => Promise<void>;
}

interface Props {
  sessionId: string;
  version?: number;
  onSave?: () => void;
  onSeek?: (seconds: number) => void;
  currentTimeSeconds?: number;
}

export default forwardRef<SubtitleEditorHandle, Props>(function SubtitleEditor(
  { sessionId, version, onSave, onSeek, currentTimeSeconds },
  ref,
) {
  const [rows, setRows] = useState<Segment[]>([]);
  const rowsRef = useRef<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const gridRef = useRef<GridApi | null>(null);

  useEffect(() => {
    setLoading(true);
    getSubtitles(sessionId)
      .then((data) => { setRows(data); rowsRef.current = data; })
      .finally(() => setLoading(false));
  }, [sessionId, version]);

  const columnDefs = useMemo<ColDef<Segment>[]>(
    () => [
      { field: "id",    headerName: "#",     width: 52,  editable: false },
      { field: "start", headerName: "Start", width: 122 },
      { field: "end",   headerName: "End",   width: 122 },
      {
        field: "text",
        headerName: "Text",
        flex: 1,
        wrapText: true,
        autoHeight: true,
        cellEditor: RtlTextareaEditor,
        cellRenderer: (params: { value: string }) => (
          <span
            dir="auto"
            style={{
              width: "100%",
              display: "block",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              lineHeight: 1.5,
              padding: "4px 0",
            }}
          >
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

  // Highlight the active row based on video currentTime
  useEffect(() => {
    if (currentTimeSeconds === undefined || !gridRef.current) return;
    const active = rowsRef.current.find((r) => {
      const s = timestampToSeconds(r.start);
      const e = timestampToSeconds(r.end);
      return currentTimeSeconds >= s && currentTimeSeconds < e;
    });
    if (active) {
      gridRef.current.ensureNodeVisible(
        gridRef.current.getRowNode(String(active.id)),
        "middle",
      );
    }
  }, [currentTimeSeconds]);

  useImperativeHandle(ref, () => ({
    replaceAll(find: string, replace: string): number {
      if (!find) return 0;
      let count = 0;
      const updated = rowsRef.current.map((r) => {
        if (!r.text.includes(find)) return r;
        count++;
        return { ...r, text: r.text.split(find).join(replace) };
      });
      rowsRef.current = updated;
      setRows(updated);
      return count;
    },
    insertRowAfter() {
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
      const resequenced = resequence([
        ...current.slice(0, idx + 1),
        newRow,
        ...current.slice(idx + 1),
      ]);
      rowsRef.current = resequenced;
      setRows(resequenced);
    },
    deleteSelected() {
      const selected = gridRef.current?.getSelectedRows() as Segment[] | undefined;
      if (!selected?.length) return;
      const ids = new Set(selected.map((r) => r.id));
      const resequenced = resequence(rowsRef.current.filter((r) => !ids.has(r.id)));
      rowsRef.current = resequenced;
      setRows(resequenced);
    },
    async save() {
      setSaving(true);
      try {
        await saveSubtitles(sessionId, rowsRef.current);
        onSave?.();
      } finally {
        setSaving(false);
      }
    },
  }));

  if (loading) {
    return (
      <div style={{ padding: 16, color: "var(--text-3)", fontSize: 13 }}>
        Loading subtitles…
      </div>
    );
  }

  return (
    <div
      className="ag-theme-alpine-dark ag-editor"
      style={{ flex: 1, minHeight: 0 }}
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
      {saving && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            right: 12,
            fontSize: 11,
            color: "var(--text-3)",
          }}
        >
          Saving…
        </div>
      )}
    </div>
  );
});

function resequence(rows: Segment[]): Segment[] {
  return rows.map((r, i) => ({ ...r, id: i + 1 }));
}

function bumpTime(ts: string, seconds: number): string {
  const [hms, ms = "000"] = ts.split(",");
  const [h, m, s] = hms.split(":").map(Number);
  const total = (h * 3600 + m * 60 + (s || 0) + seconds) * 1000 + parseInt(ms, 10);
  const hh = Math.floor(total / 3600000);
  const mm = Math.floor((total % 3600000) / 60000);
  const ss = Math.floor((total % 60000) / 1000);
  const mmm = total % 1000;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")},${String(mmm).padStart(3, "0")}`;
}
