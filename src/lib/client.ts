import { endpoint, messages, type Message } from "./protocol.ts";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting";
type ClientEvent =
  | { kind: "status"; status: ConnectionStatus; error?: string }
  | { kind: "message"; message: Message }
  | { kind: "frame"; frame: Blob };

export class SpeakerClient {
  private socket: WebSocket | null = null;
  private generation = 0;
  private retries = 0;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private poll: ReturnType<typeof setInterval> | undefined;
  private listener: (event: ClientEvent) => void;
  private url = "";

  constructor(listener: (event: ClientEvent) => void) {
    this.listener = listener;
  }

  connect(address: string): void {
    const url = endpoint(address).href;
    this.disconnect();
    this.url = url;
    this.retries = 0;
    this.open(false);
  }

  private open(retry: boolean): void {
    const generation = ++this.generation;
    this.listener({ kind: "status", status: retry ? "reconnecting" : "connecting" });
    let socket: WebSocket;
    try {
      socket = new WebSocket(this.url);
    } catch {
      this.listener({
        kind: "status",
        status: "disconnected",
        error: "浏览器未能创建连接。HTTPS 页面可尝试 WSS 代理，或检查局域网访问权限。",
      });
      return;
    }
    this.socket = socket;
    const current = () => generation === this.generation && this.socket === socket;
    const timeout = setTimeout(() => {
      if (current() && socket.readyState !== WebSocket.OPEN) socket.close();
    }, 10000);
    this.timers.push(timeout);
    socket.onopen = () => {
      if (!current()) return;
      clearTimeout(timeout);
      this.listener({ kind: "status", status: "connected" });
      this.send({ type: "get_info", type_id: "web-info" });
      this.send({ type: "max_vol" });
      this.send({ type: "list" });
      this.poll = setInterval(() => this.send({ type: "get_info", type_id: "web-info" }), 1500);
    };
    socket.onmessage = (event) => {
      if (!current()) return;
      if (event.data instanceof Blob) this.listener({ kind: "frame", frame: event.data });
      else if (event.data instanceof ArrayBuffer)
        this.listener({ kind: "frame", frame: new Blob([event.data], { type: "image/jpeg" }) });
      else for (const message of messages(event.data)) this.listener({ kind: "message", message });
    };
    socket.onerror = () => {
      /* onclose handles the single failure transition. */
    };
    socket.onclose = () => {
      if (!current()) return;
      clearTimeout(timeout);
      clearInterval(this.poll);
      this.socket = null;
      if (this.retries < 3) {
        this.listener({ kind: "status", status: "reconnecting" });
        this.timers.push(setTimeout(() => this.open(true), 1000 * 2 ** this.retries++));
      } else
        this.listener({
          kind: "status",
          status: "disconnected",
          error: "无法连接音箱，请检查地址、网络及浏览器的局域网访问权限；HTTPS 可使用 WSS 代理。",
        });
    };
  }

  send(message: Message): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }

  disconnect(): void {
    ++this.generation;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    clearInterval(this.poll);
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
    this.listener({ kind: "status", status: "disconnected" });
  }
}
