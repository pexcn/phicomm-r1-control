import assert from "node:assert/strict";
import { test } from "node:test";
import {
  editDeviceProfile,
  profileAddress,
  readDeviceProfiles,
} from "../../src/lib/device-profiles.ts";

test("legacy device migration validates history and does not resurrect explicitly removed devices", () => {
  assert.equal(readDeviceProfiles(null, "192.0.2.10")[0].address, "ws://192.0.2.10:8080/");
  assert.deepEqual(readDeviceProfiles([], "192.0.2.10"), []);
  assert.deepEqual(readDeviceProfiles(null, "javascript:bad"), []);
  const devices = readDeviceProfiles(
    [
      { id: "a", address: "192.0.2.10" },
      { id: "b", address: "ws://192.0.2.10:8080/" },
      { address: "bad address" },
    ],
    "",
  );
  assert.equal(devices.length, 1);
});

test("profile edits preserve endpoint identity and keep aliases separate from reported names", () => {
  const devices = readDeviceProfiles(
    [
      {
        id: "a",
        name: "客厅",
        reportedName: "Phicomm R1",
        address: "wss://speaker.example/room/ws?key=a%2Fb",
      },
    ],
    "",
  );
  const updated = editDeviceProfile(
    devices,
    { id: "a", name: " 客厅音箱 ", address: devices[0].address },
    "unused",
  );
  assert.equal(updated.id, "a");
  assert.equal(updated.reportedName, "Phicomm R1");
  assert.equal(updated.name, "客厅音箱");
  assert.equal(devices[0].name, "客厅");
  assert.equal(updated.address, "wss://speaker.example/room/ws?key=a%2Fb");
  assert.equal(profileAddress(updated), "speaker.example/room/ws");
  assert.equal(
    editDeviceProfile(devices, { id: "a", name: "客厅", address: "192.0.2.11" }, "unused")
      .reportedName,
    "",
  );
});

test("duplicate endpoints and stale profile editors fail without modifying the saved list", () => {
  const devices = readDeviceProfiles(
    [
      { id: "a", address: "192.0.2.10" },
      { id: "b", address: "192.0.2.11" },
    ],
    "",
  );
  assert.throws(
    () => editDeviceProfile(devices, { name: "重复", address: "ws://192.0.2.10:8080/" }, "new"),
    /已保存/,
  );
  assert.throws(
    () => editDeviceProfile(devices, { id: "b", name: "重复", address: "192.0.2.10" }, "new"),
    /已保存/,
  );
  assert.throws(
    () => editDeviceProfile(devices, { id: "removed", name: "", address: "192.0.2.12" }, "new"),
    /已被移除/,
  );
  assert.equal(devices.length, 2);
});
