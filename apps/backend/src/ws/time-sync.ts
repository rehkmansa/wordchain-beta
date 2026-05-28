import { newId } from "../lib/ids";
import type { Ws } from "./connections";

const MAX_RTT_CAP_MS = 150;
const SAMPLE_WINDOW = 10;
const RESYNC_INTERVAL_MS = 30_000;

const pending = new WeakMap<Ws, Map<string, number>>();

function sendTimeSync(ws: Ws): void {
  const pingId = newId();
  const map = pending.get(ws) ?? new Map<string, number>();
  map.set(pingId, performance.now());
  pending.set(ws, map);
  ws.send(
    JSON.stringify({
      type: "time_sync",
      serverTime: Date.now(),
      pingId,
    }),
  );
}

export function startTimeSyncLoop(ws: Ws): void {
  sendTimeSync(ws);
  ws.data.syncInterval = setInterval(() => {
    if (ws.readyState !== 1) {
      stopTimeSyncLoop(ws);
      return;
    }
    sendTimeSync(ws);
  }, RESYNC_INTERVAL_MS);
}

export function stopTimeSyncLoop(ws: Ws): void {
  if (ws.data.syncInterval) {
    clearInterval(ws.data.syncInterval);
    ws.data.syncInterval = null;
  }
}

export function handleTimeSyncAck(
  ws: Ws,
  msg: { pingId: string; clientReceivedAt: number; clientSendingAt: number },
): void {
  const map = pending.get(ws);
  const sentAt = map?.get(msg.pingId);
  if (sentAt === undefined) return;
  map?.delete(msg.pingId);
  const receivedAt = performance.now();

  const rtt = Math.max(0, receivedAt - sentAt - (msg.clientSendingAt - msg.clientReceivedAt));
  const samples = ws.data.rtt.samples;
  samples.push(rtt);
  if (samples.length > SAMPLE_WINDOW) samples.shift();
  ws.data.rtt.minRtt = Math.min(MAX_RTT_CAP_MS, Math.min(...samples));
}

// RTT/2 correction, capped. Used by scoring.
export function rttHalfCorrection(ws: Ws): number {
  return Math.min(MAX_RTT_CAP_MS, ws.data.rtt.minRtt) / 2;
}
