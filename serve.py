#!/usr/bin/env python3
"""提供控制页面及固定的音乐 API 转发；不连接或控制音箱。"""
import argparse
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


class Handler(SimpleHTTPRequestHandler):
    # 只转发页面使用的固定接口，不接受客户端提供的目标地址。
    METHODS = {
        "/music": {"GET", "POST"},
        "/api/music/search": {"GET"},
        "/api/hotlist": {"GET"},
        "/api/covers": {"POST"},
    }

    def __init__(self, *args, upstream, **kwargs):
        self.upstream = upstream.rstrip("/")
        super().__init__(*args, **kwargs)

    def error_json(self, status, message):
        body = json.dumps({"success": False, "error": message}, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def proxy(self):
        path = urlsplit(self.path)
        if self.command not in self.METHODS[path.path]:
            self.error_json(405, "该接口不支持此请求方式")
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.error_json(400, "无效的请求长度")
            return
        if not 0 <= size <= 1024 * 1024:
            self.error_json(413, "请求内容过大")
            return
        target = self.upstream + path.path + ("?" + path.query if path.query else "")
        request = Request(target, method=self.command,
                          data=self.rfile.read(size) if self.command == "POST" else None,
                          headers={"Content-Type": self.headers.get("Content-Type", "application/json")})
        try:
            try:
                response = urlopen(request, timeout=20)
            except HTTPError as error:
                response = error
            with response:
                body = response.read()
                self.send_response(response.status)
                self.send_header("Content-Type", response.headers.get("Content-Type", "application/json"))
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(body)
        except (URLError, TimeoutError, OSError):
            self.error_json(502, "音乐服务暂不可用，请稍后重试")

    def do_GET(self):
        if urlsplit(self.path).path in self.METHODS:
            self.proxy()
        else:
            super().do_GET()

    def do_POST(self):
        if urlsplit(self.path).path in self.METHODS:
            self.proxy()
        else:
            self.error_json(404, "接口不存在")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--upstream", default="https://r1.wxfsq.com")
    args = parser.parse_args()
    origin = urlsplit(args.upstream)
    if origin.scheme not in ("http", "https") or not origin.netloc or origin.path not in ("", "/") or origin.query or origin.fragment:
        parser.error("--upstream 必须是 HTTP(S) 源地址，不带路径或参数")
    handler = partial(Handler, directory=str(Path(__file__).resolve().parent), upstream=args.upstream)
    with ThreadingHTTPServer((args.bind, args.port), handler) as server:
        print(f"控制页面：http://{args.bind}:{args.port}/", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
