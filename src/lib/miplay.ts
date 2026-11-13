import { object, type Data, type Message } from "./protocol.ts";

export type MiPlaySetting = "channel" | "queue_target_ms" | "sync_delay_ms";
export function miPlayValue(data: Data | null, key: MiPlaySetting): number | null {
  const raw = data?.[key];
  if (typeof raw !== "number" && !(typeof raw === "string" && /^[+-]?\d+$/.test(raw))) return null;
  const value = Number(raw);
  const [min, max] =
    key === "channel" ? [0, 2] : key === "queue_target_ms" ? [400, 1500] : [-500, 500];
  return Number.isInteger(value) && value >= min && value <= max ? value : null;
}
export function miPlayIp(input: string): string {
  const ip = input.trim();
  if (
    !/^(0|[1-9]\d{0,2})(\.(0|[1-9]\d{0,2})){3}$/.test(ip) ||
    ip.split(".").some((part) => Number(part) > 255)
  )
    throw new Error("请输入目标音箱的有效 IPv4 地址。");
  return ip;
}
export function miPlayWrite(key: MiPlaySetting, value: number, ip = ""): Message {
  const [min, max] =
    key === "channel" ? [0, 2] : key === "queue_target_ms" ? [400, 1500] : [-500, 500];
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`请输入 ${min} 到 ${max} 的整数${key === "channel" ? "声道值" : "毫秒值"}。`);
  const suffix = { channel: "Channel", queue_target_ms: "Tuning", sync_delay_ms: "Sync_Delay" }[
    key
  ];
  return {
    type: `Set_MiPlay_${ip ? "Remote_" : ""}${suffix}`,
    ...(ip ? { ip: miPlayIp(ip) } : {}),
    ...(key === "channel" ? { mode: value, ...(ip ? { channel: value } : {}) } : { [key]: value }),
  };
}
export function miPlayDiag(reply: Message, remote: boolean): Data {
  let data = object(reply.data);
  if (remote) {
    if (data.proxy_error) throw new Error(String(data.proxy_error));
    const response = object(data.diag);
    if (response.code !== undefined && Number(response.code) !== 200)
      throw new Error(String(response.msg || "远端诊断查询失败。"));
    data = response.data === undefined ? response : object(response.data);
  }
  if (
    !["channel", "queue_target_ms", "sync_delay_ms", "running", "miplay_state"].some(
      (key) => data[key] !== undefined,
    )
  )
    throw new Error("设备未提供有效的 MiPlay 诊断，可能不支持此接口或远端不可达。");
  return data;
}
