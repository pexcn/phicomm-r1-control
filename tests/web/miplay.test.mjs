import assert from "node:assert/strict";
import { test } from "node:test";
import { miPlayDiag, miPlayIp, miPlayValue, miPlayWrite } from "../../src/lib/miplay.ts";

test("MiPlay rejects invalid targets and out-of-range tuning before sending", () => {
  assert.equal(miPlayIp(" 192.0.2.11 "), "192.0.2.11");
  for (const ip of [
    "example.org",
    "192.0.2.999",
    "http://192.0.2.1",
    "127.00.0.1",
    "192.0.2.1/path",
  ])
    assert.throws(() => miPlayIp(ip));
  for (const value of [399, 1501, 500.5, NaN])
    assert.throws(() => miPlayWrite("queue_target_ms", value));
  assert.throws(() => miPlayWrite("sync_delay_ms", -501));
  assert.throws(() => miPlayWrite("channel", 3));
  for (const value of [null, "", true, 1800, -1, "oops"])
    assert.equal(miPlayValue({ queue_target_ms: value }, "queue_target_ms"), null);
  assert.deepEqual(miPlayWrite("channel", 1, "192.0.2.11"), {
    type: "Set_MiPlay_Remote_Channel",
    ip: "192.0.2.11",
    mode: 1,
    channel: 1,
  });
});

test("remote diagnostic parsing rejects proxy failures and unwraps JSON responses", () => {
  assert.deepEqual(
    miPlayDiag(
      { type: "Get_MiPlay_Remote_Diag", data: { diag: '{"code":200,"data":{"channel":2}}' } },
      true,
    ),
    { channel: 2 },
  );
  for (const data of [
    { proxy_error: "unreachable" },
    { diag: '{"code":500,"msg":"failed"}' },
    { diag: "" },
  ])
    assert.throws(() => miPlayDiag({ type: "Get_MiPlay_Remote_Diag", data }, true));
});
