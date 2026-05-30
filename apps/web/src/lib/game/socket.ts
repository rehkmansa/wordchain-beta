import type { ClientMessage, ServerMessage } from "@repo/shared";

type SocketCallbacks = {
  onMessage: (msg: ServerMessage) => void;
  onConnected: (connected: boolean) => void;
  onClockOffset: (offsetMs: number) => void;
};

// Close codes the server uses for terminal conditions — never retry these.
const FATAL_CODES = new Set([1000, 4001, 4002]);
const MAX_BACKOFF_MS = 5000;

export class GameSocket {
  private ws: WebSocket | null = null;
  private disposed = false;
  private attempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly url: string,
    private readonly cb: SocketCallbacks,
  ) {
    this.connect();
  }

  private connect(): void {
    if (this.disposed) return;
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.onopen = () => {
      this.attempt = 0;
      this.cb.onConnected(true);
    };

    ws.onmessage = (ev) => {
      if (typeof ev.data !== "string") return;
      let msg: ServerMessage;
      try {
        msg = JSON.parse(ev.data) as ServerMessage;
      } catch {
        return;
      }
      if (msg.type === "time_sync") {
        const clientReceivedAt = Date.now();
        // Half-RTT is negligible for a multi-second countdown; offset = server − client.
        this.cb.onClockOffset(msg.serverTime - clientReceivedAt);
        this.send({
          type: "time_sync_ack",
          pingId: msg.pingId,
          clientReceivedAt,
          clientSendingAt: Date.now(),
        });
        return;
      }
      this.cb.onMessage(msg);
    };

    ws.onclose = (ev) => {
      if (this.disposed) return;
      this.cb.onConnected(false);
      if (!FATAL_CODES.has(ev.code)) this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.disposed) return;
    const delay = Math.min(MAX_BACKOFF_MS, 500 * 2 ** this.attempt);
    this.attempt += 1;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  dispose(): void {
    this.disposed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    try {
      this.ws?.close(1000, "client dispose");
    } catch {
      // already closing
    }
  }
}
