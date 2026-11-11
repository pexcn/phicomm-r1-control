import assert from "node:assert/strict";
import { test } from "node:test";
import {
  endpoint,
  formatVersion,
  messages,
  parseLyrics,
  queueEdit,
} from "../../src/lib/protocol.ts";
import { SpeakerClient } from "../../src/lib/client.ts";

test("device endpoints preserve explicit ports, paths and query parameters", () => {
  assert.equal(endpoint("192.168.1.40").href, "ws://192.168.1.40:8080/");
  assert.equal(endpoint("Phicomm_R1_12CF").port, "8080");
  assert.equal(endpoint("192.168.1.40:80").href, "ws://192.168.1.40/");
  assert.equal(
    endpoint("wss://speaker.example/room/ws?key=a%2Fb").href,
    "wss://speaker.example/room/ws?key=a%2Fb",
  );
  assert.equal(endpoint("[::1]:9090").port, "9090");
  for (const value of [
    "",
    "https://example.com",
    "ws://user:password@example.com",
    "999.1.2.3",
    "x y",
    "example.com/#x",
    "javascript:alert(1)",
  ]) {
    assert.throws(() => endpoint(value));
  }
});

test("queue edits require confirmed versions and encode zero-based indices", () => {
  for (const version of [null, 1873, 1886]) assert.throws(() => queueEdit(version, "remove", 0));
  assert.deepEqual(queueEdit(1887, "move", 2, 0), {
    type: "send_message",
    what: 4,
    arg1: 28,
    arg2: -1,
    obj: '{"from":2,"to":0}',
  });
  assert.equal(queueEdit(1887, "remove", 1).obj, '{"index":1}');
  assert.throws(() => queueEdit(1887, "remove", -1));
  assert.equal(formatVersion(1873), "1.8.73");
});

test("batch and malformed messages remain bounded; timestamped lyrics are ordered", () => {
  assert.deepEqual(messages("not json"), []);
  assert.deepEqual(
    messages({ type: "sends", code: 200, data: [{ type: "get_info", data: "{}" }] }),
    [{ type: "get_info", data: "{}" }],
  );
  const cyclic = { type: "sends", data: [] };
  cyclic.data.push(cyclic);
  assert.deepEqual(messages(cyclic), []);
  assert.deepEqual(parseLyrics("[00:02.50][00:01.00]第二行\n[00:00.10]第一行\n[ar:歌手]"), [
    { time: 100, text: "第一行" },
    { time: 1000, text: "第二行" },
    { time: 2500, text: "第二行" },
  ]);
});

function sockets(t) {
  const instances = [];
  class Socket {
    static OPEN = 1;
    readyState = 0;
    sent = [];
    constructor(url) {
      this.url = url;
      instances.push(this);
    }
    open() {
      this.readyState = 1;
      this.onopen?.();
    }
    send(value) {
      this.sent.push(JSON.parse(value));
    }
    close() {
      this.readyState = 3;
      this.onclose?.();
    }
    reply(message) {
      this.onmessage?.({ data: JSON.stringify(message) });
    }
  }
  const previous = globalThis.WebSocket;
  globalThis.WebSocket = Socket;
  t.after(() => {
    globalThis.WebSocket = previous;
  });
  return instances;
}

test("replaced sockets cannot deliver info, binary frames or disconnect a new session", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  const instances = sockets(t),
    events = [];
  const client = new SpeakerClient((event) => events.push(event));
  client.connect("192.0.2.1");
  const first = instances[0];
  first.open();
  client.connect("wss://speaker.example/room/ws?token=abc");
  const second = instances[1];
  second.open();
  const oldOpen = first.onopen;
  first.reply({ type: "get_info", data: { ver: 9999 } });
  first.onmessage({ data: new Blob(["stale"]) });
  oldOpen();
  assert.equal(
    events.filter((event) => event.kind === "message" || event.kind === "frame").length,
    0,
  );
  second.reply({ type: "get_info", data: { ver: 1873 } });
  assert.equal(events.at(-1).message.data.ver, 1873);
  assert.equal(second.url, "wss://speaker.example/room/ws?token=abc");
  client.disconnect();
  const sent = second.sent.length;
  t.mock.timers.tick(60000);
  assert.equal(second.sent.length, sent);
  assert.equal(instances.length, 2);
});

test("connection timeouts retry a bounded number and manual disconnect cancels retry", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  const instances = sockets(t),
    events = [];
  const client = new SpeakerClient((event) => events.push(event));
  client.connect("192.0.2.1");
  t.mock.timers.tick(10000);
  t.mock.timers.tick(1000);
  assert.equal(instances.length, 2);
  client.disconnect();
  t.mock.timers.tick(60000);
  assert.equal(instances.length, 2);
  assert.equal(events.at(-1).status, "disconnected");
});
