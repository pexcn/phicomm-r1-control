export type Data = Record<string, unknown>;
export type Message = Data & { type: string };

export function object(value: unknown): Data {
  if (typeof value === "string") {
    try {
      return object(JSON.parse(value));
    } catch {
      return {};
    }
  }
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Data)
    : {};
}

export function array(value: unknown): unknown[] {
  if (typeof value === "string") {
    try {
      return array(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value : [];
}

export function numeric(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function flag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

export function endpoint(input: string): URL {
  const text = input.trim();
  const invalid = new Error("请输入有效的 IP、主机名或完整的 ws://、wss:// 地址。");
  if (!text || /[\s#\\]/.test(text)) throw invalid;
  const explicit = /^wss?:\/\//i.test(text);
  if (!explicit && /^[a-z][a-z\d+.-]*:\/\//i.test(text)) throw invalid;
  if (!explicit && /[/?]/.test(text)) throw invalid;
  let url: URL;
  try {
    url = new URL(explicit ? text : "ws://" + text);
    if (!explicit && !/:\d+$/.test(text)) url.port = "8080";
  } catch {
    throw invalid;
  }
  if (!url.hostname || url.username || url.password || !["ws:", "wss:"].includes(url.protocol))
    throw invalid;
  if (!/^(?:\[[a-f\d:]+\]|[a-z\d_-]+(?:\.[a-z\d_-]+)*)$/i.test(url.hostname)) throw invalid;
  if (/^[\d.]+$/.test(url.hostname) && !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(url.hostname))
    throw invalid;
  return url;
}

export function action(what: number, arg1 = 0, arg2 = -1, obj: unknown = ""): Message {
  return { type: "send_message", what, arg1, arg2, obj };
}

// Queue indices are zero-based; obj is a JSON string, not an object.
export function queueEdit(
  version: number | null,
  command: "move" | "remove",
  from: number,
  to?: number,
): Message {
  if (version === null || version < 1887)
    throw new Error("队列编辑需要当前连接确认 EchoService ≥ 1.8.87。");
  if (
    !Number.isInteger(from) ||
    from < 0 ||
    (command === "move" && (!Number.isInteger(to) || to! < 0))
  )
    throw new Error("无效的队列位置。");
  return action(
    4,
    command === "move" ? 28 : 29,
    -1,
    JSON.stringify(command === "move" ? { from, to } : { index: from }),
  );
}

export function messages(raw: unknown, depth = 0): Message[] {
  const data = object(raw);
  if (typeof data.type !== "string" || depth > 5) return [];
  if (data.type === "sends") return array(data.data).flatMap((item) => messages(item, depth + 1));
  return [data as Message];
}

export function safeImage(value: unknown): string {
  if (typeof value !== "string") return "";
  if (/^data:image\/(?:jpeg|png|webp);base64,/i.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return url.href;
    if (url.protocol === "http:") {
      url.protocol = "https:";
      return url.href;
    }
  } catch {
    /* Missing artwork uses the local placeholder. */
  }
  return "";
}

export function parseLyrics(value: unknown): { time: number; text: string }[] {
  if (typeof value !== "string") return [];
  return value
    .split(/\r?\n/)
    .flatMap((line) => {
      const text = line.replace(/\[[^\]]*\]/g, "").trim();
      if (!text) return [];
      return [...line.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)].map((match) => ({
        time: Math.round((Number(match[1]) * 60 + Number(match[2])) * 1000),
        text,
      }));
    })
    .sort((a, b) => a.time - b.time);
}

export function formatTime(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function formatVersion(value: number | null): string {
  if (value === null) return "—";
  const digits = String(value);
  return digits.length === 4 ? `${digits[0]}.${digits[1]}.${Number(digits.slice(2))}` : digits;
}
