import { endpoint, object } from "./protocol.ts";

export type DeviceProfile = { id: string; name: string; address: string; reportedName: string };
export type DeviceDraft = { id?: string; name: string; address: string };

export function readDeviceProfiles(value: unknown, legacyAddress: unknown): DeviceProfile[] {
  const rows = Array.isArray(value) ? value : [{ id: "legacy", address: legacyAddress }];
  const devices: DeviceProfile[] = [];
  for (const [index, row] of rows.entries()) {
    const data = object(row);
    try {
      if (typeof data.address !== "string") continue;
      const address = endpoint(data.address).href;
      if (devices.some((device) => device.address === address)) continue;
      let id =
        typeof data.id === "string" && /^[\w-]{1,80}$/.test(data.id) ? data.id : `saved-${index}`;
      let suffix = 0;
      while (devices.some((device) => device.id === id)) id = `saved-${index}-${suffix++}`;
      devices.push({
        id,
        address,
        name: typeof data.name === "string" ? data.name.trim().slice(0, 40) : "",
        reportedName: typeof data.reportedName === "string" ? data.reportedName.slice(0, 80) : "",
      });
    } catch {
      /* Ignore malformed history without preventing the app from opening. */
    }
  }
  return devices;
}

export function editDeviceProfile(
  devices: DeviceProfile[],
  draft: DeviceDraft,
  newId: string,
): DeviceProfile {
  const address = endpoint(draft.address).href;
  const name = draft.name.trim();
  if (name.length > 40) throw new Error("设备名称不能超过 40 个字符。");
  const previous = draft.id ? devices.find((device) => device.id === draft.id) : undefined;
  if (draft.id && !previous) throw new Error("该设备已被移除，请重新打开设备列表。");
  if (devices.some((device) => device.address === address && device.id !== previous?.id))
    throw new Error("该地址已保存在设备列表中，请直接选择或编辑已有设备。");
  return {
    id: previous?.id || newId,
    name,
    address,
    reportedName: previous?.address === address ? previous.reportedName : "",
  };
}

export function profileName(device: DeviceProfile): string {
  return device.name || device.reportedName || endpoint(device.address).host;
}

export function profileAddress(device: DeviceProfile): string {
  const url = endpoint(device.address);
  // Proxy query parameters may contain access tokens; retain them only in the editor.
  return url.host + (url.pathname === "/" ? "" : url.pathname);
}
