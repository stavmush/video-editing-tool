export function timestampToSeconds(ts: string | number): number {
  if (typeof ts === "number") return ts;
  const [hms, ms = "0"] = ts.split(",");
  const [h, m, s] = hms.split(":").map(Number);
  return h * 3600 + m * 60 + s + parseInt(ms, 10) / 1000;
}

export function secondsToTimecode(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  const ms = Math.round((secs % 1) * 1000);
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const pad3 = (n: number) => String(n).padStart(3, "0");
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}.${pad3(ms)}`;
}
