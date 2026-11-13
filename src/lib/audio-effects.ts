import { type Message } from "./protocol.ts";

export const audioEffects = [
  {
    id: "bass",
    label: "低音增强",
    valueLabel: "低音增强强度",
    flag: "sound_effects_bass_enable",
    field: "Current_Strength",
    command: "set_bass_strength",
    parameter: "strength",
    min: 0,
    max: 1000,
    step: 10,
    divisor: 10,
    unit: "%",
  },
  {
    id: "loudness",
    label: "响度",
    valueLabel: "响度增益",
    flag: "sound_effects_loudness_enable",
    field: "Current_Gain",
    command: "set_loudness_gain",
    parameter: "gain",
    min: -3000,
    max: 3000,
    step: 100,
    divisor: 100,
    unit: "dB",
  },
] as const;
export type AudioEffectId = (typeof audioEffects)[number]["id"];

export function audioEffectMessage(id: AudioEffectId, enabled: boolean | null, value = 0): Message {
  const effect = audioEffects.find((item) => item.id === id);
  if (!effect) throw new Error("未知音效。");
  if (enabled !== null) return { type: `set_${id}_enable`, enable: enabled };
  if (!Number.isInteger(value) || value < effect.min || value > effect.max)
    throw new Error("音效数值超出设备范围。");
  return { type: effect.command, [effect.parameter]: value };
}

export function mixerMessage(version: number | null, channel: "L" | "R", value: number): Message {
  if (version === null || version < 1876)
    throw new Error("分路音量需要 EchoService 1.8.76 及以上。");
  if (!["L", "R"].includes(channel) || !Number.isInteger(value) || value < 211 || value > 251)
    throw new Error("分路音量超出设备范围。");
  return { type: "setMixerValue", controlName: `DAC Digital Volume ${channel}`, value };
}

export const dspQuery =
  'echo route0feture: $(getprop persist.route0feture) && echo pram: $(tinymix -D 2 "DSP Firmware PRAM")';
export function parseDspState(
  output: unknown,
): { enabled: boolean; active: boolean | null } | null {
  const text = String(output ?? "");
  const enabled = text.match(/^route0feture:\s*([01])\s*$/m);
  if (!enabled) return null;
  const pram = text.match(/^pram:[ \t]*(.*)$/m)?.[1]?.trim();
  return { enabled: enabled[1] === "1", active: pram ? pram.includes(">data3") : null };
}
