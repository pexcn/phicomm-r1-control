"""音乐 API 转发回归，使用本地上游夹具，不访问原作者服务。"""
import functools
import json
from pathlib import Path
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from serve import Handler


class Upstream(BaseHTTPRequestHandler):
    def respond(self):
        body = json.dumps({"path": self.path, "method": self.command,
                           "body": self.rfile.read(int(self.headers.get("Content-Length", "0"))).decode()}).encode()
        self.send_response(503 if "unavailable" in self.path else 200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    do_GET = respond
    do_POST = respond


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.upstream = ThreadingHTTPServer(("127.0.0.1", 0), Upstream)
        handler = functools.partial(Handler, upstream=f"http://127.0.0.1:{cls.upstream.server_port}")
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.threads = []
        for server in [cls.upstream, cls.server]:
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            cls.threads.append(thread)
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        for server in [cls.server, cls.upstream]:
            server.shutdown()
            server.server_close()
        for thread in cls.threads:
            thread.join()

    def test_get_preserves_query(self):
        path = "/api/hotlist?source=qq&board=hot"
        with urlopen(self.base + path) as response:
            self.assertEqual(json.load(response)["path"], path)

    def test_post_preserves_body(self):
        body = b'{"items":[]}'
        with urlopen(Request(self.base + "/api/covers", data=body, headers={"Content-Type": "application/json"})) as response:
            data = json.load(response)
        self.assertEqual((data["method"], data["body"]), ("POST", body.decode()))

    def test_unknown_api_is_not_forwarded(self):
        with self.assertRaises(HTTPError) as caught:
            urlopen(Request(self.base + "/api/unknown", data=b"{}"))
        self.assertEqual(caught.exception.code, 404)

    def test_upstream_failure_is_preserved(self):
        with self.assertRaises(HTTPError) as caught:
            urlopen(self.base + "/api/hotlist?unavailable=1")
        self.assertEqual(caught.exception.code, 503)


if __name__ == "__main__":
    unittest.main()
