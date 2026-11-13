import { numeric, object, type Data } from "./protocol.ts";

// Report measured metadata; bitrate alone cannot establish losslessness.
export function audioDetails(info: Data): [string, string][] {
  const music = object(object(info.music_info).Current_MusicData);
  const format = object(music.Format);
  const api = object(music.api_data);
  const rows: [string, string][] = [];
  if (typeof api.quality === "string" && api.quality) rows.push(["实际音质", api.quality]);
  if (typeof format.sampleMimeType === "string") rows.push(["格式", format.sampleMimeType]);
  const bitrate = numeric(api.br) || numeric(format.bitrate);
  if (bitrate > 0 && (numeric(api.br) > 0 || format.sampleMimeType !== "audio/raw"))
    rows.push(["码率", `${Math.round(bitrate / 1000)} kbps`]);
  const sampleRate = numeric(format.sampleRate);
  if (sampleRate > 0) rows.push(["采样率", `${sampleRate / 1000} kHz`]);
  const bits = ({ 3: 8, 2: 16, 268435456: 16, 536870912: 24, 805306368: 32, 4: 32 } as Data)[
    String(format.pcmEncoding)
  ];
  if (bits) rows.push(["解码位深", `${bits} bit`]);
  return rows;
}
