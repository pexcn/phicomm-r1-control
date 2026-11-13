import { action, numeric, type Message } from "./protocol.ts";

const audioExtension = /\.(mp3|flac|wav|ogg|opus|m4a|aac|wma|ape|amr|aif|aiff|alac|mp4)$/i;
export const localScanLimit = 2000;

export function localPath(value: string): string {
  const path = value.trim();
  if (
    !path.startsWith("/") ||
    /[\x00-\x1f\x7f]/.test(path) ||
    path.length > 2048 ||
    path.split("/").includes("..")
  )
    throw new Error("请输入音箱上的绝对路径，例如 /sdcard/Music，不能包含控制字符或 ..。");
  return path.replace(/\/+$/, "") || "/";
}

export function scanLocalMusic(path: string): Message {
  const quoted = "'" + localPath(path).replace(/'/g, "'\\''") + "'";
  return {
    type: "shell",
    shell: `if [ -d ${quoted} ] && [ -r ${quoted} ]; then printf '__R1_LOCAL_BEGIN__\\n'; find ${quoted} -type f 2>/dev/null | head -n ${localScanLimit + 1}; printf '__R1_LOCAL_END__\\n'; else printf '__R1_LOCAL_ERROR__\\n'; fi`,
  };
}

export function parseLocalMusic(output: unknown, directory: string) {
  const lines = String(output ?? "").split(/\r?\n/);
  const start = lines.indexOf("__R1_LOCAL_BEGIN__");
  const end = lines.indexOf("__R1_LOCAL_END__", start + 1);
  if (start < 0 || end < 0)
    throw new Error("无法读取目录，请检查路径、访问权限及设备的 find 命令。");
  const rows = lines.slice(start + 1, end);
  const root = localPath(directory);
  const prefix = root === "/" ? "/" : root + "/";
  const files = [
    ...new Set(
      rows.slice(0, localScanLimit).filter((path) => {
        try {
          return path.startsWith(prefix) && localPath(path) === path && audioExtension.test(path);
        } catch {
          return false;
        }
      }),
    ),
  ].sort((a, b) => a.localeCompare(b, "zh-CN"));
  return { files, truncated: rows.length > localScanLimit };
}

export function supportsLocalMusic(version: number | null, player: unknown): boolean {
  return version !== null && version >= 1856 && (version >= 1865 || numeric(player) === 1);
}

export function playLocalPath(value: string): Message {
  const path = localPath(value);
  if (!audioExtension.test(path)) return { type: "play_local_music", path, play: true };
  let hash = 2166136261;
  for (const char of path) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  const id = `local_0_web${hash.toString(16)}`;
  return action(
    4,
    15,
    -1,
    JSON.stringify({
      curItemId: id,
      index: 0,
      itemList: [
        {
          itemId: id,
          title: path.split("/").at(-1),
          artist: "",
          album: "",
          albumUrl: "",
          itemType: 0,
          url: path,
        },
      ],
    }),
  );
}
